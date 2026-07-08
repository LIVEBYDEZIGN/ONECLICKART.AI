// background.js - Service worker for Pinterest Sort Extension

// Change this to your Netlify URL (e.g., "https://mama-banana.netlify.app/") if you want the extension to open the production version instead of local
const MAMA_BANANA_PRIMARY_URL = "https://mama-banana.netlify.app/";

// Default model and prompt — overridden by whatever the user saves in the popup
const DEFAULT_MODEL = '3.1';
const DEFAULT_PROMPT = `[CORE MISSION: VARIATION] Analyze the uploaded artwork. PRESERVE the core concept, main subject, and exact artistic style. DO NOT change the species, main character, or core identity of the design. Do not duplicate the image exactly 1:1. Render a fresh composition with a slightly different layout, pose, or framing, acting as a new original variant in the same art collection. [QUALITY OVERRIDE: 8K & CRISP] Ignore all pixelation, blur, or compression artifacts from the reference. Render the new image from scratch with pristine, 8K-quality detail and surgically sharp edges. [IGNORE STAGING] Focus EXCLUSIVELY on the flat artwork itself. Ignore the room, furniture, frames, or lighting in the photo. [MULTI-PANEL RULE] If the reference art is split across canvases, ignore the splits. Generate ONE seamless, continuous image.`;

// Convert image URL to Base64 blob and determine orientation
async function processImage(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();

        // Read image bitmap to get dimensions
        const bitmap = await createImageBitmap(blob);
        const width = bitmap.width;
        const height = bitmap.height;
        const isVertical = height > width;

        // Convert blob to base64 Data URL
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve({
                    base64: reader.result,
                    aspectRatio: isVertical ? 'Vertical' : 'Horizontal',
                    width: width,
                    height: height
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Failed to process image:", e);
        throw e;
    }
}

// Reusable reinvent execution handler
// Reusable reinvent execution handler
async function executeReinvent(imageUrl, title, targetOrientation, tabId, sendResponse) {
    try {
        const { base64, aspectRatio, width, height } = await processImage(imageUrl);

        // Enforce image size > 600px (either width or height >= 600)
        if (width < 600 && height < 600) {
            const errorMsg = `ONECLICKART.AI: Image is too small (${width}x${height}px). Reinvention requires at least one dimension to be 600px or larger.`;
            if (tabId) {
                try {
                    chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: (msg) => alert(msg),
                        args: [errorMsg]
                    }).catch(e => console.warn("Failed to inject size alert:", e));
                } catch (injectErr) {
                    console.warn("Failed to inject size alert:", injectErr);
                }
            }
            if (sendResponse) {
                try {
                    sendResponse({ success: false, error: "Image is too small" });
                } catch (sendErr) {
                    console.warn("Failed to send size error response:", sendErr);
                }
            }
            return;
        }

        // Read user-saved settings from popup; fall back to defaults if never set
        chrome.storage.sync.get(['mb_model', 'mb_prompt', 'mb_image_count'], (settings) => {
            const model      = settings.mb_model      || DEFAULT_MODEL;
            const imageCount = settings.mb_image_count || 1;
            const prompt     = settings.mb_prompt !== undefined && settings.mb_prompt !== ''
                                ? settings.mb_prompt
                                : DEFAULT_PROMPT;

            const payload = {
                image: base64,
                aspectRatio: targetOrientation || aspectRatio,
                prompt: prompt,
                model: model,
                imageCount: imageCount,
                timestamp: Date.now()
            };

            // Save payload to chrome local storage
            chrome.storage.local.set({ mb_inject_payload: payload }, () => {
                // See if Mama Banana is already open (check both localhost and netlify)
                chrome.tabs.query({}, (tabs) => {
                    const mbTabs = tabs.filter(t => t.url && (t.url.includes("localhost:3000") || t.url.includes("netlify.app") || t.url.includes("netlify.com") || t.url.includes("mama-banana")));

                    if (mbTabs.length > 0) {
                        const targetTab = mbTabs[0];
                        // Execute script to trigger the inject logic forcefully
                        try {
                            chrome.scripting.executeScript({
                                target: { tabId: targetTab.id },
                                func: () => {
                                    window.dispatchEvent(new CustomEvent('MB_CHECK_STORAGE'));
                                }
                            }).catch(e => console.warn("Failed to trigger inject logic forcefully:", e));
                        } catch (injectErr) {
                            console.warn("Failed to trigger inject logic forcefully:", injectErr);
                        }
                    } else {
                        // Open new tab in the foreground!
                        chrome.tabs.create({ url: MAMA_BANANA_PRIMARY_URL, active: true });
                    }
                });

                if (sendResponse) {
                    try {
                        sendResponse({ success: true });
                    } catch (sendErr) {
                        console.warn("Failed to send success response:", sendErr);
                    }
                }
            });
        });
    } catch (err) {
        console.error("Error creating payload", err);
        if (tabId) {
            try {
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: (msg) => alert(msg),
                    args: [`ONECLICKART.AI Error: Failed to process image. ${err.message}`]
                }).catch(e => console.warn("Failed to inject process error alert:", e));
            } catch (injectErr) {
                console.warn("Failed to inject process error alert:", injectErr);
            }
        }
        if (sendResponse) {
            try {
                sendResponse({ success: false, error: err.message });
            } catch (sendErr) {
                console.warn("Failed to send error response:", sendErr);
            }
        }
    }
}

// ── Context Menu Registration ────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "reinvent_vertical",
            title: "Reinvent as Vertical (2:3) 🍌",
            contexts: ["image"]
        });
        chrome.contextMenus.create({
            id: "reinvent_horizontal",
            title: "Reinvent as Horizontal (3:2) 🍌",
            contexts: ["image"]
        });
    });
    
    // Enable side panel when action is clicked
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'reinvent_vertical' || info.menuItemId === 'reinvent_horizontal') {
        const orientation = info.menuItemId === 'reinvent_vertical' ? 'Vertical' : 'Horizontal';
        executeReinvent(info.srcUrl, tab.title || 'web_image', orientation, tab.id, null);
    }
});

// ── Messaging Listener ───────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'REINVENT_ARTWORK') {
        const { imageUrl, title, targetOrientation } = message.payload;
        const tabId = sender.tab ? sender.tab.id : null;
        executeReinvent(imageUrl, title, targetOrientation, tabId, sendResponse);
        return true; // Keep channel open for async response
    }
});
