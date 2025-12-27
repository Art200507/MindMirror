/**
 * Robust DOM Scanner for Complex Websites
 * Handles: SPAs, Shadow DOM, Dynamic Content, iFrames, Lazy Loading
 */

class RobustDOMScanner {
  constructor() {
    this.cache = null;
    this.cacheTime = 0;
    this.CACHE_LIFETIME = 2000; // 2 seconds for dynamic sites
    this.observingMutations = false;
    this.lastScanCount = 0;

    this.setupDynamicDetection();
  }

  /**
   * Main scan with retries for dynamic content
   */
  async scan(options = {}) {
    console.log('[RobustScanner] Starting comprehensive scan...');
    const startTime = performance.now();

    // Check cache
    if (options.useCache !== false && this.isCacheValid()) {
      console.log('[RobustScanner] Using cached results');
      return this.cache;
    }

    const maxElements = options.maxElements || 150;
    const includeHidden = options.includeHidden || false;

    // Strategy 1: Scan visible DOM
    let elements = this.scanVisibleDOM(maxElements);
    console.log(`[RobustScanner] Found ${elements.length} elements in visible DOM`);

    // Strategy 2: Wait for dynamic content if page seems to be loading
    if (this.isPageStillLoading()) {
      console.log('[RobustScanner] Waiting for dynamic content...');
      await this.waitForDynamicContent(1000);

      // Re-scan after waiting
      const newElements = this.scanVisibleDOM(maxElements);
      if (newElements.length > elements.length) {
        console.log(`[RobustScanner] Found ${newElements.length - elements.length} additional elements after waiting`);
        elements = newElements;
      }
    }

    // Strategy 3: Scan Shadow DOM (web components)
    if (options.includeShadowDOM !== false) {
      const shadowElements = this.scanShadowDOM();
      console.log(`[RobustScanner] Found ${shadowElements.length} elements in Shadow DOM`);
      elements = [...elements, ...shadowElements];
    }

    // Strategy 4: Scan iFrames (same-origin only)
    if (options.includeIframes !== false) {
      const iframeElements = this.scanIframes();
      console.log(`[RobustScanner] Found ${iframeElements.length} elements in iframes`);
      elements = [...elements, ...iframeElements];
    }

    // Remove duplicates
    elements = this.deduplicateElements(elements);
    console.log(`[RobustScanner] After deduplication: ${elements.length} unique elements`);

    // Process into data format
    const results = elements
      .slice(0, maxElements)
      .map((el, index) => this.extractElementData(el, index))
      .filter(data => data !== null);

    // Filter by visibility
    const visibleResults = includeHidden
      ? results
      : results.filter(r => r.visible);

    const endTime = performance.now();
    console.log(`[RobustScanner] Scan complete in ${(endTime - startTime).toFixed(2)}ms`);
    console.log(`[RobustScanner] Returning ${visibleResults.length} elements (${results.length - visibleResults.length} hidden filtered out)`);

    // Cache results
    this.cache = visibleResults;
    this.cacheTime = Date.now();
    this.lastScanCount = visibleResults.length;

    return visibleResults;
  }

  /**
   * Scan visible DOM using multiple strategies
   */
  scanVisibleDOM(maxElements) {
    const seenElements = new Set();
    const elements = [];

    // Strategy 1: Common interactive elements
    const interactiveSelectors = [
      'button',
      'a[href]',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="option"]',
      '[onclick]',
      '[ng-click]', // Angular
      '[v-on:click]', // Vue
      '[data-action]' // Common pattern
    ];

    for (const selector of interactiveSelectors) {
      try {
        const found = document.querySelectorAll(selector);
        found.forEach(el => {
          if (!seenElements.has(el) && elements.length < maxElements) {
            seenElements.add(el);
            elements.push(el);
          }
        });
      } catch (e) {
        console.warn('[RobustScanner] Selector failed:', selector, e);
      }
    }

    // Strategy 2: Elements with common action classes
    const actionClasses = [
      '[class*="btn"]',
      '[class*="button"]',
      '[class*="link"]',
      '[class*="clickable"]',
      '[class*="action"]',
      '[class*="submit"]',
      '[class*="cta"]'
    ];

    for (const selector of actionClasses) {
      try {
        const found = document.querySelectorAll(selector);
        found.forEach(el => {
          if (!seenElements.has(el) && elements.length < maxElements && this.looksInteractive(el)) {
            seenElements.add(el);
            elements.push(el);
          }
        });
      } catch (e) {
        // Ignore - invalid selector
      }
    }

