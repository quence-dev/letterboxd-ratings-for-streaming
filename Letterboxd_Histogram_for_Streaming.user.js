// ==UserScript==
// @name         Letterboxd Histogram for Streaming
// @namespace    https://github.com/quence-dev/letterboxd-ratings-for-streaming
// @version      0.0.1
// @description  Show Letterboxd ratings histogram on Netflix movie details
// @author       quence-dev
// @match        https://www.netflix.com/*
// @grant        GM_xmlhttpRequest
// @connect      letterboxd.com
// @run-at       document-end
// @require      file:////Users/spencervilicic/GitHub/letterboxd-ratings-for-streaming/Letterboxd_Histogram_for_Streaming.user.js
// ==/UserScript==

(function() {
    'use strict';
    console.log("testing change");
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
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        console.log('title slug', slug);
        return `https://letterboxd.com/csi/film/${slug}/ratings-summary/`;
    }

    function showHistogram(metadataElement, histogramHTML) {
        if (!histogramHTML) return;
        
        let container = metadataElement.querySelector('.letterboxd-histogram');
        if (!container) {
            container = document.createElement('div');
            container.className = 'letterboxd-histogram';
            container.style.marginTop = '8px';
            container.style.background = '#222';
            container.style.padding = '8px';
            container.style.color = '#fff';
            metadataElement.appendChild(container);
        }
        container.innerHTML = `<strong>Letterboxd Ratings:</strong><br>${histogramHTML}`;
    }

    function fetchHistogram(title) {
        const letterboxdUrl = getLetterboxdURL(title);
        GM_xmlhttpRequest({
            method: "GET",
            url: letterboxdUrl,
            onload: function(response) {
                pendingHistogramHTML = "<em>No Letterboxd ratings histogram found.</em>";
                if (response.status === 200 && response.responseText.trim() !== '') {
                    pendingHistogramHTML = response.responseText;
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

            // Prevent duplicate processing
            if (card.classList.contains('letterboxd-checked')) return;
            card.classList.add('letterboxd-checked');
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
})();