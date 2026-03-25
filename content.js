// ============================================================
// Pinterest On-Page Sorter — content.js
// 
// HOW IT WORKS:
// Pinterest uses virtual scrolling — only ~20-30 pins live in
// the DOM at once. Pins are added/removed as you scroll.
//
// Our approach:
//   1. A MutationObserver silently watches the DOM and captures
//      every pin's data (image, title, href, stats) the moment
//      the stats extension injects its .pin-stats block.
//   2. Data is stored in a Map, keyed by pin ID, persisting
//      even after Pinterest removes the pin from the DOM.
//   3. When you click Sort, we show a custom full-screen
//      sorted overlay using all the data we've collected.
// ============================================================

// ── DATA STORE ───────────────────────────────────────────────
// pinStore: Map<pinId, {pinId, href, imgSrc, imgSrcSet, title, stats}>
const pinStore = new Map();

// ── HELPERS ──────────────────────────────────────────────────
function getPinId(pinEl) {
    const link = pinEl.querySelector('a[href*="/pin/"]');
    if (!link) return null;
    const m = link.getAttribute('href').match(/\/pin\/(\d+)/);
    return m ? m[1] : null;
}

// --- ON-PIN STATS FETCH & INJECT LOGIC ---

const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
};

async function fetchPinStats(pinId) {
    const baseUrl = window.location.protocol + "//" + window.location.hostname + "/resource/PinResource/get/";
    const data = {
        options: {
            id: pinId,
            field_set_key: "detailed",
            fetch_visual_search_objects: true,
            add_fields: "pin.gen_ai_topics"
        },
        context: {}
    };
    const params = new URLSearchParams({
        _: Date.now().toString(),
        data: JSON.stringify(data),
        source_url: "/homefeed/"
    });
    const url = `${baseUrl}?${params.toString()}`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "x-pinterest-pws-handler": "www/homefeed.js"
            }
        });
        if (response.ok) {
            const json = await response.json();
            return json.resource_response?.data;
        }
    } catch (e) {
        console.error("PinSort: Failed to fetch stats for pin", pinId, e);
    }
    return null;
}

