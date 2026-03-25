// etsy_content.js - Content script for Etsy Product Pages

function injectEtsyButton() {
    // Check if we already injected the buttons
    if (document.getElementById('mb-etsy-reinvent-container')) return;

    // Find the main product image container
    const imageWrapper = document.querySelector('.image-carousel-container, .image-wrapper');
    if (!imageWrapper) return;

    // Ensure the container has relative positioning so our absolute button stays inside it
    if (window.getComputedStyle(imageWrapper).position === 'static') {
        imageWrapper.style.position = 'relative';
    }

    // Create the container
    const btnContainer = document.createElement('div');
    btnContainer.id = 'mb-etsy-reinvent-container';
    Object.assign(btnContainer.style, {
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: '100',
        display: 'flex',
        gap: '8px'
    });

    const createBtn = (orientation) => {
        const btn = document.createElement('button');
        btn.innerHTML = `${orientation} 🚀`;
        btn.title = `Send to Mama Banana as ${orientation}`;
        
        // Style the button (Black and Yellow)
        Object.assign(btn.style, {
            backgroundColor: '#000000',
            color: '#eab308',
            fontWeight: '900',
            padding: '8px 14px',
            borderRadius: '30px',
            border: '2px solid #eab308',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            fontSize: '13px',
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

        // Handle Click
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // Find the currently active/visible image in the carousel
            const activeItem = document.querySelector('li[data-carousel-pane]:not(.wt-display-none)');
            let targetImgUrl = '';
            
            if (activeItem) {
                const imgEl = activeItem.querySelector('img');
                if (imgEl) {
                    targetImgUrl = imgEl.getAttribute('data-src-zoom-image') || imgEl.src;
                }
            } else {
                const fallbackImg = imageWrapper.querySelector('img[data-src-zoom-image]');
                if (fallbackImg) targetImgUrl = fallbackImg.getAttribute('data-src-zoom-image');
                else {
                    const anyImg = imageWrapper.querySelector('img');
                    if (anyImg) targetImgUrl = anyImg.src;
                }
            }

            if (!targetImgUrl) {
                alert("Could not locate the high-res image on this page!");
                return;
            }

            // Show loading state
            const originalText = btn.innerHTML;
            btn.innerHTML = '⏳';
            btn.disabled = true;
            btn.style.opacity = '0.8';

            const title = document.querySelector('h1[data-buy-box-listing-title]')?.textContent?.trim() || document.title;

            // Send payload to background.js
            chrome.runtime.sendMessage({
                type: 'REINVENT_ARTWORK',
                payload: {
                    imageUrl: targetImgUrl,
                    pinId: 'etsy_' + Date.now(),
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
    imageWrapper.appendChild(btnContainer);
}

// Etsy is sometimes a Single Page App (SPA), so we need to observe DOM changes to ensure
// the button is injected even if navigating between products without full page reloads.
const observer = new MutationObserver((mutations) => {
    // Only try to inject if we're on a listing page
    if (window.location.pathname.includes('/listing/')) {
        injectEtsyButton();
    }
});

// Start observing
observer.observe(document.body, { childList: true, subtree: true });

// Run once immediately on load
if (window.location.pathname.includes('/listing/')) {
    setTimeout(injectEtsyButton, 1000); // Give the DOM a second to construct the carousel
}
