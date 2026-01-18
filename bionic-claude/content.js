/**
 * Bionic Reading for Claude
 * Converts Claude's responses to bionic reading format
 * by bolding the first portion of each word for improved focus
 */

(function() {
  'use strict';

  // Configuration (defaults, will be overridden by stored settings)
  let CONFIG = {
    // Percentage of word to bold (0.5 = 50% of word)
    boldRatio: 0.50,
    // Font weight for bold portions
    fontWeight: 800,
    // Minimum characters to bold
    minBold: 1,
    // Words with this many chars or fewer get fully bolded
    shortWordThreshold: 3,
    // Debounce delay for mutation observer (ms)
    debounceDelay: 100,
    // Selector for Claude's response containers
    responseSelector: '.standard-markdown',
    // Elements to skip
    skipTags: new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'INPUT', 'SVG', 'MATH']),
    // Class to mark processed elements
    processedClass: 'bionic-processed',
    // Whether extension is enabled
    enabled: true,
    // Typography settings
    fontFamily: 'default',
    lineHeight: 1.7,
    letterSpacing: 0,
    wordSpacing: 0
  };

  /**
   * Load settings from storage
   */
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get({
        boldRatio: 50,
        fontWeight: 800,
        enabled: true,
        fontFamily: 'default',
        lineHeight: 1.7,
        letterSpacing: 0,
        wordSpacing: 0
      });
      
      CONFIG.boldRatio = result.boldRatio / 100;
      CONFIG.fontWeight = result.fontWeight;
      CONFIG.enabled = result.enabled;
      CONFIG.fontFamily = result.fontFamily;
      CONFIG.lineHeight = result.lineHeight;
      CONFIG.letterSpacing = result.letterSpacing;
      CONFIG.wordSpacing = result.wordSpacing;
      
      console.log('Focus Reader: Settings loaded', CONFIG);
    } catch (e) {
      console.log('Focus Reader: Using default settings');
    }
  }

  /**
   * Apply typography styles to response elements
   */
  function applyTypography(element) {
    if (CONFIG.fontFamily !== 'default') {
      element.style.fontFamily = CONFIG.fontFamily;
    }
    element.style.lineHeight = CONFIG.lineHeight;
    element.style.letterSpacing = CONFIG.letterSpacing + 'px';
    element.style.wordSpacing = CONFIG.wordSpacing + 'px';
  }

  /**
   * Inject Google Fonts
   */
  function injectFonts() {
    if (document.getElementById('focus-reader-fonts')) return;
    
    const link = document.createElement('link');
    link.id = 'focus-reader-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Inter:wght@400;700;800&family=Lexend:wght@400;700;800&family=Open+Sans:wght@400;700;800&family=Source+Sans+3:wght@400;700;800&family=JetBrains+Mono:wght@400;700;800&display=swap';
    document.head.appendChild(link);
  }

  /**
   * Convert a word to bionic format
   * @param {string} word - The word to convert
   * @returns {string} - HTML string with bolded portion
   */
  function toBionic(word) {
    if (!word || word.length === 0) return word;
    
    // Skip if it's just punctuation or numbers
    if (!/[a-zA-Z]/.test(word)) return word;
    
    // If ratio is 0, no bionic effect
    if (CONFIG.boldRatio === 0) return word;
    
    const len = word.length;
    
    // Short words get fully bolded
    if (len <= CONFIG.shortWordThreshold) {
      return `<b class="bionic-bold" style="font-weight:${CONFIG.fontWeight}">${word}</b>`;
    }
    
    // Calculate bold length
    let boldLen = Math.ceil(len * CONFIG.boldRatio);
    boldLen = Math.max(boldLen, CONFIG.minBold);
    boldLen = Math.min(boldLen, len);
    
    const boldPart = word.substring(0, boldLen);
    const normalPart = word.substring(boldLen);
    
    return `<b class="bionic-bold" style="font-weight:${CONFIG.fontWeight}">${boldPart}</b>${normalPart}`;
  }

  /**
   * Process text content and convert to bionic format
   * @param {string} text - The text to process
   * @returns {string} - HTML string with bionic formatting
   */
  function processText(text) {
    if (!text || text.trim().length === 0) return text;
    
    // Split by word boundaries while preserving whitespace and punctuation
    const parts = text.split(/(\s+|(?<=[a-zA-Z])(?=[^a-zA-Z\s])|(?<=[^a-zA-Z\s])(?=[a-zA-Z]))/);
    
    return parts.map(part => {
      // If it's whitespace, preserve it
      if (/^\s+$/.test(part)) return part;
      
      // If it's a word (contains letters), convert it
      if (/[a-zA-Z]/.test(part)) {
        // Handle words with punctuation attached
        const match = part.match(/^([^a-zA-Z]*)([a-zA-Z]+)([^a-zA-Z]*)$/);
        if (match) {
          const [, before, word, after] = match;
          return before + toBionic(word) + after;
        }
        return toBionic(part);
      }
      
      // Otherwise return as-is
      return part;
    }).join('');
  }

  /**
   * Process a text node
   * @param {Text} textNode - The text node to process
   */
  function processTextNode(textNode) {
    const text = textNode.textContent;
    if (!text || text.trim().length === 0) return;
    
    // Skip if parent is a tag we should skip
    let parent = textNode.parentElement;
    while (parent) {
      if (CONFIG.skipTags.has(parent.tagName)) return;
      if (parent.classList && parent.classList.contains('bionic-bold')) return;
      parent = parent.parentElement;
    }
    
    const processed = processText(text);
    if (processed === text) return;
    
    // Create a span to hold the processed content
    const span = document.createElement('span');
    span.className = 'bionic-text';
    span.innerHTML = processed;
    
    textNode.parentNode.replaceChild(span, textNode);
  }

  /**
   * Process an element and all its text nodes
   * @param {Element} element - The element to process
   */
  function processElement(element) {
    if (!element || element.classList?.contains(CONFIG.processedClass)) return;
    if (CONFIG.skipTags.has(element.tagName)) return;
    
    // Get all text nodes within the element
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip empty text nodes
          if (!node.textContent.trim()) return NodeFilter.FILTER_SKIP;
          
          // Skip if inside a skip tag
          let parent = node.parentElement;
          while (parent && parent !== element) {
            if (CONFIG.skipTags.has(parent.tagName)) return NodeFilter.FILTER_SKIP;
            if (parent.classList?.contains('bionic-text')) return NodeFilter.FILTER_SKIP;
            parent = parent.parentElement;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    // Process each text node
    textNodes.forEach(processTextNode);
    
    // Mark as processed
    if (element.classList) {
      element.classList.add(CONFIG.processedClass);
    }
  }

  /**
   * Find and process all Claude responses
   */
  function processAllResponses() {
    const responses = document.querySelectorAll(CONFIG.responseSelector);
    responses.forEach(response => {
      // Always apply typography
      applyTypography(response);
      
      // Apply bionic if ratio > 0
      if (CONFIG.boldRatio > 0 && !response.classList.contains(CONFIG.processedClass)) {
        processElement(response);
      }
    });
  }

  /**
   * Debounce function
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Debounced processor
  const debouncedProcess = debounce(processAllResponses, CONFIG.debounceDelay);

  /**
   * Set up mutation observer to catch new content
   */
  function setupObserver() {
    const observer = new MutationObserver((mutations) => {
      // Process on any mutation within response areas
      debouncedProcess();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    return observer;
  }
  
  /**
   * Reprocess all content periodically to catch post-stream renders
   */
  function setupPeriodicCheck() {
    setInterval(() => {
      // Remove processed class from all elements to allow reprocessing
      document.querySelectorAll('.' + CONFIG.processedClass).forEach(el => {
        // Check if content was replaced (no bionic-text inside)
        if (!el.querySelector('.bionic-text')) {
          el.classList.remove(CONFIG.processedClass);
        }
      });
      processAllResponses();
    }, 1000);
  }

  /**
   * Initialize the extension
   */
  async function init() {
    console.log('Focus Reader for Claude: Initializing...');
    
    // Load settings first
    await loadSettings();
    
    if (!CONFIG.enabled) {
      console.log('Focus Reader for Claude: Disabled');
      return;
    }
    
    // Inject Google Fonts
    injectFonts();
    
    // Process existing content
    processAllResponses();
    
    // Watch for new content
    setupObserver();
    
    // Periodic recheck for post-stream renders
    setupPeriodicCheck();
    
    // Also process on scroll (for lazy-loaded content)
    const debouncedScrollProcess = debounce(processAllResponses, 250);
    window.addEventListener('scroll', debouncedScrollProcess, { passive: true });
    
    console.log('Focus Reader for Claude: Ready');
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