async function injectStatsPopup(pinEl, pinId) {
    if (pinEl.querySelector('.pin-stats-popup')) return; // already injected
    
    // Pinterest uses absolute positioning for grid items based on scroll math.
    // Making this relative breaks their entire grid calculation. Do NOT do that!
    // pinEl.style.position = 'relative';

    // Add a loading spinner while fetching
    const loader = document.createElement('div');
    loader.className = 'pin-stats-loader';
    loader.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><radialGradient id="a10" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)"><stop offset="0" stop-color="#e60023"></stop><stop offset=".3" stop-color="#e60023" stop-opacity=".9"></stop><stop offset=".6" stop-color="#e60023" stop-opacity=".6"></stop><stop offset=".8" stop-color="#e60023" stop-opacity=".3"></stop><stop offset="1" stop-color="#e60023" stop-opacity="0"></stop></radialGradient><circle transform-origin="center" fill="none" stroke="url(#a10)" stroke-width="18" stroke-linecap="round" stroke-dasharray="200 1000" stroke-dashoffset="0" cx="100" cy="100" r="70"><animateTransform type="rotate" attributeName="transform" calcMode="spline" dur="1" values="360;0" keyTimes="0;1" keySplines="0 0 1 1" repeatCount="indefinite"></animateTransform></circle></svg>';
    pinEl.appendChild(loader);

    const data = await fetchPinStats(pinId);
    loader.remove();
    if (!data) return;

    const saves = data.aggregated_pin_data?.aggregated_stats?.saves || 0;
    const repins = data.repin_count || 0;
    const comments = data.aggregated_pin_data?.comment_count || 0;
    const shares = data.share_count || 0;
    const reactionCounts = data.reaction_counts || {};
    const reactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

    // Date Calculation (Exact logic copied from old extension)
    const createdAt = data.created_at || "";
    const calcDate = (Re) => {
        if (!Re) return "0 D";
        const ue = new Date(Re), Oe = new Date, Ls = Oe - ue, Qn = Math.floor(Ls / (1e3 * 60 * 60 * 24));
        let St = Oe.getFullYear() - ue.getFullYear(), Se = Oe.getMonth() - ue.getMonth();
        if (Se < 0) { Se += 12; }
        if (Oe < new Date(Oe.getFullYear(), ue.getMonth(), ue.getDate())) { St--; Se = (Se + 12) % 12; }
        return St != 0 ? `${St} Y` : Se != 0 ? `${Se} M` : Qn != 0 ? `${Qn} D` : "0 D";
    };
    const createdAgo = calcDate(createdAt);

    // Original SVGs from the first extension
    const iconSaves = '<svg width="20px" height="20px" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--emojione" preserveAspectRatio="xMidYMid meet"> <path d="M24.5 35.5C17.8 42.9 2.9 60.9.6 63.1c0 0-.1 0-.1.1c-.9.9-.6 1.2.3.3c2-2 20.2-17.2 27.6-23.9l-3.9-4.1" fill="#d0d0d0"> </path><path fill="#c94747" d="M24.46 28.298L46.873 5.883L58.33 17.338L35.914 39.753z"></path><g fill="#ed4c5c"><path d="M43.6 54.6c.9-7.8-2.5-17.1-9.8-24.3S17.2 19.6 9.4 20.4l34.2 34.2"> </path><path d="M64 22.9c-5.2.6-11.4-1.7-16.3-6.6c-4.9-4.9-7.2-11.1-6.6-16.3L64 22.9"></path></g></svg>';
    const iconRepins = '<svg height="20px" width="20px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve"> <g> <path style="fill:#2D527C;" d="M496.343,324.098h-140.14c-8.647,0-15.657-7.01-15.657-15.657s7.01-15.657,15.657-15.657h124.483 V31.314H219.216v107.261c0,8.647-7.01,15.657-15.657,15.657s-15.657-7.01-15.657-15.657V15.657C187.902,7.01,194.911,0,203.559,0 h292.784C504.99,0,512,7.01,512,15.657v292.784C512,317.089,504.99,324.098,496.343,324.098z"/> <path style="fill:#2D527C;" d="M230.423,512H15.657C7.01,512,0,504.99,0,496.343V203.559c0-8.647,7.01-15.657,15.657-15.657 h292.784c8.647,0,15.657,7.01,15.657,15.657v198.833c0,8.647-7.01,15.657-15.657,15.657s-15.657-7.01-15.657-15.657V219.216H31.314 v261.471h199.109c8.647,0,15.657,7.01,15.657,15.657C246.08,504.99,239.07,512,230.423,512z"/> </g> <polygon style="fill:#CEE8FA;" points="109.608,109.608 109.608,203.559 308.441,203.559 308.441,402.392 402.392,402.392 402.392,109.608 "/> <path style="fill:#2D527C;" d="M402.392,418.049h-93.951c-8.647,0-15.657-7.01-15.657-15.657V219.216H109.608 c-8.647,0-15.657-7.01-15.657-15.657v-93.951c0-8.647,7.01-15.657,15.657-15.657h292.784c8.647,0,15.657,7.01,15.657,15.657v292.784 C418.049,411.039,411.039,418.049,402.392,418.049z M324.098,386.735h62.637V125.265H125.265v62.637h183.177 c8.647,0,15.657,7.01,15.657,15.657V386.735z"/> </svg>';
    const iconComments = '<svg width="20px" height="20px" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"> <defs> <style>.cls-1{fill:#005792;}</style> </defs> <title/> <g id="Chat"> <path class="cls-1" d="M28,15.5A11.76,11.76,0,0,1,16,27H13.4a14.39,14.39,0,0,1-1-1.1l.73-.25c6.52-2.34,11.05-7.51,11.05-13.53a11.72,11.72,0,0,0-.62-3.79h0a11.57,11.57,0,0,0-1.19-2.55A11.4,11.4,0,0,1,28,15.5Z"/> <path d="M22.39,5.77A12.33,12.33,0,0,0,16,4,11.76,11.76,0,0,0,4,15.5,11.17,11.17,0,0,0,6.87,23L4.19,25.85a.67.67,0,0,0-.14.73.63.63,0,0,0,.58.42H16A11.76,11.76,0,0,0,28,15.5,11.4,11.4,0,0,0,22.39,5.77ZM16,25.65H6.16l2.05-2.21a.69.69,0,0,0,0-1,9.84,9.84,0,0,1-2.93-7C5.26,9.9,10.08,5.35,16,5.35a11,11,0,0,1,7.58,3h0a9.82,9.82,0,0,1,3.15,7.17C26.74,21.1,21.92,25.65,16,25.65Z"/> <ellipse cx="10.32" cy="14.82" rx="1.26" ry="1.35"/> <ellipse cx="15.37" cy="14.82" rx="1.26" ry="1.35"/> <ellipse cx="20.42" cy="14.82" rx="1.26" ry="1.35"/> </g> </svg>';
    const iconShares = '<svg fill="#000000" width="20px" height="20px" viewBox="0 0 24 24" id="share-alt-2" data-name="Flat Line" xmlns="http://www.w3.org/2000/svg" class="icon flat-line"><path id="secondary" d="M6,9a3,3,0,1,1-3,3A3,3,0,0,1,6,9Zm9,9a3,3,0,1,0,3-3A3,3,0,0,0,15,18Zm3-9a3,3,0,1,0-3-3A3,3,0,0,0,18,9Z" style="fill: rgb(44, 169, 188); stroke-width: 2;"></path><path id="primary" d="M8.68,13.34l6.62,3.31m-6.62-6L15.3,7.35M6,9a3,3,0,1,1-3,3A3,3,0,0,1,6,9Zm9,9a3,3,0,1,0,3-3A3,3,0,0,0,15,18Zm3-9a3,3,0,1,0-3-3A3,3,0,0,0,18,9Z" style="fill: none; stroke: rgb(0, 0, 0); stroke-linecap: round; stroke-linejoin: round; stroke-width: 2;"></path></svg>';
    const iconReactions = '<svg width="20px" height="20px" viewBox="0 0 1024 1024" class="icon"  version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M897.9 369.2H205c-33.8 0-61.4-27.6-61.4-61.4s27.6-61.4 61.4-61.4h692.9c33.8 0 61.4 27.6 61.4 61.4s-27.6 61.4-61.4 61.4z" fill="#FFB89A" /><path d="M807 171H703.3c-16.6 0-30 13.4-30 30s13.4 30 30 30H807c31.6 0 57.4 24 57.4 53.4v42.3H125.2v-42.3c0-29.5 25.7-53.4 57.4-53.4H293c16.6 0 30-13.4 30-30s-13.4-30-30-30H182.5c-64.7 0-117.4 50.9-117.4 113.4v527.7c0 62.5 52.7 113.4 117.4 113.4H807c64.7 0 117.4-50.9 117.4-113.4V284.5c0-62.6-52.7-113.5-117.4-113.5z m0 694.6H182.5c-31.6 0-57.4-24-57.4-53.4V386.8h739.2v425.4c0.1 29.5-25.7 53.4-57.3 53.4z" fill="#45484C" /><path d="M447.6 217.1c-12.4-6.1-27-2.8-35.7 7.1-2.2-6.7-4-16.2-4-28.1 0-13 2.2-23 4.6-29.8 9.5 8.1 23.5 9.6 34.9 2.8 14.2-8.5 18.8-27 10.3-41.2-15.5-25.9-35.9-29.7-46.6-29.7-36.6 0-63.1 41.2-63.1 97.8s26.4 98 63 98c20.6 0 39-13.4 50.4-36.7 7.3-14.9 1.1-32.9-13.8-40.2zM635.9 218.5c-12.4-6.1-27-2.8-35.7 7.1-2.2-6.7-4-16.2-4-28.1 0-13 2.2-23 4.6-29.8 9.5 8.1 23.5 9.6 34.9 2.8 14.2-8.5 18.8-27 10.3-41.2-15.5-25.9-35.9-29.7-46.6-29.7-36.6 0-63.1 41.2-63.1 97.8s26.5 97.8 63.1 97.8c20.6 0 39-13.4 50.4-36.7 7.1-14.7 0.9-32.7-13.9-40z" fill="#45484C" /><path d="M700.2 514.5H200.5c-16.6 0-30 13.4-30 30s13.4 30 30 30h499.7c16.6 0 30-13.4 30-30s-13.5-30-30-30zM668.4 689.8h-74c-16.6 0-30 13.4-30 30s13.4 30 30 30h74c16.6 0 30-13.4 30-30s-13.4-30-30-30zM479.3 689.8H200.5c-16.6 0-30 13.4-30 30s13.4 30 30 30h278.8c16.6 0 30-13.4 30-30s-13.4-30-30-30z" fill="#33CC99" /></svg>';
    const iconDate = '<svg width="20px" height="20px" viewBox="0 0 1024 1024" class="icon"  version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M897.9 369.2H205c-33.8 0-61.4-27.6-61.4-61.4s27.6-61.4 61.4-61.4h692.9c33.8 0 61.4 27.6 61.4 61.4s-27.6 61.4-61.4 61.4z" fill="#FFB89A" /><path d="M807 171H703.3c-16.6 0-30 13.4-30 30s13.4 30 30 30H807c31.6 0 57.4 24 57.4 53.4v42.3H125.2v-42.3c0-29.5 25.7-53.4 57.4-53.4H293c16.6 0 30-13.4 30-30s-13.4-30-30-30H182.5c-64.7 0-117.4 50.9-117.4 113.4v527.7c0 62.5 52.7 113.4 117.4 113.4H807c64.7 0 117.4-50.9 117.4-113.4V284.5c0-62.6-52.7-113.5-117.4-113.5z m0 694.6H182.5c-31.6 0-57.4-24-57.4-53.4V386.8h739.2v425.4c0.1 29.5-25.7 53.4-57.3 53.4z" fill="#45484C" /><path d="M447.6 217.1c-12.4-6.1-27-2.8-35.7 7.1-2.2-6.7-4-16.2-4-28.1 0-13 2.2-23 4.6-29.8 9.5 8.1 23.5 9.6 34.9 2.8 14.2-8.5 18.8-27 10.3-41.2-15.5-25.9-35.9-29.7-46.6-29.7-36.6 0-63.1 41.2-63.1 97.8s26.4 98 63 98c20.6 0 39-13.4 50.4-36.7 7.3-14.9 1.1-32.9-13.8-40.2zM635.9 218.5c-12.4-6.1-27-2.8-35.7 7.1-2.2-6.7-4-16.2-4-28.1 0-13 2.2-23 4.6-29.8 9.5 8.1 23.5 9.6 34.9 2.8 14.2-8.5 18.8-27 10.3-41.2-15.5-25.9-35.9-29.7-46.6-29.7-36.6 0-63.1 41.2-63.1 97.8s26.5 97.8 63.1 97.8c20.6 0 39-13.4 50.4-36.7 7.1-14.7 0.9-32.7-13.9-40z" fill="#45484C" /><path d="M700.2 514.5H200.5c-16.6 0-30 13.4-30 30s13.4 30 30 30h499.7c16.6 0 30-13.4 30-30s-13.5-30-30-30zM668.4 689.8h-74c-16.6 0-30 13.4-30 30s13.4 30 30 30h74c16.6 0 30-13.4 30-30s-13.4-30-30-30zM479.3 689.8H200.5c-16.6 0-30 13.4-30 30s13.4 30 30 30h278.8c16.6 0 30-13.4 30-30s-13.4-30-30-30z" fill="#33CC99" /></svg>';

    const popup = document.createElement('div');
    popup.className = 'pin-stats';
    
    // Set inline styles exactly as the previous extension did
    popup.style.backgroundColor = "rgb(255 255 255 / 82%)";
    popup.style.top = "60px";
    popup.style.left = "0px";
    popup.style.position = "absolute";
    popup.style.padding = "5px";
    popup.style.fontSize = "15px";
    popup.style.zIndex = "100";
    
    // Added tooltip structures into the HTML
    popup.innerHTML = `
        <div class="stat-item"><span class="hover-text">${iconSaves}<span class="tooltip-text">Saves</span></span><span> ${formatNumber(saves)}</span></div>
        <div class="stat-item"><span class="hover-text">${iconRepins}<span class="tooltip-text">Repins</span></span><span> ${formatNumber(repins)}</span></div>
        <div class="stat-item"><span class="hover-text">${iconComments}<span class="tooltip-text">Comments</span></span><span> ${formatNumber(comments)}</span></div>
        <div class="stat-item"><span class="hover-text">${iconShares}<span class="tooltip-text">Shares</span></span><span> ${formatNumber(shares)}</span></div>
        <div class="stat-item"><span class="hover-text">${iconDate}<span class="tooltip-text">Pin age</span></span> <span class="hover-text">${createdAgo}<span class="tooltip-text">${new Date(createdAt).toLocaleString()}</span></span></div>
    `;
    
    // Inject relative to the image container specifically, not the top level grid item!
    const targetContainer = pinEl.querySelector(`[data-test-pin-id="${pinId}"]`);
    if (targetContainer) {
        targetContainer.style.position = 'relative';
        targetContainer.appendChild(popup);
    } else {
        // Fallback for differently structured pins: attach directly to image wrap
        const imgWrap = pinEl.querySelector('div[data-test-id="closeup-body-style"]') || pinEl.querySelector('img')?.parentElement;
        if (imgWrap) {
            imgWrap.style.position = 'relative';
            imgWrap.appendChild(popup);
        }
    }
    
    return { saves, repins, comments, shares, reactions };
}

