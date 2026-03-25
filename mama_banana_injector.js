// mama_banana_injector.js
// Runs on http://localhost:5173/ and parses payload into the React app

let handoffInProgress = false;

function attemptHandoff() {
    if (handoffInProgress) {
        console.log("🎨 Mama Banana Bridge: Handoff already in progress, skipping duplicate trigger.");
        return;
    }

    chrome.storage.local.get(['mb_inject_payload'], (result) => {
        const payload = result.mb_inject_payload;
        if (payload && payload.image) {
            if (handoffInProgress) return; // Double-check after async get
            handoffInProgress = true;

            console.log("🎨 Mama Banana Bridge: Found reinvent payload! Dispatching...");

            // Dispatch a message to the React window
            window.postMessage({
                type: 'MB_AUTO_GENERATE',
                payload: payload
            }, '*');

            // We NO LONGER delete it here. We wait for React to acknowledge it first.
        }
    });
}

// Check on load
attemptHandoff();

// Listen for App signals and custom triggers
window.addEventListener('message', (event) => {
    // If React tells us it successfully received the payload, WE CAN FINALLY DELETE IT safely.
    if (event.data && event.data.type === 'MB_PAYLOAD_RECEIVED_ACK') {
        console.log("🎨 Mama Banana Bridge: Payload securely received by React! Clearing storage.");
        chrome.storage.local.remove('mb_inject_payload');
        handoffInProgress = false; // Reset guard for next payload
    }

    // If React just mounted and says it's ready, we attempt handoff again.
    if (event.data && event.data.type === 'MB_APP_READY') {
        attemptHandoff();
    }
});

// Listen for forced checks (useful if the tab is already open and we just focus it)
window.addEventListener('MB_CHECK_STORAGE', () => {
    attemptHandoff();
});

// Also listen for storage changes directly (works across tabs)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.mb_inject_payload && changes.mb_inject_payload.newValue) {
        attemptHandoff();
    }
});
