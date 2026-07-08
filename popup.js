// popup.js — ONECLICKART.AI Side Panel Logic

// ── EASY-TO-REPLACE SLIDER PROMPTS ───────────────────────────
const SLIDER_PROMPTS = {
    1: `Recreate the same exact image without modifications. Only adjust the aspect ratio accordingly.
[QUALITY OVERRIDE: 8K & CRISP] Ignore all pixelation, blur, or compression artefacts from the reference. Render the new image from scratch with pristine, 8K-quality detail and surgically sharp edges. 
[IGNORE STAGING] Focus EXCLUSIVELY on the flat artwork itself. (IF RELEVANT) Ignore the room, furniture, frames, or lighting in the photo. The final image should be a digital artwork, not in a mockup. NO FRAMES OR BORDERS OF ANY KIND. 
[MULTI-PANEL RULE] If the reference art is split across canvases, ignore the splits. Generate ONE seamless, continuous image.`,

    2: `Analyse the DNA, STYLE and CONCEPT of the reference image and give me a reinvented image that looks DIFFERENT but with the same concept, and painting  technique and style IS EXACTLY THE SAME.
Avoid: all digital characteristics, no 3D rendering, no smooth gradients, no CGI effects, no plastic textures, no cartoon style images.
[QUALITY OVERRIDE: 8K & CRISP] Ignore all pixelation, blur, or compression artifacts from the reference. Render the new image from scratch with pristine, 8K-quality detail and surgically sharp edges. 
[IGNORE STAGING] Focus EXCLUSIVELY on the flat artwork itself. (IF RELEVANT) Ignore the room, furniture, frames, or lighting in the photo. The final image should be a digital artwork, not in a mockup. NO FRAMES OR BORDERS OF ANY KIND. 
[MULTI-PANEL RULE] If the reference art is split across canvases, ignore the splits. Generate ONE seamless, continuous image.`,

    3: `Use this image as Reference ONLY. Make a variation of this image. DO NOT COPY IT -  MAKE the Version 3
Use the same STYLE and CONCEPT as inspiration to recreate a completely different variation. make sure that the style IS EXACTLY THE SAME.
[QUALITY OVERRIDE: 8K & CRISP] Ignore all pixelation, blur, or compression artifacts from the reference. Render the new image from scratch with pristine, 8K-quality detail and surgically sharp edges. 
[IGNORE STAGING] Focus EXCLUSIVELY on the flat artwork itself. (IF RELEVANT) Ignore the room, furniture, frames, or lighting in the photo. The final image should be a digital artwork, not in a mockup. NO FRAMES OR BORDERS OF ANY KIND. 
[MULTI-PANEL RULE] If the reference art is split across canvases, ignore the splits. Generate ONE seamless, continuous image.`,

    4: `[CORE MISSION: REINVENT] Analyze the uploaded artwork for its concept and style ONLY. DO NOT duplicate it. Completely REINVENT the piece into a brand-new, unique composition with a different layout, acting as a new original artwork in the same collection. [QUALITY OVERRIDE: 8K & CRISP] Ignore all pixelation, blur, or compression artifacts in the reference. Render the new image from scratch with pristine, 8K-quality detail and surgically sharp edges. Textures must be crisp and highly defined. NO digital noise, jagged edges, or artifacts. [IGNORE STAGING] Focus EXCLUSIVELY on the flat printed artwork. Completely ignore the room, furniture, canvas frames, borders, mounting, or lighting. [MULTI-PANEL RULE] If the reference art is split across multiple panels or canvases, ignore the splits. Generate the new artwork as ONE single, seamless, continuous image.`
};

