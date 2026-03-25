// displate_content.js - Content script for Displate pages
// Injects Vertical / Horizontal "Mama Banana" buttons on every artwork card.

function extractDisplateImageUrl(cardEl) {
    // Look for the 2x high-res image in the <source> tags first
    const sources = cardEl.querySelectorAll('source');
    for (const source of sources) {
        if (source.media && source.media.includes('1440px')) {
            const srcset = source.getAttribute('srcset') || '';
            const match2x = srcset.match(/([^,]+)\s+2x/);
            if (match2x) return match2x[1].trim();
            const match1x = srcset.match(/([^,]+)\s+1x/);
            if (match1x) return match1x[1].trim();
        }
    }

    // Fallback: standard img src
    const img = cardEl.querySelector('img[data-testid="artwork-img"]');
    if (img) return img.src;

    return null;
}

function extractDisplateTitle(cardEl) {
    const img = cardEl.querySelector('img[data-testid="artwork-img"]');
    if (img && img.alt) return img.alt.trim();

    return 'displate_artwork';
}

function injectDisplateButtons(cardEl) {
    // Use the container specifically meant for the image so buttons sit nicely on top
    const imgWrapper = cardEl.querySelector('.MasonryGridItem_masonryGridImageWrapper__Yvl_Z') || cardEl;
    
    if (imgWrapper.querySelector('.mb-displate-reinvent-container')) return;

    const imageUrl = extractDisplateImageUrl(cardEl);
    if (!imageUrl) return;

    // Create a container with position relative if it isn't already to hold our absolute buttons
    if (window.getComputedStyle(imgWrapper).position === 'static') {
        imgWrapper.style.position = 'relative';
    }

    const btnContainer = document.createElement('div');
    btnContainer.className = 'mb-displate-reinvent-container';
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

        // Black + Yellow styling
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
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
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

            const title = extractDisplateTitle(cardEl);

            const originalText = btn.innerHTML;
            btn.innerHTML = '⏳';
            btn.disabled = true;
            btn.style.opacity = '0.8';

            chrome.runtime.sendMessage({
                type: 'REINVENT_ARTWORK',
                payload: {
                    imageUrl: imageUrl,
                    pinId: 'displate_' + Date.now(),
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

    imgWrapper.appendChild(btnContainer);
}

function scanDisplateCards() {
    const cards = document.querySelectorAll('[data-testid="masonry-grid-item"]');
    cards.forEach(card => injectDisplateButtons(card));
}

// MutationObserver for infinite scroll on Displate
const displateObserver = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType !== 1) continue;
            
            if (node.getAttribute('data-testid') === 'masonry-grid-item') {
                injectDisplateButtons(node);
            } else if (node.querySelector('[data-testid="masonry-grid-item"]')) {
                shouldScan = true;
            }
        }
    }
    if (shouldScan) scanDisplateCards();
});

// Run once and start observer
if (document.body) {
    displateObserver.observe(document.body, { childList: true, subtree: true });
}

setTimeout(scanDisplateCards, 1500);

// Re-scan on SPA navigation
let lastDisplateUrl = location.href;
const urlObserver = new MutationObserver(() => {
    if (location.href !== lastDisplateUrl) {
        lastDisplateUrl = location.href;
        setTimeout(scanDisplateCards, 1500);
    }
});
urlObserver.observe(document.head || document.documentElement, { childList: true, subtree: false });

console.log('[Mama Banana] Displate content script loaded.');
