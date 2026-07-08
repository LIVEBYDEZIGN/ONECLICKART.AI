// generic_content.js - Content script for any webpage (excluding specific custom integrations)

(function () {
    // ── Exclusion Check ───────────────────────────────────────
    // Do not run this script on sites that already have custom Mama Banana integrations or Mama Banana itself
    const host = window.location.hostname.toLowerCase();
    const isExcluded = [
        "pinterest.com",
        "localhost",
        "127.0.0.1",
        "netlify.app",
        "netlify.com",
        "mama-banana"
    ].some(domain => host.includes(domain));

    if (isExcluded) {
        console.log(`[Mama Banana] Generic content script skipped for matched/excluded host: ${host}`);
        return;
    }

    let currentImageElement = null;
    let currentImageUrl = '';
    let hideTimeout = null;
    let container = null;
    let btn23 = null;
    let btn32 = null;

    let isExtensionEnabled = true;

    // Load initial state
    chrome.storage.local.get({ extensionEnabled: true }, (result) => {
        isExtensionEnabled = result.extensionEnabled;
        if (!isExtensionEnabled) {
            removeOverlay();
        }
    });

    // Listen for changes
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.extensionEnabled !== undefined) {
            isExtensionEnabled = changes.extensionEnabled.newValue;
            if (!isExtensionEnabled) {
                removeOverlay();
            }
        }
    });

    function removeOverlay() {
        if (container) {
            container.remove();
            container = null;
        }
        currentImageElement = null;
        currentImageUrl = '';
    }

    // ── Create Overlay Card ──────────────────────────────────
    function createOverlayCard() {
        if (container) return;

        container = document.createElement('div');
        container.className = 'mb-ratio-container';

        container.innerHTML = `
            <button class="mb-ratio-option mb-ratio-2-3" data-orientation="Vertical" title="Reinvent as Vertical (2:3)">2:3</button>
            <div class="mb-divider"></div>
            <button class="mb-ratio-option mb-ratio-3-2" data-orientation="Horizontal" title="Reinvent as Horizontal (3:2)">3:2</button>
        `;

        document.body.appendChild(container);

        btn23 = container.querySelector('.mb-ratio-2-3');
        btn32 = container.querySelector('.mb-ratio-3-2');

        // Setup event listeners for the card itself so it doesn't close on hover
        container.addEventListener('mouseenter', () => {
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }
        });

        container.addEventListener('mouseleave', () => {
            startHideTimeout();
        });

        // Setup click listeners
        [btn23, btn32].forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                triggerReinvent(btn);
            });
        });
    }

    // ── Trigger Reinvent Action ─────────────────────────────
    function triggerReinvent(clickedBtn) {
        if (!currentImageUrl) return;

        const orientation = clickedBtn.getAttribute('data-orientation');

        // Disable buttons & show loading state
        const originalText = clickedBtn.innerHTML;
        clickedBtn.innerHTML = '⏳';
        clickedBtn.classList.add('active', 'loading');
        btn23.disabled = true;
        btn32.disabled = true;

        const altText = currentImageElement.getAttribute('alt') || currentImageElement.getAttribute('title') || document.title;

        // Send payload to background.js
        chrome.runtime.sendMessage({
            type: 'REINVENT_ARTWORK',
            payload: {
                imageUrl: currentImageUrl,
                pinId: 'web_' + Date.now(),
                title: altText.trim(),
                targetOrientation: orientation
            }
        }, (response) => {
            // Wait slightly for smooth animation
            setTimeout(() => {
                clickedBtn.classList.remove('loading');
                clickedBtn.innerHTML = response && response.success ? '✅' : '❌';

                // Restore state after 2 seconds
                setTimeout(() => {
                    clickedBtn.innerHTML = originalText;
                    clickedBtn.classList.remove('active');
                    btn23.disabled = false;
                    btn32.disabled = false;
                }, 2000);
            }, 600);
        });
    }

    function showOverlayForElement(element, imageUrl) {
        if (!isExtensionEnabled) return;
        createOverlayCard(); // Ensure card exists

        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }

        currentImageElement = element;
        currentImageUrl = imageUrl;

        // Calculate absolute position
        const rect = element.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        // Place inside top-left corner of the element with a 12px offset
        const top = rect.top + scrollTop + 12;
        const left = rect.left + scrollLeft + 12;

        container.style.top = `${top}px`;
        container.style.left = `${left}px`;
        container.classList.add('visible');
    }

    // ── Hide Overlay Timeout Management ──────────────────────
    function startHideTimeout() {
        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            if (container) {
                container.classList.remove('visible');
            }
            currentImageElement = null;
            currentImageUrl = '';
        }, 350);
    }

    // ── Helper to find an image in/near the hovered element ────
    function findNearbyImageAndUrl(target) {
        // 1. Direct IMG check
        if (target.tagName === 'IMG') {
            return { element: target, url: target.currentSrc || target.src };
        }

        // 2. Check if target itself has a background image style
        const bg = window.getComputedStyle(target).backgroundImage;
        if (bg && bg !== 'none' && bg.startsWith('url(')) {
            const match = bg.match(/url\((['"]?)(.*?)\1\)/);
            if (match && match[2]) {
                return { element: target, url: match[2] };
            }
        }

        // 3. Search direct children for an IMG tag
        let img = target.querySelector('img');
        if (img) {
            return { element: img, url: img.currentSrc || img.src };
        }

        // 4. Walk up parent elements (up to 3 levels) and look for an IMG tag in their descendants
        let current = target.parentElement;
        let depth = 0;
        while (current && depth < 3) {
            // Avoid crossing into high-level global containers
            if (current.tagName === 'BODY' || current.tagName === 'HTML') break;

            let imgInParent = current.querySelector('img');
            if (imgInParent) {
                return { element: imgInParent, url: imgInParent.currentSrc || imgInParent.src };
            }
            current = current.parentElement;
            depth++;
        }

        return null;
    }

    document.addEventListener('mouseover', (e) => {
        if (!isExtensionEnabled) return;
        let target = e.target;
        if (!target) return;

        // Skip if the hovered element is inside our overlay card
        if (container && (container === target || container.contains(target))) {
            return;
        }

        const match = findNearbyImageAndUrl(target);

        if (match && match.element && match.url) {
            const { element, url } = match;
            let width = 0;
            let height = 0;

            if (element.tagName === 'IMG') {
                width = element.naturalWidth || element.width || 0;
                height = element.naturalHeight || element.height || 0;
            } else {
                width = element.clientWidth || 0;
                height = element.clientHeight || 0;
            }

            // High-res check: must be >= 600px in either width or height
            if (Math.max(width, height) >= 600) {
                // If it is a nearby image, position the overlay relative to the image
                showOverlayForElement(element, url);
                return;
            }
        }

        // Otherwise, start the hide timer
        startHideTimeout();
    }, { passive: true });

    console.log('[Mama Banana] Generic content script initialized successfully.');
})();
