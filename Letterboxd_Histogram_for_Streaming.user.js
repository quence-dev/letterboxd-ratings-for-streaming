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
            let container = metadataElement.parentNode.querySelector('.letterboxd-histogram');
        if (!container) {
            container = document.createElement('div');
            container.className = 'letterboxd-histogram';
            container.style.marginTop = '8px';
            container.style.background = '#222';
            container.style.padding = '8px';
            container.style.color = '#fff';
            // netflixElement.appendChild(container);
            metadataElement.parentNode.insertBefore(container, metadataElement.nextSibling);
        }
        container.innerHTML = `<strong>Letterboxd Ratings:</strong><br>${histogramHTML}`;
    }

    function observeForModalAndInject(getHistogramHTML) {
        let injected = false;
        const observer = new MutationObserver((mutationsList, obs) => {
            if (injected) return;
            for (const mutation of mutationsList) {
                for (const node of mutation.addedNodes) {
                    if (
                        node.nodeType === 1 &&
                        node.classList.contains('previewModal--wrapper')
                    ) {
                        const metadata = node.querySelector('.previewModal--metadataAndControls-container');
                        if (metadata && getHistogramHTML()) {
                            showHistogram(metadata, getHistogramHTML());
                            injected = true;
                            obs.disconnect();
                            clearTimeout(timeoutId);
                            return;
                        }
                    }
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });

        // Optional: Stop observing after 5 seconds if modal never appears
        const timeoutId = setTimeout(() => observer.disconnect(), 5000);

        // Return a function to allow immediate injection attempt
        return function tryImmediateInject() {
            if (injected) return;
            const modal = document.querySelector('.previewModal--wrapper');
            if (modal) {
                const metadata = modal.querySelector('.previewModal--metadataAndControls-container');
                if (metadata && getHistogramHTML()) {
                    showHistogram(metadata, getHistogramHTML());
                    injected = true;
                    observer.disconnect();
                    clearTimeout(timeoutId);
                }
            }
        };
    }

    // --- Main: Attach hover listener to Netflix movie cards ---
    function attachListeners() {
        // Adjust selector for movie card details
        document.body.addEventListener('mouseover', function(e) {
            // Find the closest card or modal
            const card = e.target.closest('.slider-refocus');
            if (!card) return;
            console.log('Hovered on card:', card);
            // Prevent duplicate fetch
            if (card.classList.contains('letterboxd-checked')) return;
            card.classList.add('letterboxd-checked');

            const title = getMovieTitleFromElement(card);
            if (!title) return;

            const letterboxdUrl = getLetterboxdURL(title);

            let histogramHTML = null;

            // Start observing for the modal immediately
            const tryImmediateInject = observeForModalAndInject(() => histogramHTML);

            // Fetch the histogram
            GM_xmlhttpRequest({
                method: "GET",
                url: letterboxdUrl,
                onload: function(response) {
                    histogramHTML = "<em>No Letterboxd ratings histogram found.</em>";
                    if (response.status === 200 && response.responseText.trim() !== '') {
                        histogramHTML = response.responseText;
                        console.log("Fetched histogram HTML:", histogramHTML);
                    }
                    // Try to inject immediately in case modal is already present
                    tryImmediateInject();
                },
                onerror: function(error) {
                    console.error("Letterboxd request failed:", error);
                }
            });
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