function extractStats(pinEl) {
    // We no longer extract from the DOM natively; we fetch instead.
    return null;
}

async function capturePinEl(pinEl) {
    const pinId = getPinId(pinEl);
    if (!pinId) return;

    const stats = await injectStatsPopup(pinEl, pinId);
    
    const link = pinEl.querySelector('a[href*="/pin/"]');
    const href = link ? link.getAttribute('href') : '';
    const fullHref = href.startsWith('http') ? href : 'https://www.pinterest.com' + href;

    const img = pinEl.querySelector('img');
    const imgSrc = img ? img.src : '';
    // prefer largest srcset image for overlay quality
    const srcset = img ? img.getAttribute('srcset') : '';
    let bestSrc = imgSrc;
    if (srcset) {
        const parts = srcset.split(',').map(s => s.trim().split(' '));
        const last = parts[parts.length - 1];
        if (last && last[0]) bestSrc = last[0];
    }

    const title = (link ? link.getAttribute('aria-label') : '') ||
        pinEl.querySelector('h2')?.textContent?.trim() || '';
        
    if (pinStore.has(pinId)) {
        // Update stats in case they changed
        if (stats) pinStore.get(pinId).stats = stats;
        pinStore.get(pinId).imgSrc = bestSrc; // always update best image
        return;
    }

    pinStore.set(pinId, { pinId, href: fullHref, imgSrc: bestSrc, title, stats });

    updateCounter();
}

