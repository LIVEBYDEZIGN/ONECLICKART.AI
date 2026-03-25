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
        const isVertical = bitmap.height > bitmap.width;

        // Convert blob to base64 Data URL
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve({
                    base64: reader.result,
                    aspectRatio: isVertical ? 'Vertical' : 'Horizontal'
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'REINVENT_ARTWORK') {
        const { imageUrl, title, targetOrientation } = message.payload;

        // Process async
        processImage(imageUrl).then(({ base64, aspectRatio }) => {
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
                    // Check if any tab is running Mama Banana (localhost or netlify domain)
                    const mbTabs = tabs.filter(t => t.url && (t.url.includes("localhost:3000") || t.url.includes("netlify.app") || t.url.includes("netlify.com") || t.url.includes("mama-banana")));

                    if (mbTabs.length > 0) {
                        const targetTab = mbTabs[0];
                        // Removed auto-focusing code here so it happens silently in the background!

                        // Execute script to trigger the inject logic forcefully incase the content script didn't catch storage update natively
                        chrome.scripting.executeScript({
                            target: { tabId: targetTab.id },
                            func: () => {
                                // Trigger a manual re-check in the content script context
                                window.dispatchEvent(new CustomEvent('MB_CHECK_STORAGE'));
                            }
                        });
                    } else {
                        // Open new tab in the background without focusing it
                        chrome.tabs.create({ url: MAMA_BANANA_PRIMARY_URL, active: false });
                    }
                });

                sendResponse({ success: true });
            });
            }); // end chrome.storage.sync.get

        }).catch(err => {
            console.error("Error creating payload", err);
            sendResponse({ success: false, error: err.message });
        });

        return true; // Keep channel open for async response
    }
});