// ── EASY-TO-REPLACE STYLE CONFIGURATION ──────────────────────
// Drop any image matching "styles/[id].webp" into the styles folder to auto-link!
const STYLES = [
    {
        id: "none",
        name: "Original Style",
        prompt: ""
    },
    {
        id: "vintage_sumi_e",
        name: "Vintage Sumi-e",
        prompt: "rendered in an antique monochromatic indigo ink wash painting style, aged, tea-stained, vertical paint drips, a vintage sepia palette with deep black silhouettes, and high contrast against a glowing, misty negative space, inspired by classic East Asian 'Shanshui' and 'Sumi-e' art. ***full bleed, edge-to-edge print, no borders, no margins, macro texture shot."
    },
    {
        id: "boneless_brushwork",
        name: "Boneless brushwork",
        prompt: "rendered in a traditional East Asian ink and wash painting style, utilizing the 'Mogu' boneless technique with fluid, expressive watercolor brushstrokes, broad sweeping gestures, bold black ink washes, and minimal fine-line detailing, characterized by high-contrast ink splatters, a vibrant color wash blended with stark black gradients, and an elegant, minimalist aesthetic inspired by classic Xieyi fine art."
    },
    {
        id: "fluid_watercolor",
        name: "Fluid Watercolor",
        prompt: "rendered in a contemporary fine art watercolor style, featuring highly saturated wet-on-wet paint bleeding, soft edges, luminous translucent layers, organic pooling pigments, and delicate, splattered paint droplets, with an elegant balance of loose, bleeding color washes and sharp, finely detailed focal points, emphasizing depth and emotional atmosphere through light reflection."
    },
    {
        id: "ink_sketchbook",
        name: "Ink Sketchbook",
        prompt: "rendered in a minimalist high-fashion gestural illustration style, featuring quick, loose, and expressive ink brushstrokes with a dry-brush texture, thin elegant wire-frame calligraphic linework, a clean minimalist aesthetic with a solid plain background, and bold, flat abstract marker accents providing minimal color depth without shading."
    },
    {
        id: "liquid_oil",
        name: "Liquid Oil",
        prompt: "rendered in a contemporary fine art oil painting style, featuring smooth, creamy, and fluid brushwork with soft, blended gradients, flat paint applications, broad gestural streaks, high-contrast dramatic lighting, deep cast shadows obscuring key details, and fine vertical liquid paint drips cutting through the lower canvas."
    },
    {
        id: "alla_prima",
        name: "Alla Prima",
        prompt: "rendered in a classical impressionist oil painting style in the manner of Richard Schmid, Bob Kuhn, and John Singer Sargent, featuring visible, multi-directional short dabs and feathered brushstrokes, an organic blending of earth tones with dramatic chiaroscuro lighting, subtle visible canvas texture underneath, and a soft-focus abstract background that bleeds into the main subject with loose, painterly edge control."
    },
    {
        id: "charcoal_sketch",
        name: "Charcoal Sketch",
        prompt: "Rendered as a highly detailed hand-drawn charcoal sketch on rough textured sketch paper, with rich smudge gradients, deep graphite shadows, hand-sketched lines, and artistic high-contrast values."
    }
];

// ── Slider Labels for UI Subtext ──────────────────────────────
const SLIDER_LABELS = {
    1: "Slider 1: Exact recreation with aspect ratio adjust only",
    2: "Slider 2: Keep exact style/concept but different composition",
    3: "Slider 3: Recreate complete variation with style as inspiration",
    4: "Slider 4: Full creative reinvention of composition/layout"
};

// ── Element Selectors ────────────────────────────────────────
const promptInput = document.getElementById('prompt-input');
const modelSelect = document.getElementById('model-select');
const saveBtn = document.getElementById('save-btn');
const statusMsg = document.getElementById('status-msg');
const sliderBtns = document.querySelectorAll('.slider-btn');
const sliderDesc = document.getElementById('slider-desc');
const stylesGrid = document.getElementById('styles-grid');
const countBtns = document.querySelectorAll('.count-btn');
const hoverToggle = document.getElementById('extensionToggle');

// ── State Variables ──────────────────────────────────────────
let selectedSlide = 2; // Default to Slider 2
let selectedStyle = "none"; // Default to Original Style
let selectedCount = 1;

// ── Render Dynamic Styles Grid ───────────────────────────────
function renderStylesGrid(activeStyleId) {
    if (!stylesGrid) return;

    stylesGrid.innerHTML = STYLES.map(style => {
        const isActive = style.id === activeStyleId;
        // Search image named styles/[id].webp inside the extension folder
        const inlineBg = style.id === 'none' ? '' : `style="background-image: url('styles/${style.id}.webp')"`;
        return `
            <div class="style-card ${isActive ? 'active' : ''}" data-style="${style.id}">
                <div class="style-visual" ${inlineBg}></div>
                <span class="style-name">${style.name}</span>
            </div>
        `;
    }).join('');

    // Wire up event listeners
    const styleCards = stylesGrid.querySelectorAll('.style-card');
    styleCards.forEach(card => {
        card.addEventListener('click', () => {
            selectedStyle = card.getAttribute('data-style');
            updateStyleGridUI(selectedStyle);
        });
    });
}

function updateStyleGridUI(styleId) {
    const cards = stylesGrid.querySelectorAll('.style-card');
    cards.forEach(card => {
        const isActive = card.getAttribute('data-style') === styleId;
        card.classList.toggle('active', isActive);
    });
}

