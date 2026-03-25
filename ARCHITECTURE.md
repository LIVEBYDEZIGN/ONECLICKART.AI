# PinSorter & Mama Banana Bridge - Architecture Guide

## 🚀 Overview
This Chrome Extension was originally designed to sort Pinterest pins by metrics (saves, repins, etc.), but it has been heavily extended to serve as a **secure one-click bridge** to the Mama Banana web application. 

It allows users to send high-resolution artwork directly from Pinterest and Etsy into Mama Banana to be "reinvented" by Gemini 3.1 AI models.

## 🏗️ Architecture & Data Flow
Because Mama Banana is a purely client-side React app without a backend database, the extension communicates with it securely through the browser's local storage and window messages.

1. **Platform Injection (`content.js`, `etsy_content.js`)**
   - Injects two specific buttons: "Vertical 🚀" and "Horizontal 🚀".
   - Uses strict Mama Banana branding: Background `#000000`, Text/Border `#eab308`.
   - On Etsy, it specifically targets the `data-src-zoom-image` attribute to bypass thumbnails and rip the absolute highest-resolution image available.
2. **Payload Construction (`background.js`)**
   - Converts the target image URL into a Base64 string via a `fetch` request.
   - Attaches a strict `PROMPT` dedicated to creative reinvention and avoiding artifacts.
   - Enforces a default model (e.g., `gemini-3.1-flash-image-preview`).
   - Writes the payload object to `chrome.storage.local` under the key `mb_inject_payload`.
3. **Smart Tab Management (`background.js`)**
   - Scans open Chrome tabs for any URL containing `localhost:3000` or `netlify.app`. 
   - If found, it routes the payload there. If not, it silently creates a new background tab pointing to the `MAMA_BANANA_PRIMARY_URL` (production Netlify).
4. **The Handshake (`mama_banana_injector.js`)**
   - This content script is injected *into* the Mama Banana web page itself.
   - It waits for the React app to broadcast `{ type: 'MB_APP_READY' }` via `window.postMessage`.
   - It securely fires the payload into the React app.
   - It waits for the React app to broadcast `{ type: 'MB_PAYLOAD_RECEIVED_ACK' }` before deleting the payload from `chrome.storage.local` to prevent race conditions.

## 🤖 Directives for Future AI Assistants
- **Modifying the Bridge:** If the user requests a change to the default prompt, model, or URL, you only need to modify `background.js`. 
- **Adding New Platforms:** If the user wants to add a new website (e.g., Amazon, Shopify), you must:
  1. Create a new `[platform]_content.js` script pointing to the high-res image container.
  2. Implement the "Vertical" and "Horizontal" `#eab308` branded buttons.
  3. Register the script and the host URLs in `manifest.json`.
- **Race Conditions:** Do not delete payloads from `chrome.storage.local` without ensuring the `MB_PAYLOAD_RECEIVED_ACK` has been received. React state is asynchronous and requires this handshake.
