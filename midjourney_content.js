// midjourney_content.js - Content script for Midjourney pages
// Injects Vertical / Horizontal "Mama Banana" buttons on every image card,
// following the same pattern as etsy_content.js.

function extractMjImageUrl(cardEl) {
    // The <a> inside the card uses background-image via image-set().
    // We want the highest resolution variant.
    const link = cardEl.querySelector('a[style*="background-image"]');
    if (!link) return null;

    const style = link.getAttribute('style') || '';

    // Try to grab the 2x (higher-res) URL from image-set
    const twoXMatch = style.match(/url\("([^"]+)"\)\s*2x/);
    if (twoXMatch) return twoXMatch[1];

    // Fallback: grab the 1x URL
    const oneXMatch = style.match(/url\("([^"]+)"\)\s*1x/);
    if (oneXMatch) return oneXMatch[1];

    // Last resort: any url() inside the style
    const anyUrlMatch = style.match(/url\("([^"]+)"\)/);
    if (anyUrlMatch) return anyUrlMatch[1];

    return null;
}

function extractMjTitle(cardEl) {
    // The username / prompt text lives inside a truncated <div> within an <a>
    const usernameDiv = cardEl.querySelector('a[href*="/@"] .truncate, a[href*="/@"] div.truncate');
    if (usernameDiv) return usernameDiv.textContent.trim();

    // Fallback: use the link href slug
    const link = cardEl.querySelector('a[href*="/jobs/"]');
    if (link) {
        const href = link.getAttribute('href');
        const match = href.match(/\/jobs\/([a-f0-9-]+)/);
        return match ? `midjourney_${match[1].slice(0, 8)}` : 'midjourney_image';
    }

    return 'midjourney_image';
}

function injectMjButtons(cardEl) {
    // Don't double-inject
    if (cardEl.querySelector('.mb-mj-reinvent-container')) return;

    const imageUrl = extractMjImageUrl(cardEl);
    if (!imageUrl) return;

    // Create button container
    const btnContainer = document.createElement('div');
    btnContainer.className = 'mb-mj-reinvent-container';
    Object.assign(btnContainer.style, {
        position: 'absolute',
        top: '8px',
        left: '8px',
        zIndex: '200',
        display: 'flex',
        gap: '6px',
        pointerEvents: 'auto'
    });

    const createBtn = (orientation) => {
        const btn = document.createElement('button');
        btn.innerHTML = `${orientation} 🚀`;
        btn.title = `Send to Mama Banana as ${orientation}`;

        // Style: Black + Yellow, matching Etsy buttons exactly
        Object.assign(btn.style, {
            backgroundColor: '#000000',
            color: '#eab308',
            fontWeight: '900',
            padding: '6px 12px',
            borderRadius: '30px',
            border: '2px solid #eab308',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            transition: 'all 0.2s ease',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            pointerEvents: 'auto'
        });

        btn.onmouseover = () => {
            btn.style.transform = 'scale(1.05)';
            btn.style.backgroundColor = '#1a1a1a';
        };
        btn.onmouseout = () => {
            btn.style.transform = 'scale(1)';
            btn.style.backgroundColor = '#000000';
        };

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Re-extract image URL at click time in case it changed
            const currentUrl = extractMjImageUrl(cardEl) || imageUrl;

            // Get full-res version: replace _384_N or _640_N with _1024_N for best quality
            const fullResUrl = currentUrl
                .replace(/_384_N\.webp/, '_1024_N.webp')
                .replace(/_640_N\.webp/, '_1024_N.webp');

            const title = extractMjTitle(cardEl);

            // Loading state
            const originalText = btn.innerHTML;
            btn.innerHTML = '⏳';
            btn.disabled = true;
            btn.style.opacity = '0.8';

            chrome.runtime.sendMessage({
                type: 'REINVENT_ARTWORK',
                payload: {
                    imageUrl: fullResUrl,
                    pinId: 'mj_' + Date.now(),
                    title: title,
                    targetOrientation: orientation
                }
            }, (response) => {
                setTimeout(() => {
                    btn.innerHTML = response && response.success ? '✅' : '❌';

                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                        btn.style.opacity = '1';
                    }, 2000);
                }, 500);
            });
        });

        return btn;
    };

    btnContainer.appendChild(createBtn('Vertical'));
    btnContainer.appendChild(createBtn('Horizontal'));

    // Insert at the top of the card (the card has position: absolute already)
    cardEl.appendChild(btnContainer);
}

function scanMjCards() {
    // Midjourney job cards have the class group/jobCard
    const cards = document.querySelectorAll('[class*="group/jobCard"]');
    cards.forEach(card => injectMjButtons(card));
}

// MutationObserver: Midjourney uses virtual scrolling like Pinterest
const mjObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;

            // Check if the added node IS a job card
            if (node.className && typeof node.className === 'string' && node.className.includes('group/jobCard')) {
                injectMjButtons(node);
            }

            // Check children of the added node
            if (node.querySelectorAll) {
                const cards = node.querySelectorAll('[class*="group/jobCard"]');
                cards.forEach(card => injectMjButtons(card));
            }
        }
    }
});

// Start observing
if (document.body) {
    mjObserver.observe(document.body, { childList: true, subtree: true });
}

// Initial scan with a delay to let the page render
setTimeout(scanMjCards, 1500);

// Re-scan on URL changes (SPA navigation)
let lastMjUrl = location.href;
const urlObserver = new MutationObserver(() => {
    if (location.href !== lastMjUrl) {
        lastMjUrl = location.href;
        setTimeout(scanMjCards, 1500);
    }
});
urlObserver.observe(document.head || document.documentElement, { childList: true, subtree: false });

console.log('[Mama Banana] Midjourney content script loaded.');