// ── MUTATION OBSERVER: capture pins as they enter the DOM ─────
// We watch for two events:
//   a) A pin element (data-grid-item) entering the DOM
//   b) A .pin-stats div being added inside a pin (stats extension is async)
const seenPins = new WeakSet(); // track which pins we've tried to capture

const domObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;

            // Case A: a pin container was added
            const pinEls = [];
            if (node.matches?.('div[data-grid-item="true"]')) {
                pinEls.push(node);
            } else {
                node.querySelectorAll?.('div[data-grid-item="true"]').forEach(p => pinEls.push(p));
            }
            pinEls.forEach(pin => {
                if (!seenPins.has(pin)) {
                    seenPins.add(pin);
                }
                capturePinEl(pin);
            });

            // We now do the initial fetch when the pin container enters the DOM.
            // We no longer need to wait for .pin-stats to be injected 
            // because we are injecting it ourselves.
        }
    }
});

function findParentPin(el) {
    let cur = el.parentElement;
    while (cur && cur !== document.body) {
        if (cur.matches('div[data-grid-item="true"]')) return cur;
        cur = cur.parentElement;
    }
    return null;
}

// Also scan all currently visible pins immediately
function scanVisiblePins() {
    document.querySelectorAll('div[data-grid-item="true"]').forEach(pin => {
        capturePinEl(pin);
    });
}

