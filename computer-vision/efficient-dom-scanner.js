/**
 * Ultra-Efficient DOM Scanner for Chrome Extensions
 *
 * Performance Optimizations:
 * 1. Uses IntersectionObserver for visibility detection (GPU-accelerated)
 * 2. TreeWalker for efficient DOM traversal (faster than querySelectorAll)
 * 3. Incremental scanning with caching
 * 4. Priority-based element selection
 * 5. Async/background processing to avoid blocking UI
 * 6. Smart selector generation using Playwright-inspired logic
 */

class EfficientDOMScanner {
  constructor() {
    // Cache for scanned elements
    this.cache = new Map();
    this.lastScanTimestamp = 0;
    this.scanVersion = 0;

    // Priority weights for different element types
    this.priorityWeights = {
      'button': 10,
      'a': 9,
      'input': 9,
      'select': 8,
      'textarea': 8,
      'form': 7,
      '[role="button"]': 10,
      '[role="link"]': 9,
      '[role="tab"]': 8,
      '[role="menuitem"]': 8
    };

    // Performance metrics
    this.metrics = {
      lastScanTime: 0,
      elementsScanned: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    // Setup observers
    this.setupIncrementalUpdates();
  }

  /**
   * Main scanning method - intelligently scans DOM
   * @param {Object} options - Scanning options
   * @returns {Promise<Array>} - Array of element data
   */
  async scanPageElements(options = {}) {
    const startTime = performance.now();

    const config = {
      maxElements: options.maxElements || 100,
      useCache: options.useCache !== false,
      priority: options.priority || 'balanced', // 'speed', 'accuracy', 'balanced'
      includeInvisible: options.includeInvisible || false,
      viewport: options.viewport || 'visible', // 'visible', 'all', 'above-fold'
      ...options
    };

    console.log('[EfficientScanner] Starting scan with config:', config);

    // Check if we can use cache
    if (config.useCache && this.isCacheValid()) {
      console.log('[EfficientScanner] Using cached results');
      this.metrics.cacheHits++;
      return Array.from(this.cache.values());
    }

    this.metrics.cacheMisses++;

    // Strategy selection based on priority
    let elements;
    switch (config.priority) {
      case 'speed':
        elements = await this.fastScan(config);
        break;
      case 'accuracy':
        elements = await this.accurateScan(config);
        break;
      default:
        elements = await this.balancedScan(config);
    }

    // Post-process and cache
    const processed = await this.processElements(elements, config);
    this.updateCache(processed);

    const endTime = performance.now();
    this.metrics.lastScanTime = endTime - startTime;
    this.metrics.elementsScanned = processed.length;

    console.log(`[EfficientScanner] Scan complete: ${processed.length} elements in ${this.metrics.lastScanTime.toFixed(2)}ms`);

    return processed;
  }

  /**
   * Fast scan using TreeWalker (3-5x faster than querySelectorAll)
   */
  async fastScan(config) {
    const elements = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          // Fast filtering - only check tag name
          if (this.isInteractiveElement(node)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    let currentNode;
    let count = 0;
    while ((currentNode = walker.nextNode()) && count < config.maxElements) {
      elements.push(currentNode);
      count++;
    }

    return elements;
  }

  /**
   * Accurate scan using multiple strategies
   */
  async accurateScan(config) {
    const elements = new Set();

    // Strategy 1: Direct semantic queries (most reliable)
    const semanticSelectors = [
      'button',
      'a[href]',
      'input:not([type="hidden"])',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="textbox"]',
      '[onclick]'
    ];

    for (const selector of semanticSelectors) {
      try {
        document.querySelectorAll(selector).forEach(el => elements.add(el));
      } catch (e) {
        console.warn(`[EfficientScanner] Invalid selector: ${selector}`);
      }
    }

    // Strategy 2: ARIA landmarks and labeled elements
    const ariaElements = document.querySelectorAll('[aria-label], [aria-labelledby], [data-testid]');
    ariaElements.forEach(el => {
      if (this.isInteractiveElement(el) || this.hasInteractiveChild(el)) {
        elements.add(el);
      }
    });

    // Strategy 3: Common class-based patterns
    const commonPatterns = [
      '[class*="btn"]',
      '[class*="button"]',
      '[class*="link"]',
      '[class*="nav"]',
      '[class*="menu"]',
      '[class*="tab"]',
      '[class*="cta"]'
    ];

    for (const pattern of commonPatterns) {
      document.querySelectorAll(pattern).forEach(el => {
        if (this.isLikelyInteractive(el)) {
          elements.add(el);
        }
      });
    }

    return Array.from(elements).slice(0, config.maxElements);
  }

  /**
   * Balanced scan - good speed and accuracy
   */
  async balancedScan(config) {
    const elements = [];

    // Primary: Get most important interactive elements
    const primarySelectors = 'button, a[href], input:not([type="hidden"]), select, textarea, [role="button"], [role="link"]';
    const primary = document.querySelectorAll(primarySelectors);
    elements.push(...Array.from(primary));

    // Secondary: Get contextually important elements (only if under limit)
    if (elements.length < config.maxElements * 0.7) {
      const secondarySelectors = '[onclick], [class*="btn"], [class*="button"], [role="tab"], [role="menuitem"]';
      const secondary = document.querySelectorAll(secondarySelectors);

      secondary.forEach(el => {
        if (!elements.includes(el) && this.isLikelyInteractive(el)) {
          elements.push(el);
        }
      });
    }

    return elements.slice(0, config.maxElements);
  }

  /**
   * Process elements efficiently using batch operations
   */
  async processElements(elements, config) {
    const processed = [];

    // Batch visibility check using IntersectionObserver (non-blocking, GPU-accelerated)
    const visibilityMap = await this.batchVisibilityCheck(elements);

    // Process in chunks to avoid blocking main thread
    const chunkSize = 50;
    for (let i = 0; i < elements.length; i += chunkSize) {
      const chunk = elements.slice(i, i + chunkSize);

      // Yield to main thread between chunks
      if (i > 0) {
        await this.nextFrame();
      }

      for (const el of chunk) {
        const isVisible = visibilityMap.get(el);

        // Skip invisible elements if configured
        if (!config.includeInvisible && !isVisible) {
          continue;
        }

        const elementData = this.extractElementData(el, isVisible);
        if (elementData) {
          processed.push(elementData);
        }
      }
    }

    // Sort by priority score (most important first)
    return this.prioritizeElements(processed);
  }

  /**
   * Batch visibility check using IntersectionObserver
   * This is WAY faster than calling getBoundingClientRect() on each element
   */
  async batchVisibilityCheck(elements) {
    return new Promise((resolve) => {
      const visibilityMap = new Map();
      let processedCount = 0;

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          visibilityMap.set(entry.target, entry.isIntersecting);
          processedCount++;

          if (processedCount === elements.length) {
            observer.disconnect();
            resolve(visibilityMap);
          }
        });
      }, {
        threshold: 0.01 // Element is visible if at least 1% is showing
      });