// ── Slider logic ─────────────────────────────────────────────
sliderBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        selectedSlide = parseInt(btn.getAttribute('data-slide'), 10);
        updateSliderUI(selectedSlide);
    });
});

function updateSliderUI(slideNum) {
    sliderBtns.forEach(btn => {
        const isActive = parseInt(btn.getAttribute('data-slide'), 10) === slideNum;
        btn.classList.toggle('active', isActive);
    });
    sliderDesc.textContent = SLIDER_LABELS[slideNum] || "";
}

// ── Image Count Logic ────────────────────────────────────────
countBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        selectedCount = parseInt(btn.getAttribute('data-count'), 10);
        updateCountUI(selectedCount);
    });
});

function updateCountUI(count) {
    countBtns.forEach(btn => {
        const isActive = parseInt(btn.getAttribute('data-count'), 10) === count;
        btn.classList.toggle('active', isActive);
    });
}

// ── Load Saved Settings ───────────────────────────────────────
chrome.storage.sync.get(['mb_model', 'mb_image_count', 'mb_user_custom_input', 'mb_selected_slider', 'mb_selected_style'], (data) => {
    // 1. Textbox starts empty by default unless there was an active temporary session custom input saved
    promptInput.value = data.mb_user_custom_input || "";

    // 2. Slider - default to 2
    selectedSlide = data.mb_selected_slider !== undefined ? data.mb_selected_slider : 2;
    updateSliderUI(selectedSlide);

    // 3. Render Styles Grid dynamically
    selectedStyle = data.mb_selected_style || "none";
    renderStylesGrid(selectedStyle);

    // 4. Model - default to "3.1"
    modelSelect.value = data.mb_model || "3.1";

    // 5. Image Count - default to 1
    selectedCount = data.mb_image_count || 1;
    updateCountUI(selectedCount);
});

// Load the master ON/OFF toggle state from chrome.storage.local
if (hoverToggle) {
    chrome.storage.local.get({ extensionEnabled: true }, (data) => {
        hoverToggle.checked = data.extensionEnabled !== false;
    });
}

// ── Hover Toggle Event Listener ──────────────────────────────
if (hoverToggle) {
    hoverToggle.addEventListener('change', () => {
        const enabled = hoverToggle.checked;
        chrome.storage.local.set({ extensionEnabled: enabled }, () => {
            if (chrome.runtime.lastError) {
                showStatus('❌ Failed to save: ' + chrome.runtime.lastError.message, 'error');
            } else {
                showStatus(enabled ? '✅ Hover overlays active' : '⏸ Hover overlays disabled', 'success');
            }
        });
    });
}

// ── Save Settings ─────────────────────────────────────────────
saveBtn.addEventListener('click', () => {
    const userText = promptInput.value.trim();
    const model = modelSelect.value;

    saveBtn.disabled = true;

    // Compile the final prompt string according to the spec:
    // [CUSTOMER PROMPT] + [STYLE PROMPT] + [VARIATION SLIDER PROMPT]
    const customPromptPart = userText ? `${userText}\n\n` : "";
    const activeStyleObj = STYLES.find(s => s.id === selectedStyle);
    const stylePromptPart = activeStyleObj && activeStyleObj.prompt ? `${activeStyleObj.prompt}\n\n` : "";
    const sliderPromptPart = SLIDER_PROMPTS[selectedSlide];

    const finalCompiledPrompt = `${customPromptPart}${stylePromptPart}${sliderPromptPart}`;

    // Sync save both the raw inputs (for restoring state in side panel UI) and the compiled final prompt for execution
    chrome.storage.sync.set({
        mb_model: model,
        mb_image_count: selectedCount,
        mb_user_custom_input: userText,
        mb_selected_slider: selectedSlide,
        mb_selected_style: selectedStyle,
        mb_prompt: finalCompiledPrompt // This is read by background.js and sent to Mama Banana / ONECLICKART
    }, () => {
        if (chrome.runtime.lastError) {
            showStatus('❌ Failed to save: ' + chrome.runtime.lastError.message, 'error');
        } else {
            showStatus('✅ Settings successfully applied!', 'success');
        }
        saveBtn.disabled = false;
    });
});

// ── Helper ────────────────────────────────────────────────────
function showStatus(message, type) {
    statusMsg.textContent = message;
    statusMsg.className = 'status-msg ' + type;
    clearTimeout(statusMsg._timer);
    statusMsg._timer = setTimeout(() => {
        statusMsg.className = 'status-msg hidden';
    }, 2500);
}
