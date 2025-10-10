// ==UserScript==
// @name         Letterboxd Histogram for Streaming
// @namespace    https://github.com/quence-dev/letterboxd-ratings-for-streaming
// @version      0.0.1
// @description  Show Letterboxd ratings histogram on Netflix movie details
// @author       quence-dev
// @match        https://www.netflix.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      letterboxd.com
// @run-at       document-end
// @require      file:////Users/spencervilicic/GitHub/letterboxd-ratings-for-streaming/Letterboxd_Histogram_for_Streaming.user.js
// ==/UserScript==

(function() {
    'use strict';
    console.log("testing changes");
    let pendingTitle = null;
    let pendingHistogramHTML = null;

    // --- Helper: Find movie title from Netflix hover/details ---
    function getMovieTitleFromElement(element) {
        // Netflix changes this often; you may need to adjust
        // Try to find a title element inside the hovered card
        const titleEl = element.querySelector('.fallback-text, .previewModal--player-titleTreatment-logo, .title-card .title');
        return titleEl ? titleEl.textContent.trim() : null;
    }

    // --- Helper: Map Netflix title to Letterboxd slug (simplified/prototype) ---
    function getLetterboxdURL(movieTitle) {
        // In reality you might need a mapping or search
        // For prototyping, assume direct replacement
        if(!movieTitle) return null;
        const slug = movieTitle
            .toLowerCase()
            .replace(/['’]/g, '')                // Remove apostrophes (straight and curly)
            .replace(/[^a-z0-9]+/g, '-')         // Replace non-alphanum with hyphen
            .replace(/^-+|-+$/g, '');            // Trim leading/trailing hyphens
        console.log('title slug', slug);
        return `https://letterboxd.com/csi/film/${slug}/ratings-summary/`;
    }

    function showHistogram(metadataElement, histogramHTML) {
        if (!histogramHTML) return;
        
        // Create container for histogram if not exists
        let container = metadataElement.querySelector('.letterboxd-histogram');
        if (!container) {
            container = document.createElement('div');
            container.className = 'letterboxd-histogram';
            metadataElement.appendChild(container);
        }

        container.innerHTML = histogramHTML;
    }

    function getAverageAndHistogram(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        // Remove unwanted "fans" element
        temp.querySelector('.all-link')?.remove();

        const headingEl = temp.querySelector('.section-heading a');
        headingEl.text = "Letterboxd Ratings";

        // const avg = temp.querySelector('.average-rating');
        // const hist = temp.querySelector('.rating-histogram');

        // let result = '';
        // if (avg) result += avg.outerHTML;
        // if (hist) result += hist.outerHTML;

        // console.log("Parsed histogram html", result);

        return temp.innerHTML;
    }

    function fetchHistogram(title) {
        const letterboxdUrl = getLetterboxdURL(title);
        GM_xmlhttpRequest({
            method: "GET",
            url: letterboxdUrl,
            onload: function(response) {
                pendingHistogramHTML = "<em>No Letterboxd ratings histogram found.</em>";
                if (response.status === 200 && response.responseText.trim() !== '') {
                    pendingHistogramHTML = getAverageAndHistogram(response.responseText);
                    // pendingHistogramHTML = response.responseText;
                    console.log("Fetched html", response.responseText);
                }
            },
            onerror: function(error) {
                console.error("Letterboxd request failed:", error);
                pendingHistogramHTML = null;
            }
        });
    }

    // Observe for any new modal
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            for (const node of mutation.addedNodes) {
                if (
                    node.nodeType === 1 &&
                    node.classList.contains('previewModal--wrapper')
                ) {
                    const metadata = node.querySelector('.previewModal--info-container');
                    if (metadata && pendingHistogramHTML) {
                        showHistogram(metadata, pendingHistogramHTML);
                        // Reset after injection
                        pendingTitle = null;
                        pendingHistogramHTML = null;
                    }
                }
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // --- Main: Attach hover listener to Netflix movie cards ---
    function attachListeners() {
        document.body.addEventListener('mouseover', function(e) {
            const card = e.target.closest('.slider-refocus');
            if (!card) return;

            console.log('hovered on card', card);

            const title = getMovieTitleFromElement(card);
            if (!title) return;

            // Set the pending title for the observer
            pendingTitle = title;
            pendingHistogramHTML = null;
            fetchHistogram(title);
        }, true);
    }

    // --- Wait for Netflix DOM to load and attach listeners ---
    function waitForNetflix() {
        if (document.querySelector('.slider-refocus')) {
            attachListeners();
        } else {
            setTimeout(waitForNetflix, 1000);
        }
    }

    waitForNetflix();

    GM_addStyle(`
        :root {
            --title-all-caps-font-size: 1rem;
            --title-all-caps-line-height: 1.25;
            --title-all-caps-letter-spacing: .075em;
            --font-stack-graphik: GraphikWeb, -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", Meiryo, sans-serif, ColorEmoji;
            --sprite-sheet-url: url('https://s.ltrbxd.com/static/img/sprite-DzUy8pgb.svg');
            --block-divider-color-rgb: 68, 85, 102;
            --title-all-caps-font-size: 1rem;
            --title-all-caps-line-height: 1.25;
            --title-all-caps-letter-spacing: .075em;
            --block-divider-color-rgb: 68, 85, 102;
        }
        .clear {
            clear: both;
        }
        .letterboxd-histogram * {
            margin: 0;
            padding: 0;
            border: 0;
            outline: 0;
            font-weight: inherit;
            font-style: inherit;
            font-size: 100%;
            font-family: inherit;
            vertical-align: baseline;
        }
        .letterboxd-histogram {
            padding: 8px;
            margin-top: 8px;
            background: #222;
            width: 250px;
        }

        /* HTML Elements */
        a {
            color: #678;
            text-decoration: none;
        }
        ul {
            list-style: none;
        }
        section {
            position: relative;
            display: block;
            padding: 0;
        }

        /* HISTOGRAM CONTAINER */
        .section {
            /* margin-top: 2.46153846rem; */
            padding: 0;
            position: relative;
        }
        .ratings-histogram-chart .section-heading {
            margin-bottom: 15px;
        }
        .section-heading {
            font-family: var(--font-stack-graphik);
            font-weight: 400;
            text-transform: uppercase;
            letter-spacing: var(--title-all-caps-letter-spacing);
            font-size: var(--title-all-caps-font-size);
            line-height: var(--title-all-caps-line-height);
            --margin-block-end: .76923077rem;
            margin-block-start: initial;
            margin-block-end: var(--margin-block-end);
            --content-color: #9ab;
            color: var(--content-color, currentColor);
            --divider-thickness: 1px;
            --divider-color: rgba(var(--block-divider-color-rgb), 1);
            --divider-padding-block: .38461538rem;
            padding-block-end: var(--divider-padding-block);
            border-block-end: var(--divider-thickness, 0) solid var(--divider-color);
            font-family: var(--font-stack-graphik);
            font-weight: 400;
            text-transform: uppercase;
            letter-spacing: var(--title-all-caps-letter-spacing);
            font-size: var(--title-all-caps-font-size);
            line-height: var(--title-all-caps-line-height);
        }
        .ratings-histogram-chart .average-rating {
            position: absolute;
            top: 28px;
            left: 188px;
            z-index: 1;
        }
        .ratings-histogram-chart .average-rating .display-rating {
            display: block;
            font-size: 20px;
            text-align: center;
            color: #789;
            margin-left: 1px;
            line-height: 40px;
            width: 33px;
            height: 33px;
            border-radius: 20px;
            font-family: var(--font-stack-graphik);
            font-weight: 300;
        }

        /* RATING HISTOGRAM */
        .rating-histogram {
            overflow: hidden;
            color: #9ab;
            display: block;
        }
        .rating-histogram ul {
            display: block;
            width: 200px;
            overflow: hidden;
            position: absolute;
            bottom: 0;
            left: 15px;
        }
        .rating-histogram, .rating-histogram ul {
            height: 44px;
        }
        .rating-histogram ul li {
            position: absolute;
            bottom: 0;
            display: block;
            height: 1px;
            width: 30px;
            height: 100%;
            font-size: 10px;
            line-height: 1;
            text-indent: 110%;
            white-space: nowrap;
            overflow: hidden;
        }
        .rating-histogram .rating-1 {
            left: 0;
        }
        .rating-histogram .rating-5 {
            right: 0;
        }
        .rating-histogram .rating-1, .rating-histogram .rating-5 {
            position: absolute;
            bottom: 0;
            display: block;
            height: 9px;
        }
        .rating-histogram .rating-1 .rating, .rating-histogram .rating-5 .rating {
            display: block;
        }
        .rating-histogram a, .rating-histogram .bar {
            display: block;
            width: 100%;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: none;
            padding: 0;
        }
        .rating-green-tiny .rated-2 {
            width: 9px;
        }
        .rating-green-tiny .rating {
            background-position: -350px -380px;
            height: 9px;
        }
        .rating-green-tiny .rated-10 {
            width: 49px;
        }
        .rating-histogram i {
            background: #456;
            width: 100%;
            position: absolute;
            bottom: 0;
            left: 0;
            border-top-right-radius: 2px;
            border-top-left-radius: 2px;
        }

        /* Rating */
        .rating {
            display: inline-block;
            height: 16px;
            background: var(--sprite-sheet-url) no-repeat -290px -90px;
            text-indent: 110%;
            white-space: nowrap;
            overflow: hidden;
        }
        .ir {
            display: block;
            background: var(--sprite-sheet-url) no-repeat;
            background-size: 800px 1020px;
            text-indent: 110%;
            white-space: nowrap;
            overflow: hidden;
        }

        /* Remove all-link element */
    `);
})();