// ── UI: COUNTER UPDATE ────────────────────────────────────────
function updateCounter() {
    const counter = document.getElementById('ps-counter');
    if (counter) counter.textContent = `${pinStore.size} collected`;
}

// ── OVERLAY ───────────────────────────────────────────────────
let overlayEl = null;

const STAT_LABELS = {
    saves: '🔥 Saves',
    repins: '📌 Repins',
    comments: '💬 Comments',
    shares: '🔗 Shares',
    reactions: '❤️ Reactions',
};

function showSortedOverlay(statKey) {
    if (pinStore.size === 0) {
        alert('No pins collected yet.\n\nScroll through the page first — the extension collects pin data in the background as each pin appears. Then click Sort.');
        return;
    }

    // Remove existing overlay
    overlayEl?.remove();

    // Sort all collected pins
    const sorted = Array.from(pinStore.values())
        .sort((a, b) => (b.stats[statKey] || 0) - (a.stats[statKey] || 0));

    // Build overlay
    overlayEl = document.createElement('div');
    overlayEl.id = 'ps-overlay';

    const statLabel = STAT_LABELS[statKey] || statKey;

    overlayEl.innerHTML = `
        <div id="ps-overlay-header">
            <span id="ps-overlay-title">Sorted by ${statLabel} — ${sorted.length} pins collected</span>
            <div id="ps-overlay-controls">
                <select id="ps-sort-select">
                    ${Object.entries(STAT_LABELS).map(([k, v]) =>
        `<option value="${k}" ${k === statKey ? 'selected' : ''}>${v}</option>`
    ).join('')}
                </select>
                <button id="ps-overlay-close">✖ Close</button>
            </div>
        </div>
        <div id="ps-overlay-grid"></div>
    `;

    const grid = overlayEl.querySelector('#ps-overlay-grid');

    sorted.forEach((pin, rank) => {
        const card = document.createElement('a');
        card.className = 'ps-card';
        card.href = pin.href;
        card.target = '_blank';
        card.rel = 'noopener';

        const statVal = pin.stats[statKey] ?? 0;

        card.innerHTML = `
            <div class="ps-card-rank">#${rank + 1}</div>
            <img class="ps-card-img" src="${pin.imgSrc}" alt="${pin.title}" loading="lazy" />
            <div class="ps-card-info">
                <div class="ps-card-header">
                    <div class="ps-card-title">${pin.title || 'Pin'}</div>
                    <div class="ps-card-actions" style="display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end;">
                        <button class="ps-download-btn" data-url="${pin.imgSrc}" style="width: 100%; margin-bottom: 4px;">Download</button>
                        <button class="ps-mb-btn" data-url="${pin.imgSrc}" data-orientation="Vertical" style="background-color: #000; color: #eab308; font-weight: bold; border: 2px solid #eab308; cursor: pointer; padding: 4px 8px; border-radius: 4px; flex: 1;">Vertical 🚀</button>
                        <button class="ps-mb-btn" data-url="${pin.imgSrc}" data-orientation="Horizontal" style="background-color: #000; color: #eab308; font-weight: bold; border: 2px solid #eab308; cursor: pointer; padding: 4px 8px; border-radius: 4px; flex: 1;">Horizontal 🚀</button>
                    </div>
                </div>
                <div class="ps-card-stat">${statLabel}: <strong>${statVal.toLocaleString()}</strong></div>
                <div class="ps-card-stats-row">
                    ${Object.entries(pin.stats)
                .filter(([k]) => k !== statKey)
                .map(([k, v]) => `<span>${STAT_LABELS[k]}: ${v.toLocaleString()}</span>`)
                .join('')
            }
                </div>
            </div>
        `;

        // Intercept download button click to trigger forced download
        const downloadBtn = card.querySelector('.ps-download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const url = downloadBtn.getAttribute('data-url');
                try {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    const objectUrl = window.URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.href = objectUrl;
                    
                    const randomName = Math.floor(100000000 + Math.random() * 900000000);
                    const extMatch = url.match(/\\.([a-zA-Z0-9]+)(?:\\?.*)?$/);
                    const extension = extMatch ? extMatch[1] : 'jpg';
                    
                    a.download = `${randomName}.${extension}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    
                    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 100);
                } catch (error) {
                    console.error('Download failed:', error);
                    alert('Failed to download image. The image server might be blocking direct downloads.');
                }
            });
        }
        
        // Intercept Mama Banana buttons
        const mbBtns = card.querySelectorAll('.ps-mb-btn');
        mbBtns.forEach(mbBtn => {
            mbBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const url = mbBtn.getAttribute('data-url');
                const orientation = mbBtn.getAttribute('data-orientation');
                
                // Show loading state on button
                const originalText = mbBtn.innerHTML;
                mbBtn.innerHTML = '⏳';
                mbBtn.style.opacity = '0.7';
                mbBtn.disabled = true;
                
                // Send message to background worker
                chrome.runtime.sendMessage({
                    type: 'REINVENT_ARTWORK',
                    payload: {
                        imageUrl: url,
                        pinId: pin.pinId,
                        title: pin.title,
                        targetOrientation: orientation
                    }
                }, (response) => {
                    // Reset button after short delay or if there's an issue
                    setTimeout(() => {
                        mbBtn.innerHTML = response && response.success ? '✅' : '❌';
                        mbBtn.style.opacity = '1';
                        mbBtn.disabled = false;
                        
                        // Reset text completely after 2s
                        setTimeout(() => {
                            if (document.body.contains(mbBtn)) {
                                mbBtn.innerHTML = originalText;
                            }
                        }, 2000);
                    }, 500);
                });
            });
        });

        grid.appendChild(card);
    });

    document.body.appendChild(overlayEl);

    // Close button
    overlayEl.querySelector('#ps-overlay-close').addEventListener('click', () => {
        overlayEl?.remove();
        overlayEl = null;
    });

    // Re-sort on select change
    overlayEl.querySelector('#ps-sort-select').addEventListener('change', e => {
        showSortedOverlay(e.target.value);
    });

    // Close on ESC
    const escHandler = (e) => {
        if (e.key === 'Escape') { overlayEl?.remove(); overlayEl = null; document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
}

// ── AUTO-SCROLL LOGIC ─────────────────────────────────────────
let scrollInterval = null;

function toggleAutoScroll(btn) {
    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
        btn.textContent = '⏬ Start Scroll';
        btn.classList.remove('active');
    } else {
        btn.textContent = '⏹ Stop Scroll';
        btn.classList.add('active');
        scrollInterval = setInterval(() => {
            window.scrollBy(0, 600);
        }, 800); // Medium-slow scroll to allow pins to load
    }
}

function stopAutoScroll() {
    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
    }
}

// ── FLOATING PANEL ────────────────────────────────────────────
function injectSortUI() {
    if (document.getElementById('pinterest-sort-ui')) return;

    const ui = document.createElement('div');
    ui.id = 'pinterest-sort-ui';
    ui.innerHTML = `
        <div class="sort-title">📌 Pin Sorter</div>
        <div id="ps-hint">Scroll the page to collect pins, then sort.</div>
        <div id="ps-counter">0 collected</div>
        <button id="ps-scroll-btn" class="scroll-btn">⏬ Start Scroll</button>
        <button data-sort="saves">🔥 By Saves</button>
        <button data-sort="repins">📌 By Repins</button>
        <button data-sort="comments">💬 By Comments</button>
        <button data-sort="shares">🔗 By Shares</button>
        <button data-sort="reactions">❤️ By Reactions</button>
        <button class="reset-btn" data-sort="clear">🗑 Clear &amp; Reset</button>
    `;
    document.body.appendChild(ui);

    const scrollBtn = ui.querySelector('#ps-scroll-btn');
    if (scrollBtn) {
        scrollBtn.addEventListener('click', e => {
            e.stopPropagation();
            toggleAutoScroll(scrollBtn);
        });
    }

    ui.querySelectorAll('button[data-sort]').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const action = e.currentTarget.getAttribute('data-sort');
            if (action === 'clear') {
                pinStore.clear();
                overlayEl?.remove();
                overlayEl = null;
                updateCounter();
                stopAutoScroll();
                if (scrollBtn) {
                    scrollBtn.textContent = '⏬ Start Scroll';
                    scrollBtn.classList.remove('active');
                }
            } else {
                showSortedOverlay(action);
            }
        });
    });

    // Start collecting immediately
    scanVisiblePins();
}

// ── INIT ─────────────────────────────────────────────────────
// Start observer immediately (don't wait for UI)
domObserver.observe(document.body, { childList: true, subtree: true });

setTimeout(injectSortUI, 3000);

// Re-init on Pinterest SPA navigation
let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        stopAutoScroll();
        document.getElementById('pinterest-sort-ui')?.remove();
        overlayEl?.remove();
        overlayEl = null;
        pinStore.clear();
        setTimeout(injectSortUI, 3000);
    }
}).observe(document.head || document.documentElement, { childList: true, subtree: false });