// popup.js — Mama Banana settings popup

const DEFAULT_MODEL       = '3.1';
const DEFAULT_IMAGE_COUNT = 1;
const DEFAULT_PROMPT = `[CORE MISSION: VARIATION] Analyze the uploaded artwork. PRESERVE the core concept, main subject, and exact artistic style. DO NOT change the species, main character, or core identity of the design. Do not duplicate the image exactly 1:1. Render a fresh composition with a slightly different layout, pose, or framing, acting as a new original variant in the same art collection. [QUALITY OVERRIDE: 8K & CRISP] Ignore all pixelation, blur, or compression artifacts from the reference. Render the new image from scratch with pristine, 8K-quality detail and surgically sharp edges. [IGNORE STAGING] Focus EXCLUSIVELY on the flat artwork itself. Ignore the room, furniture, frames, or lighting in the photo. [MULTI-PANEL RULE] If the reference art is split across canvases, ignore the splits. Generate ONE seamless, continuous image.`;

const modelSelect  = document.getElementById('model-select');
const promptInput  = document.getElementById('prompt-input');
const saveBtn      = document.getElementById('save-btn');
const statusMsg    = document.getElementById('status-msg');
const countBtns    = document.querySelectorAll('.count-btn');

let selectedCount = DEFAULT_IMAGE_COUNT;

// ── Image count button logic ──────────────────────────────────
countBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        selectedCount = parseInt(btn.getAttribute('data-count'), 10);
        updateCountButtons(selectedCount);
    });
});

function updateCountButtons(count) {
    countBtns.forEach(btn => {
        const isActive = parseInt(btn.getAttribute('data-count'), 10) === count;
        btn.classList.toggle('active', isActive);
    });
}

// ── Load saved settings ───────────────────────────────────────
chrome.storage.sync.get(['mb_model', 'mb_prompt', 'mb_image_count'], (data) => {
    modelSelect.value = data.mb_model || DEFAULT_MODEL;
    promptInput.value = data.mb_prompt !== undefined ? data.mb_prompt : DEFAULT_PROMPT;
    selectedCount = data.mb_image_count || DEFAULT_IMAGE_COUNT;
    updateCountButtons(selectedCount);
});

// ── Save settings ─────────────────────────────────────────────
saveBtn.addEventListener('click', () => {
    const model  = modelSelect.value;
    const prompt = promptInput.value.trim();

    saveBtn.disabled = true;

    chrome.storage.sync.set({ mb_model: model, mb_prompt: prompt, mb_image_count: selectedCount }, () => {
        if (chrome.runtime.lastError) {
            showStatus('❌ Failed to save: ' + chrome.runtime.lastError.message, 'error');
        } else {
            showStatus('✅ Settings saved!', 'success');
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