      elements.forEach(el => observer.observe(el));

      // Timeout safety
      setTimeout(() => {
        if (processedCount < elements.length) {
          observer.disconnect();
          // Fill remaining with false
          elements.forEach(el => {
            if (!visibilityMap.has(el)) {
              visibilityMap.set(el, false);
            }
          });
          resolve(visibilityMap);
        }
      }, 1000);
    });
  }

  /**
   * Extract element data efficiently
   */
  extractElementData(element, isVisible) {
    try {
      // Get only what we need - avoid expensive operations
      const tagName = element.tagName.toLowerCase();
      const computedRole = element.getAttribute('role') || this.inferRole(element);

      // Smart text extraction - limit depth to avoid scanning huge DOM subtrees
      const text = this.extractTextEfficiently(element);

      // Generate optimal selector (Playwright-inspired)
      const selector = this.generateOptimalSelector(element);

      // Get position only if visible (avoid layout thrashing)
      let position = null;
      if (isVisible) {
        const rect = element.getBoundingClientRect();
        position = {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      }

      return {
        id: this.generateElementId(element),
        selector: selector,
        text: text,
        type: tagName,
        role: computedRole,
        visible: isVisible,
        position: position,
        priority: this.calculatePriority(element, tagName, computedRole),
        attributes: this.getRelevantAttributes(element),
        metadata: {
          hasChildren: element.children.length > 0,
          isNested: this.isNestedInteractive(element),
          confidence: this.calculateConfidence(element)
        },
        // Store element reference for highlighting (will be lost when sent via message passing)
        _elementRef: element
      };
    } catch (error) {
      console.warn('[EfficientScanner] Error processing element:', error);
      return null;
    }
  }

  /**
   * Generate optimal CSS selector (Playwright-inspired algorithm)
   */
  generateOptimalSelector(element) {
    // 1. Try data-testid (best for automation)
    const testId = element.getAttribute('data-testid');
    if (testId) {
      return `[data-testid="${testId}"]`;
    }

    // 2. Try ID (fast and unique)
    if (element.id && /^[a-zA-Z][\w-]*$/.test(element.id)) {
      return `#${element.id}`;
    }

    // 3. Try aria-label (semantic and stable)
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return `${element.tagName.toLowerCase()}[aria-label="${ariaLabel}"]`;
    }

    // 4. Try role + accessible name
    const role = element.getAttribute('role');
    if (role) {
      const name = this.getAccessibleName(element);
      if (name) {
        return `[role="${role}"][aria-label="${name}"]`;
      }
      return `[role="${role}"]`;
    }

    // 5. Try unique class combination
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(/\s+/).filter(c => c && !/^ng-|^v-|^_/.test(c));
      if (classes.length > 0 && classes.length <= 3) {
        const classSelector = `${element.tagName.toLowerCase()}.${classes.join('.')}`;
        // Verify uniqueness
        if (document.querySelectorAll(classSelector).length === 1) {
          return classSelector;
        }
      }
    }

    // 6. Try text content for buttons/links (stable for user-visible text)
    if (['button', 'a'].includes(element.tagName.toLowerCase())) {
      const text = this.extractTextEfficiently(element);
      if (text && text.length < 50 && text.length > 2) {
        // Try to find by exact text match using nth-child
        const selector = this.getNthChildSelector(element);
        // Store text for reference but use nth-child selector
        return selector;
      }
    }

    // 7. Fall back to nth-child path (least stable but always works)
    return this.getNthChildSelector(element);
  }

  /**
   * Generate nth-child based selector
   */
  getNthChildSelector(element) {
    const path = [];
    let current = element;

    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break;
      }

      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          child => child.tagName === current.tagName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }

      path.unshift(selector);
      current = parent;
    }

    return path.join(' > ');
  }

  /**
   * Extract text efficiently without traversing huge subtrees
   */
  extractTextEfficiently(element, maxLength = 100, maxDepth = 3) {
    if (maxDepth === 0) return '';

    let text = '';

    // For input elements, get value or placeholder
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      return element.value || element.placeholder || '';
    }

    // For other elements, get direct text nodes only (not all descendants)
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE && maxDepth > 1) {
        // Recursively get text from immediate children only
        text += this.extractTextEfficiently(node, maxLength - text.length, maxDepth - 1);
      }

      if (text.length >= maxLength) break;
    }

    return text.trim().substring(0, maxLength);
  }

  /**
   * Calculate element priority for ranking
   */
  calculatePriority(element, tagName, role) {
    let score = 0;

    // Base score by tag
    const tagScores = {
      'button': 10,
      'a': 9,
      'input': 9,
      'select': 8,
      'textarea': 8,
      'form': 7
    };
    score += tagScores[tagName] || 3;

    // Boost for ARIA roles
    if (role) score += 3;

    // Boost for data-testid (indicates important element)
    if (element.hasAttribute('data-testid')) score += 5;

    // Boost for aria-label (well-documented element)
    if (element.hasAttribute('aria-label')) score += 3;

    // Boost for primary action indicators
    const classList = element.classList;
    if (classList.contains('primary') || classList.contains('btn-primary')) score += 4;
    if (classList.contains('cta') || classList.contains('call-to-action')) score += 4;

    // Penalty for nested/hidden
    if (this.isNestedInteractive(element)) score -= 2;

    return Math.max(0, score);
  }

  /**
   * Prioritize elements by importance
   */
  prioritizeElements(elements) {
    return elements.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if element is interactive
   */
  isInteractiveElement(element) {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'details', 'summary'];
    const tagName = element.tagName.toLowerCase();

    if (interactiveTags.includes(tagName)) return true;
    if (element.hasAttribute('onclick')) return true;

    const role = element.getAttribute('role');
    const interactiveRoles = ['button', 'link', 'tab', 'menuitem', 'option', 'switch', 'checkbox', 'radio'];
    if (role && interactiveRoles.includes(role)) return true;

    return false;
  }

  /**
   * Check if element is likely interactive based on classes/attributes
   */
  isLikelyInteractive(element) {
    const classList = element.className;
    if (typeof classList === 'string') {
      const patterns = ['btn', 'button', 'link', 'clickable', 'action', 'cta'];
      if (patterns.some(p => classList.toLowerCase().includes(p))) {
        return true;
      }
    }

    return element.hasAttribute('tabindex') || element.hasAttribute('aria-label');
  }

  /**
   * Check if element has interactive children
   */
  hasInteractiveChild(element) {
    const interactiveChild = element.querySelector('button, a, input, select, textarea, [role="button"]');
    return !!interactiveChild;
  }

  /**
   * Check if element is nested inside another interactive element
   */
  isNestedInteractive(element) {
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      if (this.isInteractiveElement(parent)) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  /**
   * Infer ARIA role from element
   */
  inferRole(element) {
    const tagName = element.tagName.toLowerCase();
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
   * Get accessible name for element
   */
  getAccessibleName(element) {
    return element.getAttribute('aria-label') ||
           element.getAttribute('aria-labelledby') ||
           element.getAttribute('title') ||
           element.textContent?.trim().substring(0, 50) ||
           '';
  }

  /**
   * Get relevant attributes efficiently
   */
  getRelevantAttributes(element) {
    const attrs = {};
    const relevantAttrs = ['data-testid', 'aria-label', 'title', 'placeholder', 'alt', 'name', 'type', 'href'];

    for (const attr of relevantAttrs) {
      const value = element.getAttribute(attr);
      if (value) attrs[attr] = value;
    }

    return attrs;
  }

  /**
   * Calculate confidence score for element identification
   */
  calculateConfidence(element) {
    let confidence = 0.5; // Base confidence

    if (element.id) confidence += 0.3;
    if (element.hasAttribute('data-testid')) confidence += 0.2;
    if (element.hasAttribute('aria-label')) confidence += 0.1;
    if (this.extractTextEfficiently(element)) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Generate stable element ID
   */
  generateElementId(element) {
    const testId = element.getAttribute('data-testid');
    if (testId) return `testid-${testId}`;

    if (element.id) return `id-${element.id}`;

    // Hash-based ID for stability
    const hash = this.simpleHash(`${element.tagName}${element.className}${this.extractTextEfficiently(element, 20)}`);
    return `elem-${hash}`;
  }

  /**
   * Simple hash function
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Cache management
   */
  isCacheValid() {
    const cacheLifetime = 5000; // 5 seconds
    return (Date.now() - this.lastScanTimestamp) < cacheLifetime && this.cache.size > 0;
  }

  updateCache(elements) {
    this.cache.clear();
    elements.forEach(el => {
      this.cache.set(el.id, el);
    });
    this.lastScanTimestamp = Date.now();
    this.scanVersion++;
  }

  invalidateCache() {
    this.cache.clear();
    this.lastScanTimestamp = 0;
  }

  /**
   * Setup incremental updates using MutationObserver
   */
  setupIncrementalUpdates() {
    const observer = new MutationObserver((mutations) => {
      // Debounce: only invalidate cache if significant changes
      let significantChange = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if added nodes are interactive
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE && this.isInteractiveElement(node)) {
              significantChange = true;
              break;
            }
          }
        }
      }

      if (significantChange) {
        console.log('[EfficientScanner] DOM changed significantly, invalidating cache');
        this.invalidateCache();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false // Don't watch attribute changes (too noisy)
    });

    this.mutationObserver = observer;
  }

  /**
   * Utility: Wait for next animation frame (non-blocking delay)
   */
  nextFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      scanVersion: this.scanVersion,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    this.cache.clear();
  }
}

// Export for use in content script
window.EfficientDOMScanner = EfficientDOMScanner;