    return elements;
  }

  /**
   * Scan Shadow DOM (web components)
   */
  scanShadowDOM() {
    const shadowElements = [];

    // Find all elements with shadow roots
    const walkTree = (root) => {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT,
        null
      );

      let node;
      while (node = walker.nextNode()) {
        if (node.shadowRoot) {
          // Found a shadow root - scan inside it
          const shadowInteractive = node.shadowRoot.querySelectorAll(
            'button, a[href], input, select, textarea, [role="button"]'
          );
          shadowElements.push(...Array.from(shadowInteractive));

          // Recursively scan nested shadow DOMs
          walkTree(node.shadowRoot);
        }
      }
    };

    try {
      walkTree(document.body);
    } catch (error) {
      console.warn('[RobustScanner] Error scanning shadow DOM:', error);
    }

    return shadowElements;
  }

  /**
   * Scan same-origin iframes
   */
  scanIframes() {
    const iframeElements = [];

    try {
      const iframes = document.querySelectorAll('iframe');

      for (const iframe of iframes) {
        try {
          // Try to access iframe content (will fail for cross-origin)
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

          if (iframeDoc) {
            const interactiveElements = iframeDoc.querySelectorAll(
              'button, a[href], input:not([type="hidden"]), select, textarea'
            );

            iframeElements.push(...Array.from(interactiveElements));
            console.log(`[RobustScanner] Scanned iframe, found ${interactiveElements.length} elements`);
          }
        } catch (e) {
          // Cross-origin iframe - skip silently
          console.log('[RobustScanner] Skipping cross-origin iframe');
        }
      }
    } catch (error) {
      console.warn('[RobustScanner] Error scanning iframes:', error);
    }

    return iframeElements;
  }

  /**
   * Check if element looks interactive
   */
  looksInteractive(element) {
    // Has click handler
    if (element.onclick || element.hasAttribute('onclick')) return true;

    // Has cursor pointer
    const style = window.getComputedStyle(element);
    if (style.cursor === 'pointer') return true;

    // Has interactive role
    const role = element.getAttribute('role');
    if (role && ['button', 'link', 'tab', 'menuitem'].includes(role)) return true;

    return false;
  }

  /**
   * Remove duplicate elements
   */
  deduplicateElements(elements) {
    const unique = new Set();
    return elements.filter(el => {
      if (unique.has(el)) return false;
      unique.add(el);
      return true;
    });
  }

  /**
   * Check if page is still loading/changing
   */
  isPageStillLoading() {
    // Check document ready state
    if (document.readyState === 'loading') return true;

    // Check for loading indicators
    const loadingIndicators = document.querySelectorAll(
      '.loading, .spinner, [class*="loading"], [class*="spinner"], [aria-busy="true"]'
    );

    return loadingIndicators.length > 0;
  }

  /**
   * Wait for dynamic content to load
   */
  async waitForDynamicContent(timeout = 1000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = 100;

      const check = () => {
        const elapsed = Date.now() - startTime;

        if (elapsed >= timeout) {
          resolve();
          return;
        }

        // Check if loading indicators are gone
        if (!this.isPageStillLoading()) {
          console.log('[RobustScanner] Dynamic content loaded');
          resolve();
          return;
        }

        setTimeout(check, checkInterval);
      };

      check();
    });
  }

  /**
   * Setup mutation detection for cache invalidation
   */
  setupDynamicDetection() {
    if (this.observingMutations) return;

    const observer = new MutationObserver((mutations) => {
      // Significant DOM change detected
      let significantChange = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
          // Check if any added/removed nodes are interactive
          for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const tagName = node.tagName?.toLowerCase();
              if (['button', 'a', 'input', 'select'].includes(tagName)) {
                significantChange = true;
                break;
              }
            }
          }
        }
        if (significantChange) break;
      }

      if (significantChange) {
        console.log('[RobustScanner] Significant DOM change detected, invalidating cache');
        this.clearCache();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observingMutations = true;
  }

  /**
   * Extract data from element (same as simple scanner)
   */
  extractElementData(element, index) {
    try {
      const rect = element.getBoundingClientRect();

      // Enhanced visibility check
      const isVisible = rect.width > 0 &&
                       rect.height > 0 &&
                       rect.top < window.innerHeight + 500 && // Include below fold
                       rect.bottom > -500; // Include above fold

      // Get text
      let text = '';
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        text = element.placeholder || element.value || element.getAttribute('aria-label') || '';
      } else {
        text = element.textContent?.trim().substring(0, 100) ||
               element.getAttribute('aria-label') ||
               element.getAttribute('title') || '';
      }

      const selector = this.generateRobustSelector(element);
      const tagName = element.tagName.toLowerCase();
      const role = element.getAttribute('role') || this.getImpliedRole(tagName);

      return {
        id: this.generateId(element, index),
        selector: selector,
        text: text,
        type: tagName,
        role: role,
        visible: isVisible,
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
          'aria-labelledby': element.getAttribute('aria-labelledby'),
          name: element.getAttribute('name'),
          type: element.getAttribute('type'),
          href: element.getAttribute('href')
        },
        __domRef: element
      };
    } catch (error) {
      console.warn('[RobustScanner] Error processing element:', error);
      return null;
    }
  }

  /**
   * Generate robust selector that works on complex sites
   */
  generateRobustSelector(element) {
    // Priority 1: data-testid (most stable)
    const testId = element.getAttribute('data-testid');
    if (testId) {
      return `[data-testid="${CSS.escape(testId)}"]`;
    }

    // Priority 2: ID (if looks stable)
    if (element.id && this.isStableId(element.id)) {
      try {
        const escaped = CSS.escape(element.id);
        if (document.querySelectorAll(`#${escaped}`).length === 1) {
          return `#${escaped}`;
        }
      } catch (e) {
        // Invalid ID, skip
      }
    }

    // Priority 3: aria-label (semantic)
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.length < 50) {
      return `${element.tagName.toLowerCase()}[aria-label="${CSS.escape(ariaLabel)}"]`;
    }

    // Priority 4: name attribute
    const name = element.getAttribute('name');
    if (name) {
      return `${element.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
    }

    // Priority 5: Stable class (not auto-generated)
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(/\s+/).filter(c => this.isStableClass(c));
      if (classes.length > 0) {
        const classSelector = `${element.tagName.toLowerCase()}.${CSS.escape(classes[0])}`;
        try {
          if (document.querySelectorAll(classSelector).length === 1) {
            return classSelector;
          }
        } catch (e) {
          // Invalid selector
        }
      }
    }

    // Priority 6: href for links
    if (element.tagName === 'A' && element.getAttribute('href')) {
      const href = element.getAttribute('href');
      if (href && !href.startsWith('javascript:')) {
        return `a[href="${CSS.escape(href)}"]`;
      }
    }

    // Fallback: Simple tag selector (will match multiple, but highlighting handles this)
    return element.tagName.toLowerCase();
  }

  /**
   * Check if ID looks stable (not auto-generated)
   */
  isStableId(id) {
    // Avoid IDs that look auto-generated
    // e.g., "react-id-123", "ember456", "vue-789"
    if (/^(react|ember|vue|ng)-/.test(id)) return false;
    if (/^[a-z]+-\d{3,}$/.test(id)) return false; // e.g., "item-12345"
    if (/^[0-9a-f]{8,}$/.test(id)) return false; // e.g., "a1b2c3d4e5f6"

    return true;
  }

  /**
   * Check if class looks stable (not auto-generated)
   */
  isStableClass(className) {
    // Avoid classes that look auto-generated
    // e.g., "css-1x2y3z4", "_1234abcd", "sc-abc123"
    if (/^css-[a-z0-9]+$/i.test(className)) return false;
    if (/^_[a-z0-9]{6,}$/i.test(className)) return false;
    if (/^sc-[a-z0-9]+$/i.test(className)) return false;
    if (/^[a-z]{1,2}\d{3,}$/i.test(className)) return false;

    return true;
  }

  generateId(element, index) {
    if (element.id) return `id-${element.id}`;
    const testId = element.getAttribute('data-testid');
    if (testId) return `testid-${testId}`;
    const name = element.getAttribute('name');
    if (name) return `name-${name}`;
    return `elem-${index}`;
  }

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

  isCacheValid() {
    return this.cache && (Date.now() - this.cacheTime) < this.CACHE_LIFETIME;
  }

  clearCache() {
    this.cache = null;
    this.cacheTime = 0;
  }
}

// Make globally available
window.RobustDOMScanner = RobustDOMScanner;
window.robustScanner = new RobustDOMScanner();

console.log('[RobustDOMScanner] Loaded successfully ✓');
console.log('[RobustDOMScanner] Supports: Shadow DOM, iFrames, Dynamic Content, SPAs');
