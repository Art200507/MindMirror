/**
 * Simple, Reliable DOM Scanner for Chrome Extensions
 * Uses only proven, battle-tested browser APIs
 * NO complex algorithms - just what WORKS
 */

class SimpleDOMScanner {
  constructor() {
    this.cache = null;
    this.cacheTime = 0;
    this.CACHE_LIFETIME = 3000; // 3 seconds
  }

  /**
   * Main scan function - returns interactive elements
   */
  scan(options = {}) {
    console.log('[SimpleDOMScanner] Starting scan...');
    const startTime = performance.now();

    // Check cache
    if (options.useCache !== false && this.isCacheValid()) {
      console.log('[SimpleDOMScanner] Using cached results');
      return this.cache;
    }

    const maxElements = options.maxElements || 100;
    const elements = [];
    const seenElements = new Set(); // Prevent duplicates

    // Strategy 1: Get all interactive elements using simple selectors
    const selectors = [
      'button',
      'a[href]',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="tab"]',
      '[onclick]'
    ];

    for (const selector of selectors) {
      try {
        const found = document.querySelectorAll(selector);
        found.forEach(el => {
          if (!seenElements.has(el) && elements.length < maxElements) {
            seenElements.add(el);
            elements.push(el);
          }
        });
      } catch (e) {
        console.warn('[SimpleDOMScanner] Selector failed:', selector, e);
      }
    }

    console.log(`[SimpleDOMScanner] Found ${elements.length} interactive elements`);

    // Process elements into data format
    const results = elements
      .map((el, index) => this.extractElementData(el, index))
      .filter(data => data !== null && data.visible);

    const endTime = performance.now();
    console.log(`[SimpleDOMScanner] Scan complete in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`[SimpleDOMScanner] Returning ${results.length} visible elements`);

    // Cache results
    this.cache = results;
    this.cacheTime = Date.now();

    return results;
  }

  /**
   * Extract data from a single element
   */
  extractElementData(element, index) {
    try {
      // Get bounding box
      const rect = element.getBoundingClientRect();

      // Check visibility
      const isVisible = rect.width > 0 &&
                       rect.height > 0 &&
                       rect.top < window.innerHeight &&
                       rect.bottom > 0;

      if (!isVisible) {
        return null; // Skip invisible elements early
      }

      // Get text content (limit to avoid huge strings)
      let text = '';
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        text = element.placeholder || element.value || '';
      } else {
        text = element.textContent?.trim().substring(0, 100) || '';
      }

      // Generate a working selector
      const selector = this.generateSelector(element);

      // Get element type and role
      const tagName = element.tagName.toLowerCase();
      const role = element.getAttribute('role') || this.getImpliedRole(tagName);

      return {
        id: this.generateId(element, index),
        selector: selector,
        text: text,
        type: tagName,
        role: role,
        visible: true,
        position: {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        },
        attributes: {
          id: element.id || null,
          class: element.className || null,
          'data-testid': element.getAttribute('data-testid'),
          'aria-label': element.getAttribute('aria-label'),
          name: element.getAttribute('name'),
          type: element.getAttribute('type')
        },
        // IMPORTANT: Store reference for highlighting
        __domRef: element
      };
    } catch (error) {
      console.warn('[SimpleDOMScanner] Error processing element:', error);
      return null;
    }
  }

  /**
   * Generate a reliable CSS selector
   */
  generateSelector(element) {
    // Try ID first (most reliable) - BUT must escape special characters!
    if (element.id) {
      try {
        // Escape ID to handle special characters like : [ ] ( ) etc.
        const escapedId = CSS.escape(element.id);
        const selector = `#${escapedId}`;
        // Test if selector works
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      } catch (e) {
        // Invalid ID, skip to next strategy
        console.warn('[SimpleDOMScanner] Invalid ID, skipping:', element.id);
      }
    }

    // Try data-testid (properly escaped)
    const testId = element.getAttribute('data-testid');
    if (testId) {
      try {
        return `[data-testid="${CSS.escape(testId)}"]`;
      } catch (e) {
        // Invalid, skip
      }
    }

    // Try aria-label (properly escaped)
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.length < 50) { // Limit length
      try {
        return `${element.tagName.toLowerCase()}[aria-label="${CSS.escape(ariaLabel)}"]`;
      } catch (e) {
        // Invalid, skip
      }
    }

    // Try name attribute (for inputs)
    const name = element.getAttribute('name');
    if (name) {
      try {
        return `${element.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
      } catch (e) {
        // Invalid, skip
      }
    }

    // Try class if unique (escape class name too)
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(/\s+/).filter(c => c);
      if (classes.length > 0) {
        try {
          const escapedClass = CSS.escape(classes[0]);
          const classSelector = `${element.tagName.toLowerCase()}.${escapedClass}`;
          if (document.querySelectorAll(classSelector).length === 1) {
            return classSelector;
          }
        } catch (e) {
          // Invalid class, skip
        }
      }
    }

    // Fallback: nth-of-type (safe, always works)
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === element.tagName
      );
      const index = siblings.indexOf(element) + 1;
      return `${element.tagName.toLowerCase()}:nth-of-type(${index})`;
    }

    return element.tagName.toLowerCase();
  }

  /**
   * Generate stable element ID
   */
  generateId(element, index) {
    if (element.id) return `id-${element.id}`;

    const testId = element.getAttribute('data-testid');
    if (testId) return `testid-${testId}`;

    const name = element.getAttribute('name');
    if (name) return `name-${name}`;

    return `elem-${index}`;
  }

  /**
   * Get implied ARIA role from tag name
   */
  getImpliedRole(tagName) {
    const roleMap = {
      'button': 'button',
      'a': 'link',
      'input': 'textbox',
      'select': 'listbox',
      'textarea': 'textbox'
    };
    return roleMap[tagName] || null;
  }

  /**
   * Check if cache is still valid
   */
  isCacheValid() {
    return this.cache && (Date.now() - this.cacheTime) < this.CACHE_LIFETIME;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache = null;
    this.cacheTime = 0;
  }
}

// Make globally available
window.SimpleDOMScanner = SimpleDOMScanner;

// Create instance
window.simpleScanner = new SimpleDOMScanner();

console.log('[SimpleDOMScanner] Loaded successfully ✓');
