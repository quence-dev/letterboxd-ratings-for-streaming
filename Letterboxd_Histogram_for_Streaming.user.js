// ==UserScript==
// @name         Letterboxd Histogram for Streaming
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Show Letterboxd ratings histogram on Netflix movie details
// @author       Your Name
// @match        https://www.netflix.com/*
// @grant        GM_xmlhttpRequest
// @connect      letterboxd.com
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    console.log("Tampermonkey script started!");

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

    // --- OLD Helper: Scrape histogram HTML from Letterboxd response ---
//     function extractHistogram(htmlText) {
//         // Letterboxd uses class 'ratings-histogram-chart' for the histogram
//         const div = document.createElement('div');
//         div.innerHTML = htmlText;

//             // Log all section elements and their classes
//         const allSections = div.querySelectorAll('.ratings-histogram-chart');
//         allSections.forEach(sec => console.log('Section class:', sec.className));

//         const chart = div.querySelectorAll('.ratings-histogram-chart');
//         console.log('chart', chart);
//         return chart ? chart.outerHTML : null;
//     }

    // --- OLD Inject histogram into Netflix UI ---
//     function showHistogram(netflixElement, histogramHTML) {
//         if (!histogramHTML) return;

//         let container = netflixElement.querySelector('.letterboxd-histogram');
//         if (!container) {
//             container = document.createElement('div');
//             container.className = 'letterboxd-histogram';
//             // Style it as you like
//             container.style.marginTop = '8px';
//             container.style.background = '#222';
//             container.style.padding = '8px';
//             netflixElement.appendChild(container);
//         }
//         container.innerHTML = `<strong>Letterboxd Ratings:</strong><br>${histogramHTML}`;
//     }

    function showHistogram(netflixElement, histogramHTML) {
        if (!histogramHTML) return;
            let container = netflixElement.querySelector('.letterboxd-histogram');
        if (!container) {
            container = document.createElement('div');
            container.className = 'letterboxd-histogram';
            container.style.marginTop = '8px';
            container.style.background = '#222';
            container.style.padding = '8px';
            container.style.color = '#fff';
            netflixElement.appendChild(container);
        }
        container.innerHTML = `<strong>Letterboxd Ratings:</strong><br>${histogramHTML}`;
    }

    // --- Main: Attach hover listener to Netflix movie cards ---
    function attachListeners() {
        // Adjust selector for movie card details
        document.body.addEventListener('mouseover', function(e) {
            // Find the closest card or modal
            const card = e.target.closest('.slider-refocus, .previewModal--detailsMetadata');
            if (!card) return;
            // Prevent duplicate fetch
            if (card.classList.contains('letterboxd-checked')) return;

            card.classList.add('letterboxd-checked');
            const title = getMovieTitleFromElement(card);
            if (!title) return;

            const letterboxdUrl = getLetterboxdURL(title);

            GM_xmlhttpRequest({
                method: "GET",
                url: letterboxdUrl,
//                 onload: function(response) {
//                     console.log("Letterboxd request status:", response.status);
//                     console.log("full text:", response.responseText);
//                     if (response.status !== 200) return;
//                     const histogram = extractHistogram(response.responseText);
//                     console.log('histogram fetched', histogram);
//                     showHistogram(card, histogram);
//                 },
                onload: function(response) {
                    if (response.status !== 200) return;
                    if (response.status === 200 && response.responseText.trim() !== '') {
                        showHistogram(card, response.responseText);
                    } else {
                        showHistogram(card, "<em>No Letterboxd ratings histogram found.</em>");
                    }
                },
                onerror: function(error) {
                    console.error("Letterboxd request failed:", error);
                }
            });
        }, true);
    }

    // --- Wait for Netflix DOM to load and attach listeners ---
    function waitForNetflix() {
        if (document.querySelector('.slider-refocus, .previewModal--detailsMetadata')) {
            attachListeners();
        } else {
            setTimeout(waitForNetflix, 1000);
        }
    }

    waitForNetflix();
})();