# Chrome Web Store Listing — ONECLICKART.AI

> Last Updated: 2026-07-08

This document serves as the single source of truth for the ONECLICKART.AI Chrome Web Store listing. You can copy and paste the values below directly into the Chrome Developer Dashboard.

---

## Store Listing

**Extension Name**  
ONECLICKART.AI

**Short Description**  
AI-powered artwork variant creator for Pinterest, Etsy, Midjourney, and any site. Seamlessly reinvent images on hover!

**Detailed Description**  
ONECLICKART.AI is an AI-powered assistant that lets you easily recreate and reinvent existing artworks. Designed for digital artists, print-on-demand creators, and designers, it adds a sleek overlay on images to quickly generate horizontal or vertical variants using the Mama Banana platform.

Features:
- Hover Overlay: Hover over any high-resolution image (600px+) on the web to instantly see vertical (2:3) or horizontal (3:2) creation options.
- Multi-Platform Support: Seamlessly integrates with Pinterest, Etsy, Midjourney, Displate, and more.
- Pinterest Sorter: On Pinterest, collect pins in the background and sort them by engagement (saves, repins, comments, shares, reactions) to identify viral trends, then generate variations.
- Master Toggle: Need to disable the overlays temporarily? Turn the extension ON/OFF with a simple switch in the side panel.

How to use:
1. Pin/Open the extension to configure your API key.
2. Visit any site (Etsy, Displate, Midjourney, etc.) and hover over an artwork.
3. Click "2:3" or "3:2" to send the image to the Mama Banana app for automatic AI regeneration.
4. On Pinterest, use the floating "Pin Sorter" panel to collect and sort pins.

Privacy & Security:
We respect your privacy. No personal user data is collected. The extension only processes images you select to send to your Mama Banana account.

**Category**  
Productivity / Developer Tools

**Single Purpose**  
Generates creative AI variations of web images by sending selected image URLs to the Mama Banana React app.

**Primary Language**  
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ⬜ Not created | Omit or use 128x128 crop of `favicon.png` |
| Screenshot 1 (Popup) | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 (Hover) | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 3 (Sorter) | 1280×800 or 640×400 | ⬜ Not created | |

---

## Permissions Justification

The Google review team requires detailed justifications for all permissions. Paste these descriptions into the dashboard:

| Permission | Type | Justification |
|------------|------|---------------|
| `activeTab` | permission | Grants temporary access to the active tab to execute standard content scripts safely when the extension action is clicked. |
| `tabs` | permission | Used in the background script to detect if the Mama Banana web dashboard is already open, allowing the extension to update/focus the existing tab instead of repeatedly opening new ones. |
| `storage` | permission | Required to store user settings (API keys, selected model, image count) and the master ON/OFF toggle state locally in the browser. |
| `downloads` | permission | Used on Pinterest pages to let the user download the original high-resolution image directly from the Sorter dashboard. |
| `scripting` | permission | Allows the background script to safely inject user alerts or notifications in response to image validation errors (e.g. image too small). |
| `contextMenus` | permission | Registers the "Reinvent as Vertical (2:3)" and "Reinvent as Horizontal (3:2)" items in the browser context menu when right-clicking any image. |
| `sidePanel` | permission | Enables the side panel layout for user settings, models, custom prompts, and toggle options. |
| `host_permissions` (`*://*.pinterest.com/*`, `*://*.etsy.com/*`, `*://*.midjourney.com/*`, `*://*.displate.com/*`) | host_permission | Required to inject content scripts to fetch image details, show hover overlays, or collect engagement analytics (Pinterest). |
| `<all_urls>` | host_permission | Enables the universal hover script (`generic_content.js`) to detect large images on other websites so users can reinvent artwork anywhere. |

---

## Privacy & Data Use

### Data Collection
**Does the extension collect user data?** No

*Note: Since the extension only transmits selected image URLs to the user's Netlify/localhost website for creation purposes and does not harvest or track user info, data collection is marked "No".*

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy

**Privacy Policy URL**  
*Provide a URL to your privacy policy (can be hosted on GitHub Pages, your personal site, or Netlify).*

### Privacy Policy Draft
> **ONECLICKART.AI PRIVACY POLICY**
> 
> Last Updated: 2026-07-08
> 
> **1. Information Collection and Use**
> ONECLICKART.AI does not collect, store, or transmit any personally identifiable user data. All configuration settings (such as API keys and generation preferences) are stored strictly on your local browser storage.
> 
> **2. Third-Party Transmission**
> When you choose to click the "2:3" or "3:2" buttons on an image overlay, the extension converts or uses the image URL to pass it to the Mama Banana app (at your specified localhost or hosted Netlify domain). This is done solely to facilitate image variation generation. No data is stored or logged by the extension author.
> 
> **3. Permissions**
> The extension requests permissions like `storage`, `downloads`, `contextMenus`, and host access to provide features like saving settings, downloading images, showing context menus, and displaying hover overlays.
> 
> **4. Changes to This Policy**
> We may update our Privacy Policy from time to time. We encourage users to check this page periodically for changes.

---

## Distribution

**Visibility**: Public (recommended) or Unlisted (only people with the link can install)  
**Regions**: All regions  
**Pricing**: Free  

---

## Developer Info

**Publisher Name**: *[Enter Your Name / Company]*  
**Contact Email**: *[Enter Your Public Email]*  
**Support Email**: *[Enter Support Email]*  

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0 | 2026-07-08 | Initial production release with unified hover overlay, master ON/OFF toggle, and Pinterest Sorter. | Draft |
