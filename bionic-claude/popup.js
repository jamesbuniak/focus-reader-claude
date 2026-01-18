const SAMPLE_TEXT = "This is how your text will look with these settings applied to Claude.";

const DEFAULTS = {
  boldRatio: 50,
  fontWeight: 800,
  enabled: true,
  fontFamily: 'default',
  lineHeight: 1.7,
  letterSpacing: 0,
  wordSpacing: 0
};

// Elements
const ratioSlider = document.getElementById('ratioSlider');
const ratioValue = document.getElementById('ratioValue');
const weightSlider = document.getElementById('weightSlider');
const weightValue = document.getElementById('weightValue');
const enabledToggle = document.getElementById('enabledToggle');
const fontSelect = document.getElementById('fontSelect');
const lineHeightSlider = document.getElementById('lineHeightSlider');
const lineHeightValue = document.getElementById('lineHeightValue');
const kerningSlider = document.getElementById('kerningSlider');
const kerningValue = document.getElementById('kerningValue');
const wordSpacingSlider = document.getElementById('wordSpacingSlider');
const wordSpacingValue = document.getElementById('wordSpacingValue');
const preview = document.getElementById('previewText');
const previewContainer = document.getElementById('preview');
const applyBtn = document.getElementById('applyBtn');
const resetBtn = document.getElementById('resetBtn');

// Convert word to bionic format
function toBionic(word, ratio, weight) {
  if (!word || !/[a-zA-Z]/.test(word)) return word;
  
  // If ratio is 0, no bionic effect
  if (ratio === 0) return word;
  
  const len = word.length;
  if (len <= 3) {
    return `<b style="font-weight:${weight}">${word}</b>`;
  }
  
  let boldLen = Math.ceil(len * ratio);
  boldLen = Math.max(boldLen, 1);
  boldLen = Math.min(boldLen, len);
  
  const boldPart = word.substring(0, boldLen);
  const normalPart = word.substring(boldLen);
  
  return `<b style="font-weight:${weight}">${boldPart}</b>${normalPart}`;
}

// Update preview
function updatePreview() {
  const ratio = ratioSlider.value / 100;
  const weight = weightSlider.value;
  const font = fontSelect.value;
  const lineHeight = lineHeightSlider.value;
  const letterSpacing = kerningSlider.value;
  const wordSpacing = wordSpacingSlider.value;
  
  // Apply typography to preview container
  if (font !== 'default') {
    previewContainer.style.fontFamily = font;
  } else {
    previewContainer.style.fontFamily = '';
  }
  previewContainer.style.lineHeight = lineHeight;
  previewContainer.style.letterSpacing = letterSpacing + 'px';
  previewContainer.style.wordSpacing = wordSpacing + 'px';
  
  // Process text with bionic
  const words = SAMPLE_TEXT.split(/(\s+)/);
  const processed = words.map(w => {
    if (/^\s+$/.test(w)) return w;
    return toBionic(w, ratio, weight);
  }).join('');
  
  preview.innerHTML = processed;
}

// Load saved settings
async function loadSettings() {
  const result = await chrome.storage.sync.get(DEFAULTS);
  
  ratioSlider.value = result.boldRatio;
  ratioValue.textContent = result.boldRatio + '%';
  
  weightSlider.value = result.fontWeight;
  weightValue.textContent = result.fontWeight;
  
  enabledToggle.checked = result.enabled;
  
  fontSelect.value = result.fontFamily;
  
  lineHeightSlider.value = result.lineHeight;
  lineHeightValue.textContent = result.lineHeight;
  
  kerningSlider.value = result.letterSpacing;
  kerningValue.textContent = result.letterSpacing + 'px';
  
  wordSpacingSlider.value = result.wordSpacing;
  wordSpacingValue.textContent = result.wordSpacing + 'px';
  
  updatePreview();
}

// Save settings
async function saveSettings() {
  await chrome.storage.sync.set({
    boldRatio: parseInt(ratioSlider.value),
    fontWeight: parseInt(weightSlider.value),
    enabled: enabledToggle.checked,
    fontFamily: fontSelect.value,
    lineHeight: parseFloat(lineHeightSlider.value),
    letterSpacing: parseFloat(kerningSlider.value),
    wordSpacing: parseFloat(wordSpacingSlider.value)
  });
}

// Event listeners for sliders
ratioSlider.addEventListener('input', () => {
  ratioValue.textContent = ratioSlider.value + '%';
  updatePreview();
});

weightSlider.addEventListener('input', () => {
  weightValue.textContent = weightSlider.value;
  updatePreview();
});

lineHeightSlider.addEventListener('input', () => {
  lineHeightValue.textContent = lineHeightSlider.value;
  updatePreview();
});

kerningSlider.addEventListener('input', () => {
  kerningValue.textContent = kerningSlider.value + 'px';
  updatePreview();
});

wordSpacingSlider.addEventListener('input', () => {
  wordSpacingValue.textContent = wordSpacingSlider.value + 'px';
  updatePreview();
});

fontSelect.addEventListener('change', () => {
  updatePreview();
});

// Save on change
ratioSlider.addEventListener('change', saveSettings);
weightSlider.addEventListener('change', saveSettings);
enabledToggle.addEventListener('change', saveSettings);
fontSelect.addEventListener('change', saveSettings);
lineHeightSlider.addEventListener('change', saveSettings);
kerningSlider.addEventListener('change', saveSettings);
wordSpacingSlider.addEventListener('change', saveSettings);

// Apply button
applyBtn.addEventListener('click', async () => {
  await saveSettings();
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url.includes('claude.ai')) {
    chrome.tabs.reload(tab.id);
  }
  window.close();
});

// Reset button
resetBtn.addEventListener('click', async () => {
  await chrome.storage.sync.set(DEFAULTS);
  await loadSettings();
});

// Initialize
loadSettings();
