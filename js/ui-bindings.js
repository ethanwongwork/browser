/**
 * UI Bindings
 * Connects BrowserState to the DOM without changing visual appearance
 */

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

const UIBindings = {
  // DOM element references
  elements: {},

  // Error tracking
  _errorCount: 0,
  _maxErrors: 10,
  
  // Animation lock to prevent concurrent chat animations
  _chatAnimating: false,

  // Typewriter state
  _typewriterAbort: null,

  /**
   * Typewriter animation — reveals text letter by letter inside an element.
   * Preserves full HTML structure; only animates text node content.
   * Returns a Promise that resolves when done. Call abort() on the returned
   * controller to cancel mid-animation.
   * @param {HTMLElement} el  — container whose innerHTML is already set
   * @param {object} opts
   * @param {number} opts.speed — ms per character (default 12)
   * @param {number} opts.delay — ms before starting (default 0)
   */
  typewrite(el, { speed = 12, delay = 0 } = {}) {
    if (!el) return { promise: Promise.resolve(), abort() {} };

    // Collect every text node in DOM order
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    if (nodes.length === 0) return { promise: Promise.resolve(), abort() {} };

    // Snapshot full strings, then blank them
    const fulls = nodes.map(n => n.textContent);
    nodes.forEach(n => { n.textContent = ''; });

    let cancelled = false;
    const abort = () => { cancelled = true; };

    const promise = new Promise(resolve => {
      let nodeIdx = 0;
      let charIdx = 0;

      function step() {
        if (cancelled) {
          // Restore all remaining text instantly
          for (let i = nodeIdx; i < nodes.length; i++) {
            nodes[i].textContent = fulls[i];
          }
          resolve();
          return;
        }
        if (nodeIdx >= nodes.length) { resolve(); return; }

        const full = fulls[nodeIdx];
        charIdx++;
        nodes[nodeIdx].textContent = full.slice(0, charIdx);

        if (charIdx >= full.length) {
          nodeIdx++;
          charIdx = 0;
        }

        setTimeout(step, speed);
      }

      setTimeout(step, delay);
    });

    return { promise, abort };
  },

  /**
   * Initialize UI bindings with error boundary
   */
  init() {
    try {
      this.cacheElements();
      this.bindEvents();
      this.subscribeToState();
      this.initWebview();
      this.setupGlobalErrorHandler();
      this.initNTPHeader();
      this.initSingleRowCards();
      this.initSplitResizeHandle();
      console.log('[UI] Bindings initialized', isElectron ? '(Electron)' : '(Browser)');
    } catch (error) {
      this.handleFatalError(error);
    }
    return this;
  },

  /**
   * Setup global error handler
   */
  setupGlobalErrorHandler() {
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('[UI] Global error:', { message, source, lineno, colno, error });
      this._errorCount++;
      
      if (this._errorCount >= this._maxErrors) {
        this.showCrashRecovery();
      }
      
      return false; // Don't suppress the error
    };

    window.onunhandledrejection = (event) => {
      console.error('[UI] Unhandled promise rejection:', event.reason);
      this._errorCount++;
    };
  },

  /**
   * Handle fatal initialization errors
   */
  handleFatalError(error) {
    console.error('[UI] Fatal error during initialization:', error);
    document.body.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, sans-serif; padding: 20px; text-align: center;">
        <h1 style="margin-bottom: 16px; color: #ef4444;">Something went wrong</h1>
        <p style="margin-bottom: 24px; color: #666;">The browser encountered an error during initialization.</p>
        <pre style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 24px; max-width: 600px; overflow: auto; text-align: left;">${error.stack || error.message}</pre>
        <button onclick="location.reload()" style="background: #3a3632; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">Reload</button>
      </div>
    `;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FAVICON SYSTEM - 16x16 favicons via Google's service
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Favicon URL cache to avoid re-fetching
  _faviconCache: new Map(),
  
  /**
   * Get domain from URL
   */
  getDomainFromUrl(url) {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      // Handle partial URLs or just domains
      return url.replace(/^(https?:\/\/)?/, '').split('/')[0];
    }
  },
  
  /**
   * Get Google favicon URL (fetch 32px for crisp display on Retina)
   */
  getGoogleFaviconUrl(domain) {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
  },
  
  /**
   * Create favicon HTML string
   * @param {Object} options - { url, domain }
   * @returns {string} HTML string
   */
  createFaviconHtml(options = {}) {
    const { url, domain: providedDomain } = options;
    const domain = providedDomain || this.getDomainFromUrl(url);
    
    if (!domain) {
      // Show character avatar for tabs without a URL (Home tab)
      const character = localStorage.getItem('user_character') || 'bear';
      return `<div class="favicon favicon-home"><img class="favicon-character" src="characters/${this.escapeHtml(character)}.png" alt="" draggable="false"></div>`;
    }
    
    const faviconUrl = this._faviconCache.get(domain) || this.getGoogleFaviconUrl(domain);
    
    return `<div class="favicon" data-domain="${this.escapeHtml(domain)}">
      <img class="favicon-img" src="${this.escapeHtml(faviconUrl)}" alt="">
    </div>`;
  },
  
  /**
   * Create favicon DOM element
   * @param {Object} options - { url, domain }
   * @returns {HTMLElement}
   */
  createFaviconElement(options = {}) {
    const { url, domain: providedDomain } = options;
    const domain = providedDomain || this.getDomainFromUrl(url);
    
    const container = document.createElement('div');
    container.className = domain ? 'favicon' : 'favicon favicon-home';
    container.setAttribute('data-domain', domain || '');
    
    if (!domain) {
      // Show character avatar for tabs without a URL
      const character = localStorage.getItem('user_character') || 'bear';
      const img = document.createElement('img');
      img.className = 'favicon-character';
      img.src = `characters/${character}.png`;
      img.alt = '';
      img.draggable = false;
      container.appendChild(img);
      return container;
    }
    
    const faviconUrl = this._faviconCache.get(domain) || this.getGoogleFaviconUrl(domain);
    
    const img = document.createElement('img');
    img.className = 'favicon-img';
    img.alt = '';
    img.src = faviconUrl;
    
    img.onload = () => {
      this._faviconCache.set(domain, faviconUrl);
    };
    
    container.appendChild(img);
    return container;
  },
  
  /**
   * Update an existing favicon element
   * @param {HTMLElement} faviconEl - The .favicon element
   * @param {Object} options - { url, domain }
   */
  updateFaviconElement(faviconEl, options = {}) {
    if (!faviconEl) return;
    
    const { url, domain: providedDomain } = options;
    const domain = providedDomain || this.getDomainFromUrl(url);
    
    faviconEl.setAttribute('data-domain', domain || '');
    
    if (!domain) {
      // Show character avatar for New tab
      faviconEl.className = 'favicon favicon-home';
      const character = localStorage.getItem('user_character') || 'bear';
      faviconEl.innerHTML = `<img class="favicon-character" src="characters/${character}.png" alt="" draggable="false">`;
      return;
    }
    
    faviconEl.className = 'favicon';
    
    const faviconUrl = this._faviconCache.get(domain) || this.getGoogleFaviconUrl(domain);
    
    const img = document.createElement('img');
    img.className = 'favicon-img';
    img.alt = '';
    img.src = faviconUrl;
    
    img.onload = () => {
      this._faviconCache.set(domain, faviconUrl);
    };
    
    faviconEl.innerHTML = '';
    faviconEl.appendChild(img);
  },
  
  /**
   * Preload favicon for a domain (call when tab is created)
   * @param {string} urlOrDomain
   */
  preloadFavicon(urlOrDomain) {
    const domain = this.getDomainFromUrl(urlOrDomain) || urlOrDomain;
    if (!domain || this._faviconCache.has(domain)) return;
    
    const faviconUrl = this.getGoogleFaviconUrl(domain);
    const img = new Image();
    img.onload = () => {
      this._faviconCache.set(domain, faviconUrl);
    };
    img.src = faviconUrl;
  },

  /**
   * Show crash recovery UI
   */
  showCrashRecovery() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px; text-align: center;">
        <div class="modal-body" style="padding: 24px;">
          <h2 style="margin-bottom: 16px;">Browser has encountered issues</h2>
          <p style="margin-bottom: 24px; color: var(--color-fg-secondary);">Multiple errors have occurred. You can try recovering your session or reload the browser.</p>
          <div style="display: flex; gap: 12px; justify-content: center;">
            <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Dismiss</button>
            <button class="btn btn-primary" onclick="location.reload()">Reload Browser</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    this._errorCount = 0; // Reset counter
  },

  /**
   * Initialize webview event listeners (Electron specific)
   */
  initWebview() {
    const webview = this.elements.webviewFrame;
    if (!webview || !isElectron) return;

    // Wait for webview to be ready
    webview.addEventListener('dom-ready', () => {
      console.log('[UI] Webview DOM ready');
      this.updateNavigationState();
    });

    // Loading started
    webview.addEventListener('did-start-loading', () => {
      const tab = BrowserState.getActiveTab();
      if (tab) {
        BrowserState.setTabLoading(tab.id, true);
        this.showLoadingIndicator(true);
      }
    });

    // Loading finished
    webview.addEventListener('did-stop-loading', () => {
      const tab = BrowserState.getActiveTab();
      if (tab) {
        BrowserState.setTabLoading(tab.id, false);
        this.showLoadingIndicator(false);
        // Capture thumbnail after a short delay to allow page to fully render
        setTimeout(() => {
          this.captureTabThumbnail(tab.id);
          // Also update favorite thumbnail if this URL is a favorite
          this.updateFavoriteThumbnail(tab.url);
        }, 500);
      }
      this.updateNavigationState();
    });

    // Navigation completed
    webview.addEventListener('did-navigate', (e) => {
      this.onWebviewNavigate(e.url);
      this.hideErrorPage();
    });

    // In-page navigation (hash changes, pushState)
    webview.addEventListener('did-navigate-in-page', (e) => {
      if (e.isMainFrame) {
        this.onWebviewNavigate(e.url);
      }
    });

    // Page title updated
    webview.addEventListener('page-title-updated', (e) => {
      const tab = BrowserState.getActiveTab();
      if (tab) {
        // Don't update title for home tabs - they should always be "Home"
        if (!tab.url || tab.url === '' || tab.url === 'about:blank') {
          return;
        }
        // Only update if the webview URL matches the tab URL (prevent race conditions)
        const webviewUrl = isElectron ? webview.getURL?.() : webview.src;
        if (webviewUrl && tab.url && webviewUrl.replace(/\/$/, '') === tab.url.replace(/\/$/, '')) {
          BrowserState.updateTab(tab.id, { title: e.title });
        }
      }
    });

    // Page favicon updated
    webview.addEventListener('page-favicon-updated', (e) => {
      const tab = BrowserState.getActiveTab();
      if (tab && e.favicons && e.favicons.length > 0) {
        // Don't update favicon for home tabs
        if (!tab.url || tab.url === '' || tab.url === 'about:blank') {
          return;
        }
        // Only update if the webview URL matches the tab URL
        const webviewUrl = isElectron ? webview.getURL?.() : webview.src;
        if (webviewUrl && tab.url && webviewUrl.replace(/\/$/, '') === tab.url.replace(/\/$/, '')) {
          BrowserState.updateTab(tab.id, { faviconUrl: e.favicons[0] });
        }
      }
    });

    // Handle new window requests (open in new tab)
    webview.addEventListener('new-window', (e) => {
      e.preventDefault();
      BrowserState.addTab({ url: e.url, title: 'Loading...' });
    });

    // Handle load errors
    webview.addEventListener('did-fail-load', (e) => {
      // Ignore aborted loads (-3) and cancelled loads (-1)
      if (e.errorCode === -3 || e.errorCode === -1) return;
      
      console.log('[UI] Load failed:', e.errorCode, e.errorDescription);
      const tab = BrowserState.getActiveTab();
      if (tab) {
        BrowserState.setTabLoading(tab.id, false);
        this.showLoadingIndicator(false);
        this.showErrorPage(e.validatedURL || tab.url, e.errorDescription, e.errorCode);
      }
    });

    // Handle certificate errors
    webview.addEventListener('certificate-error', (e) => {
      console.log('[UI] Certificate error:', e);
    });
  },

  /**
   * Handle webview navigation events
   */
  onWebviewNavigate(url) {
    const tab = BrowserState.getActiveTab();
    if (tab) {
      // Don't update home tabs with webview URLs
      if (!tab.url || tab.url === '' || tab.url === 'about:blank') {
        // If webview is trying to navigate away from home, don't update the home tab
        if (url && url !== 'about:blank' && url !== '') {
          return;
        }
      }
      BrowserState.updateTab(tab.id, { url });
      BrowserState.addressBar.value = url;
      BrowserState.emit('addressBarChanged');
      
      // Update navigation state
      this.updateNavigationState();
    }
  },

  /**
   * Update back/forward navigation state
   */
  updateNavigationState() {
    const webview = this.elements.webviewFrame;
    if (webview && isElectron && webview.canGoBack && webview.canGoForward) {
      BrowserState.navigation.canGoBack = webview.canGoBack();
      BrowserState.navigation.canGoForward = webview.canGoForward();
      this.renderToolbar();
    }
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements = {
      // Toolbar
      toolbar: document.querySelector('.toolbar'),
      toolbarTab: document.getElementById('toolbar-tab'),
      toolbarTabFavicon: document.querySelector('.toolbar-tab .favicon'),
      // Tab Strip
      tabStrip: document.getElementById('tab-strip'),
      tabStripTabs: document.getElementById('tab-strip-tabs'),
      tabNewBtn: document.getElementById('tab-new-btn'),
      
      // Toolbar
      toolbar: document.querySelector('.toolbar'),
      toolbarBookmarks: document.getElementById('toolbar-bookmarks'),
      backBtn: document.getElementById('back-btn'),
      forwardBtn: document.getElementById('forward-btn'),
      reloadBtn: document.getElementById('reload-btn'),
      backBtn2: document.getElementById('back-btn-2'),
      forwardBtn2: document.getElementById('forward-btn-2'),
      reloadBtn2: document.getElementById('reload-btn-2'),

      // Split View
      splitContainer: document.getElementById('split-container'),
      tabFrame1: document.getElementById('tab-frame-1'),
      tabFrame2: document.getElementById('tab-frame-2'),
      splitResizeHandle: document.getElementById('split-resize-handle'),
      webviewFrame2: document.getElementById('webview-frame-2'),
      addressInput2: document.getElementById('address-input-2'),

      // Search bar
      searchBar: document.querySelector('.search-bar'),
      addressInput: document.getElementById('address-input'),
      searchPlaceholder: document.querySelector('.search-placeholder'),
      searchSuggestions: document.getElementById('search-suggestions'),
      searchSuggestions2: document.getElementById('search-suggestions-2'),

      // Content area
      contentArea: document.querySelector('.content-area'),
      mainContent: document.querySelector('.main-content'),
      scrollContainer: document.querySelector('.scroll-container'),

      // Webview
      webviewContainer: document.getElementById('webview-container'),
      webviewFrame: document.getElementById('webview-frame'),

      // New Tab Page
      newTabPage: document.getElementById('new-tab-page'),
      favoritesRow: document.querySelector('.favorites-row'),
      chatsRow: document.querySelector('.chats-row'),
      widgetsRow: document.querySelector('.widgets-row'),

      // Bottom Search Bar
      bottomSearchInput: document.getElementById('bottom-search-input'),
      bottomSearchSubmit: document.getElementById('bottom-search-submit'),
      searchEngineIcon: document.getElementById('search-engine-icon')
    };
  },

  // Search engine URLs
  SEARCH_ENGINES: {
    google:     'https://www.google.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    bing:       'https://www.bing.com/search?q=',
    brave:      'https://search.brave.com/search?q=',
    ecosia:     'https://www.ecosia.org/search?q=',
  },

  SEARCH_ENGINE_FAVICONS: {
    google:     'https://www.google.com/favicon.ico',
    duckduckgo: 'https://duckduckgo.com/favicon.ico',
    bing:       'https://www.bing.com/favicon.ico',
    brave:      'https://brave.com/favicon.ico',
    ecosia:     'https://www.ecosia.org/favicon.ico',
  },

  getSearchEngine() {
    return localStorage.getItem('search_engine') || 'google';
  },

  selectSearchEngine(engine) {
    localStorage.setItem('search_engine', engine);
    // Update all search engine icons  
    const faviconUrl = this.SEARCH_ENGINE_FAVICONS[engine] || this.SEARCH_ENGINE_FAVICONS.google;
    document.querySelectorAll('.bottom-search-favicon').forEach(img => {
      img.src = faviconUrl;
    });
    // Update active state in dropdown
    document.querySelectorAll('.search-engine-option').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.engine === engine);
    });
  },

  submitBottomSearch() {
    const input = this.elements.bottomSearchInput;
    const query = input?.value?.trim();
    if (!query) return;

    // Check if it looks like a URL
    const looksLikeUrl = query.includes('.') && !query.includes(' ');
    let url;
    if (looksLikeUrl) {
      url = query.startsWith('http') ? query : `https://${query}`;
    } else {
      const engine = this.getSearchEngine();
      const baseUrl = this.SEARCH_ENGINES[engine] || this.SEARCH_ENGINES.google;
      url = baseUrl + encodeURIComponent(query);
    }

    BrowserState.navigateTo(url);
    input.value = '';
    input.blur();
    this.updateSubmitButtonState();
  },

  updateSubmitButtonState() {
    const input = this.elements.bottomSearchInput;
    const submit = this.elements.bottomSearchSubmit;
    if (!submit) return;
    const hasText = input?.value?.trim().length > 0;
    submit.classList.toggle('active', hasText);
  },

  /**
   * Bind DOM event listeners
   */
  bindEvents() {
    // Toolbar New Tab button (next to tab header)
    // New Tab button in tab strip
    this.elements.tabNewBtn?.addEventListener('click', () => {
      BrowserState.addTab();
    });

    // Double-click on tab strip empty area = new tab
    this.elements.tabStrip?.addEventListener('dblclick', (e) => {
      if (e.target === this.elements.tabStrip || e.target === this.elements.tabStripTabs) {
        BrowserState.addTab();
      }
    });

    // Back button
    this.elements.backBtn?.addEventListener('click', () => {
      this.navigateBack();
    });

    // Forward button
    this.elements.forwardBtn?.addEventListener('click', () => {
      this.navigateForward();
    });

    // Reload button
    this.elements.reloadBtn?.addEventListener('click', () => {
      this.reloadPage();
    });

    // Split pane click handlers (for focusing)
    this.elements.tabFrame1?.addEventListener('click', () => {
      if (BrowserState.splitView.enabled && BrowserState.splitView.activePane !== 1) {
        this.setActiveSplitPane(1);
      }
    });

    this.elements.tabFrame2?.addEventListener('click', () => {
      if (BrowserState.splitView.enabled && BrowserState.splitView.activePane !== 2) {
        this.setActiveSplitPane(2);
      }
    });

    // Address bar
    this.elements.addressInput?.addEventListener('focus', () => {
      BrowserState.setAddressBarFocus(true);
      this.elements.addressInput.select();
    });

    this.elements.addressInput?.addEventListener('blur', () => {
      BrowserState.setAddressBarFocus(false);
      // Hide suggestions after a small delay to allow click events
      setTimeout(() => this.hideSearchSuggestions(), 150);
    });

    // Address bar for pane 2
    this.elements.addressInput2?.addEventListener('focus', () => {
      this.elements.addressInput2.select();
    });

    this.elements.addressInput2?.addEventListener('blur', () => {
      setTimeout(() => this.hideSearchSuggestions(2), 150);
    });

    this.elements.addressInput?.addEventListener('input', (e) => {
      BrowserState.setAddressBarValue(e.target.value);
      this.updateSearchPlaceholder();
      this.fetchSearchSuggestions(e.target.value, 1);
    });

    this.elements.addressInput2?.addEventListener('input', (e) => {
      this.fetchSearchSuggestions(e.target.value, 2);
    });

    this.elements.addressInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const selectedSuggestion = this.getSelectedSuggestion(1);
        if (selectedSuggestion) {
          this.elements.addressInput.value = selectedSuggestion;
          BrowserState.setAddressBarValue(selectedSuggestion);
        }
        const url = BrowserState.commitAddressBar();
        this.navigateToUrl(url);
        this.elements.addressInput.blur();
        this.hideSearchSuggestions(1);
      } else if (e.key === 'Escape') {
        BrowserState.cancelAddressBarEdit();
        this.elements.addressInput.blur();
        this.hideSearchSuggestions(1);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectNextSuggestion(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectPrevSuggestion(1);
      }
    });

    this.elements.addressInput2?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const selectedSuggestion = this.getSelectedSuggestion(2);
        if (selectedSuggestion) {
          this.elements.addressInput2.value = selectedSuggestion;
        }
        // Navigate in pane 2
        const url = this.elements.addressInput2.value;
        if (url) {
          this.navigateToUrl(url, 2);
        }
        this.elements.addressInput2.blur();
        this.hideSearchSuggestions(2);
      } else if (e.key === 'Escape') {
        this.elements.addressInput2.blur();
        this.hideSearchSuggestions(2);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectNextSuggestion(2);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectPrevSuggestion(2);
      }
    });

    // Bottom search bar - submit on Enter
    this.elements.bottomSearchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submitBottomSearch();
      }
      if (e.key === 'Escape') {
        e.target.value = '';
        e.target.blur();
        this.updateSubmitButtonState();
      }
    });

    // Toggle submit button active state based on input
    this.elements.bottomSearchInput?.addEventListener('input', () => {
      this.updateSubmitButtonState();
    });

    // Bottom search bar - submit button
    this.elements.bottomSearchSubmit?.addEventListener('click', () => {
      this.submitBottomSearch();
    });

    // Close search engine dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-engine-dropdown')) {
        document.querySelectorAll('.search-engine-dropdown.open').forEach(d => d.classList.remove('open'));
      }
    });

    // Menu button - open settings
    document.getElementById('menu-btn')?.addEventListener('click', () => {
      this.openSettings();
    });

    // Settings modal handlers
    this.bindSettingsEvents();

    // Webview load events
    this.elements.webviewFrame?.addEventListener('load', () => {
      this.onWebviewLoad();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcut(e);
    });
  },

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboardShortcut(e) {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    // Cmd/Ctrl + ? or Cmd/Ctrl + /: Show keyboard shortcuts help
    if (modifier && (e.key === '?' || e.key === '/')) {
      e.preventDefault();
      this.showKeyboardShortcuts();
      return;
    }

    // Cmd/Ctrl + ,: Open settings
    if (modifier && e.key === ',') {
      e.preventDefault();
      this.openSettings();
      return;
    }

    // Cmd/Ctrl + F: Find in page
    if (modifier && e.key === 'f') {
      e.preventDefault();
      this.openFindInPage();
      return;
    }

    // Cmd/Ctrl + R: Reload
    if (modifier && e.key === 'r') {
      e.preventDefault();
      this.reloadPage();
      return;
    }

    // Cmd/Ctrl + L: Focus address bar
    if (modifier && e.key === 'l') {
      e.preventDefault();
      this.elements.addressInput?.focus();
      this.elements.addressInput?.select();
      return;
    }

    // Cmd/Ctrl + T: New tab
    if (modifier && e.key === 't') {
      e.preventDefault();
      BrowserState.addTab();
      return;
    }

    // Cmd/Ctrl + K: Focus bottom search bar
    if (modifier && e.key === 'k') {
      e.preventDefault();
      this.elements.bottomSearchInput?.focus();
      return;
    }

    // Cmd/Ctrl + W: Close tab
    if (modifier && e.key === 'w') {
      e.preventDefault();
      const activeTab = BrowserState.getActiveTab();
      if (activeTab) {
        BrowserState.removeTab(activeTab.id);
      }
      return;
    }

    // Cmd/Ctrl + Shift + T: Reopen closed tab (if we track closed tabs)
    // TODO: Implement closed tab history

    // Escape: Close find bar or settings
    if (e.key === 'Escape') {
      if (document.getElementById('settings-modal')?.classList.contains('visible')) {
        this.closeSettings();
        return;
      }
      if (this.findInPage.isOpen) {
        this.closeFindInPage();
      }
    }

    // Alt + Left: Go back
    if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      this.navigateBack();
      return;
    }

    // Alt + Right: Go forward
    if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      this.navigateForward();
      return;
    }

    // Cmd/Ctrl + \: Toggle split view
    if (modifier && e.key === '\\') {
      e.preventDefault();
      this.toggleSplitView();
      return;
    }

    // Cmd/Ctrl + Option/Alt + Left/Right: Switch split panes
    if (modifier && e.altKey && BrowserState.splitView.enabled) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.setActiveSplitPane(1);
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.setActiveSplitPane(2);
        return;
      }
    }
  },

  /**
   * Subscribe to state changes
   */
  subscribeToState() {
    BrowserState.on('stateChanged', () => this.render());
    BrowserState.on('tabAdded', (tab) => this.onTabAdded(tab));
    BrowserState.on('tabRemoved', (tab) => this.onTabRemoved(tab));
    BrowserState.on('activeTabChanged', (tab) => this.onActiveTabChanged(tab));
    BrowserState.on('addressBarChanged', () => this.renderAddressBar());
    BrowserState.on('ntpUpdated', () => this.renderNtp());
    BrowserState.on('loadingStateChanged', ({ tabId, isLoading }) => this.updateLoadingState(isLoading));
    
    // Split view events
    BrowserState.on('splitViewChanged', () => this.renderSplitView());
    BrowserState.on('splitPaneChanged', () => this.updateSplitPaneStyles());
    
    // Preload favicons for existing tabs and favorites
    this.preloadAllFavicons();
  },
  
  /**
   * Preload favicons for all tabs and favorites
   */
  preloadAllFavicons() {
    // Preload for existing tabs
    BrowserState.tabs.forEach(tab => {
      if (tab.url) {
        this.preloadFavicon(tab.url);
      }
    });
    
    // Preload for favorites
    BrowserState.ntp.favorites.forEach(fav => {
      if (fav.url) {
        this.preloadFavicon(fav.url);
      }
    });
  },

  /**
   * Main render function
   */
  render() {
    this.renderToolbar();
    // Render horizontal tab strip
    if (this._animatingTabs.size === 0) {
      this.renderTabStrip();
    }
    this.renderContent();
    this.renderAddressBar();
    this.renderBookmarks();
    this.renderNtpFavorites();
  },

  /**
   * Render toolbar state
   */
  renderToolbar() {
    // Update navigation buttons
    if (this.elements.backBtn) {
      this.elements.backBtn.disabled = !BrowserState.navigation.canGoBack;
    }
    if (this.elements.forwardBtn) {
      this.elements.forwardBtn.disabled = !BrowserState.navigation.canGoForward;
    }
  },

  /**
   * Render address bar
   */
  renderAddressBar() {
    if (this.elements.addressInput) {
      // Only update if not focused (avoid interrupting user typing)
      if (document.activeElement !== this.elements.addressInput) {
        this.elements.addressInput.value = BrowserState.addressBar.value;
      }
    }
    this.updateSearchPlaceholder();
  },

  /**
   * Update search placeholder visibility
   */
  updateSearchPlaceholder() {
    if (this.elements.searchPlaceholder) {
      const hasValue = this.elements.addressInput?.value?.length > 0;
      this.elements.searchPlaceholder.style.display = hasValue ? 'none' : '';
    }
  },

  /**
   * Animate tab close before removing
   */
  animateCloseTab(tabId, tabItem) {
    // Prevent double-closing
    if (tabItem.dataset.closing === 'true') return;
    tabItem.dataset.closing = 'true';
    
    // Mark tab as animating to prevent re-render interruption
    this._animatingTabs.add(tabId);
    
    // Find all instances of this tab in the strip
    const allTabItems = document.querySelectorAll(`.tab-strip-tab[data-tab-id="${tabId}"]`);
    
    if (window.Motion) {
      const animations = [];
      
      allTabItems.forEach(item => {
        item.dataset.closing = 'true';
        item.style.overflow = 'hidden';
        
        const width = item.offsetWidth || 180;
        
        // Also fade out adjacent divider
        const nextSibling = item.nextElementSibling;
        const prevSibling = item.previousElementSibling;
        const adjacentDivider = nextSibling?.classList.contains('tab-strip-divider') ? nextSibling : 
                                 prevSibling?.classList.contains('tab-strip-divider') ? prevSibling : null;
        
        if (adjacentDivider) {
          animations.push(
            window.Motion.animate(adjacentDivider, { opacity: [1, 0] }, { duration: 0.1, easing: [0.22, 1, 0.36, 1] })
          );
        }
        
        animations.push(
          window.Motion.animate(item, 
            { 
              opacity: [1, 0], 
              width: [width + 'px', '0px'],
              paddingLeft: ['4px', '0px'],
              paddingRight: ['4px', '0px']
            },
            { duration: 0.15, easing: [0.22, 1, 0.36, 1] }
          )
        );
      });
      
      Promise.all(animations).then(() => {
        this._animatingTabs.delete(tabId);
        BrowserState.removeTab(tabId);
      });
    } else {
      this._animatingTabs.delete(tabId);
      BrowserState.removeTab(tabId);
    }
  },

  /**
   * Render horizontal tab strip
   */
  renderTabStrip() {
    const container = this.elements.tabStripTabs;
    if (!container) return;

    const tabs = BrowserState.tabs;
    container.innerHTML = '';

    tabs.forEach((tab, i) => {
      const tabEl = this.createTabStripTab(tab);
      container.appendChild(tabEl);

      // Add divider after every tab — CSS handles hiding near active/hovered tabs
      const divider = document.createElement('div');
      divider.className = 'tab-strip-divider';
      container.appendChild(divider);
    });

    // Re-append the new tab button after all tabs so it flows inline
    if (this.elements.tabNewBtn) {
      container.appendChild(this.elements.tabNewBtn);
    }

  },

  /**
   * Create a single horizontal tab element
   */
  createTabStripTab(tab) {
    const isActive = tab.id === BrowserState.activeTabId;

    const el = document.createElement('div');
    el.className = `tab-strip-tab${isActive ? ' active' : ''}`;
    el.dataset.tabId = tab.id;
    el.draggable = true;

    const faviconHtml = this.createFaviconHtml({
      url: tab.url,
      faviconUrl: tab.faviconUrl
    });

    el.innerHTML = `
      <div class="tab-area">
        ${faviconHtml}
        <span class="tab-title">${this.escapeHtml(tab.title)}</span>
      </div>
      <button class="tab-close-btn" title="Close tab" aria-label="Close tab">
        <span class="sf-icon">􀆄</span>
      </button>
    `;

    // Click to activate
    el.addEventListener('click', (e) => {
      if (!e.target.closest('.tab-close-btn')) {
        this.closeSettings();
        BrowserState.setActiveTab(tab.id);
      }
    });

    // Middle-click to close
    el.addEventListener('mousedown', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this.animateCloseTab(tab.id, el);
      }
    });
    el.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this.animateCloseTab(tab.id, el);
      }
    });

    // Right-click context menu
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showTabContextMenu(e, tab);
    });

    // Close button
    const closeBtn = el.querySelector('.tab-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.animateCloseTab(tab.id, el);
    });



    // Drag and drop
    el.addEventListener('dragstart', (e) => this.onTabDragStart(e, tab));
    el.addEventListener('dragover', (e) => this.onTabDragOver(e));
    el.addEventListener('dragenter', (e) => this.onTabDragEnter(e));
    el.addEventListener('dragleave', (e) => this.onTabDragLeave(e));
    el.addEventListener('drop', (e) => this.onTabDrop(e, tab));
    el.addEventListener('dragend', (e) => this.onTabDragEnd(e));

    return el;
  },

  /**
   * Render toolbar bookmarks from favorites
   */
  renderBookmarks() {
    const container = this.elements.toolbarBookmarks;
    if (!container) return;

    container.innerHTML = '';

    // Use NTP favorites as bookmark source
    const favorites = BrowserState.ntp?.favorites || [];
    const maxBookmarks = 8;

    favorites.slice(0, maxBookmarks).forEach(fav => {
      const btn = document.createElement('button');
      btn.className = 'bookmark-btn';
      btn.title = fav.title;

      const faviconHtml = this.createFaviconHtml({
        url: fav.url,
        faviconUrl: fav.faviconUrl
      });
      btn.innerHTML = faviconHtml;

      btn.addEventListener('click', () => {
        BrowserState.addTab({ url: fav.url, title: fav.title, faviconUrl: fav.faviconUrl });
      });

      container.appendChild(btn);
    });
  },

  /**
   * Render NTP top-row favorites (on100 style)
   */
  renderNtpFavorites() {
    const containers = [
      document.getElementById('ntp-top-favorites'),
      document.getElementById('ntp-top-favorites-2')
    ];

    const favorites = BrowserState.ntp?.favorites || [];
    const maxBookmarks = 8;

    containers.forEach(container => {
      if (!container) return;
      container.innerHTML = '';

      favorites.slice(0, maxBookmarks).forEach(fav => {
        const btn = document.createElement('button');
        btn.className = 'ntp-fav-btn';
        btn.title = fav.title;

        const faviconHtml = this.createFaviconHtml({
          url: fav.url,
          faviconUrl: fav.faviconUrl
        });
        btn.innerHTML = faviconHtml;

        btn.addEventListener('click', () => {
          BrowserState.addTab({ url: fav.url, title: fav.title, faviconUrl: fav.faviconUrl });
        });

        container.appendChild(btn);
      });

      // Add "+" button
      const addBtn = document.createElement('button');
      addBtn.className = 'ntp-icon-btn';
      addBtn.title = 'Add favorite';
      addBtn.innerHTML = '<span class="sf-icon">􀅼</span>';
      addBtn.addEventListener('click', () => {
        // Open add-favorite flow (placeholder)
      });
      container.appendChild(addBtn);
    });
  },

  /**
   * Remove a favorite from NTP favorites
   */
  removeFavorite(url) {
    if (BrowserState.ntp?.favorites) {
      BrowserState.ntp.favorites = BrowserState.ntp.favorites.filter(f => f.url !== url);
      this.renderUI();
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB DRAG AND DROP
  // ═══════════════════════════════════════════════════════════════════════════

  draggedTab: null,

  onTabDragStart(e, tab) {
    this.draggedTab = tab;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tab.id);
  },

  onTabDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  },

  onTabDragEnter(e) {
    const tabItem = e.target.closest('.tab-strip-tab');
    if (tabItem && !tabItem.classList.contains('dragging')) {
      tabItem.classList.add('drag-over');
    }
  },

  onTabDragLeave(e) {
    const tabItem = e.target.closest('.tab-strip-tab');
    if (tabItem) {
      tabItem.classList.remove('drag-over');
    }
  },

  onTabDrop(e, targetTab) {
    e.preventDefault();
    const tabItem = e.target.closest('.tab-strip-tab');
    if (tabItem) {
      tabItem.classList.remove('drag-over');
    }

    if (!this.draggedTab || this.draggedTab.id === targetTab.id) return;

    // Reorder tabs in state
    BrowserState.reorderTab(this.draggedTab.id, targetTab.id);
  },

  onTabDragEnd(e) {
    e.target.classList.remove('dragging');
    this.draggedTab = null;
    
    // Clean up any remaining drag-over classes
    document.querySelectorAll('.tab-strip-tab.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB CONTEXT MENU
  // ═══════════════════════════════════════════════════════════════════════════

  showTabContextMenu(e, tab) {
    // Remove any existing context menu
    this.hideContextMenu();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id = 'tab-context-menu';

    const isPinned = tab.isPinned;

    menu.innerHTML = `
      <div class="context-menu-item" data-action="close">
        <span>Close Tab</span>
        <span class="shortcut">${navigator.platform.includes('Mac') ? '⌘W' : 'Ctrl+W'}</span>
      </div>
      <div class="context-menu-item" data-action="close-others">
        <span>Close Other Tabs</span>
      </div>
      <div class="context-menu-item" data-action="close-right">
        <span>Close Tabs to the Right</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="duplicate">
        <span>Duplicate Tab</span>
      </div>
      <div class="context-menu-item" data-action="pin">
        <span>${isPinned ? 'Unpin Tab' : 'Pin Tab'}</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="reload">
        <span>Reload Tab</span>
        <span class="shortcut">${navigator.platform.includes('Mac') ? '⌘R' : 'Ctrl+R'}</span>
      </div>
    `;

    // Position menu
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    // Handle menu item clicks
    menu.addEventListener('click', (event) => {
      const item = event.target.closest('.context-menu-item');
      if (!item) return;

      const action = item.dataset.action;
      this.handleTabContextAction(action, tab);
      this.hideContextMenu();
    });

    document.body.appendChild(menu);

    // Adjust position if menu goes off screen
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }

    // Close menu on click outside or escape
    const closeHandler = (event) => {
      if (!menu.contains(event.target)) {
        this.hideContextMenu();
        document.removeEventListener('click', closeHandler);
        document.removeEventListener('keydown', escHandler);
      }
    };
    const escHandler = (event) => {
      if (event.key === 'Escape') {
        this.hideContextMenu();
        document.removeEventListener('click', closeHandler);
        document.removeEventListener('keydown', escHandler);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closeHandler);
      document.addEventListener('keydown', escHandler);
    }, 0);
  },

  hideContextMenu() {
    const menu = document.getElementById('tab-context-menu');
    if (menu) {
      menu.remove();
    }
  },

  handleTabContextAction(action, tab) {
    switch (action) {
      case 'close':
        BrowserState.removeTab(tab.id);
        break;
      case 'close-others':
        BrowserState.closeOtherTabs(tab.id);
        break;
      case 'close-right':
        BrowserState.closeTabsToRight(tab.id);
        break;
      case 'duplicate':
        BrowserState.duplicateTab(tab.id);
        break;
      case 'pin':
        BrowserState.togglePinTab(tab.id);
        break;
      case 'reload':
        if (tab.id === BrowserState.activeTabId) {
          this.reloadPage();
        }
        break;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB PREVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  previewTimeout: null,

  showTabPreview(e, tab) {
    // Only show preview for tabs with URLs
    if (!tab.url || !tab.url.startsWith('http')) return;

    // Clear any existing timeout
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
    }

    // Delay showing preview
    this.previewTimeout = setTimeout(() => {
      this.renderTabPreview(e, tab);
    }, 500);
  },

  renderTabPreview(e, tab) {
    // Remove any existing preview
    this.hideTabPreview();

    const preview = document.createElement('div');
    preview.className = 'tab-preview';
    preview.id = 'tab-preview';

    // Extract domain from URL for display
    let displayUrl = tab.url;
    try {
      const urlObj = new URL(tab.url);
      displayUrl = urlObj.hostname;
    } catch (e) {
      // Use original URL if parsing fails
    }

    // Build thumbnail HTML only if available
    const thumbnailHtml = tab.thumbnailUrl 
      ? `<div class="tab-preview-thumbnail"><img src="${tab.thumbnailUrl}" alt="" /></div>`
      : '';

    preview.innerHTML = `
      <div class="tab-preview-url">${this.escapeHtml(displayUrl)}</div>
      ${thumbnailHtml}
    `;

    // Position preview below the tab strip
    const tabItem = e.target.closest('.tab-strip-tab');
    if (tabItem) {
      const rect = tabItem.getBoundingClientRect();
      preview.style.left = `${rect.left}px`;
      preview.style.top = `${rect.bottom + 8}px`;
    }

    document.body.appendChild(preview);

    // Adjust if off screen
    const previewRect = preview.getBoundingClientRect();
    if (previewRect.bottom > window.innerHeight) {
      preview.style.top = `${window.innerHeight - previewRect.height - 10}px`;
    }
  },

  hideTabPreview() {
    if (this.previewTimeout) {
      clearTimeout(this.previewTimeout);
      this.previewTimeout = null;
    }
    const preview = document.getElementById('tab-preview');
    if (preview) {
      preview.remove();
    }
  },

  /**
   * Capture thumbnail for a tab
   * @param {string} tabId - The tab ID to capture thumbnail for
   */
  async captureTabThumbnail(tabId) {
    const webview = this.elements.webviewFrame;
    if (!webview || !isElectron) return;
    
    const tab = BrowserState.tabs.find(t => t.id === tabId);
    if (!tab || !tab.url || !tab.url.startsWith('http')) return;
    
    try {
      // Use Electron's capturePage API
      const image = await webview.capturePage();
      if (image && !image.isEmpty()) {
        // Resize to a smaller thumbnail (200px width, maintaining aspect ratio)
        const resized = image.resize({ width: 300, quality: 'good' });
        const dataUrl = resized.toDataURL();
        
        // Update tab with thumbnail
        BrowserState.updateTab(tabId, { thumbnailUrl: dataUrl });
      }
    } catch (error) {
      console.log('[UI] Failed to capture thumbnail:', error);
    }
  },

  /**
   * Update favorite thumbnail if the URL matches a favorite
   * @param {string} url - The URL to check
   */
  async updateFavoriteThumbnail(url) {
    if (!url || !BrowserState.ntp?.favorites) return;
    
    // Normalize URL for comparison (remove trailing slash)
    const normalizedUrl = url.replace(/\/$/, '');
    
    // Find matching favorite
    const favorite = BrowserState.ntp.favorites.find(fav => {
      const favUrl = fav.url.replace(/\/$/, '');
      return favUrl === normalizedUrl || normalizedUrl.startsWith(favUrl);
    });
    
    if (!favorite) return;
    
    const webview = this.elements.webviewFrame;
    if (!webview || !isElectron) return;
    
    try {
      const image = await webview.capturePage();
      if (image && !image.isEmpty()) {
        const resized = image.resize({ width: 300, quality: 'good' });
        const dataUrl = resized.toDataURL();
        
        // Update favorite with thumbnail
        if (BrowserState.updateFavorite) {
          BrowserState.updateFavorite(favorite.id, { thumbnailUrl: dataUrl });
        } else {
          // Direct update if no method available
          favorite.thumbnailUrl = dataUrl;
          BrowserState.saveNtpData?.();
        }
      }
    } catch (error) {
      console.log('[UI] Failed to capture favorite thumbnail:', error);
    }
  },

  /**
   * Capture thumbnails for all tabs that need them
   */
  async captureAllThumbnails() {
    for (const tab of BrowserState.tabs) {
      if (tab.url && tab.url.startsWith('http') && !tab.thumbnailUrl) {
        // We can only capture the active tab's webview
        // For non-active tabs, we'd need a different approach
      }
    }
  },

  /**
   * Render main content area (NTP or webview)
   */
  renderContent() {
    const tab = BrowserState.getActiveTab();
    const hasUrl = tab && tab.url && tab.url.startsWith('http');
    const ntp = this.elements.newTabPage;
    const webviewContainer = this.elements.webviewContainer;
    const toolbarBookmarks = this.elements.toolbarBookmarks;

    // Toggle border on tab-frame for web pages
    const tabFrame = ntp?.closest('.tab-frame');
    if (tabFrame) {
      tabFrame.classList.toggle('showing-web', !!hasUrl);
    }

    // Hide toolbar bookmarks when NTP is showing (NTP has its own favorites row)
    if (toolbarBookmarks) {
      toolbarBookmarks.style.display = hasUrl ? '' : 'none';
    }

    if (hasUrl) {
      // Show webview with animation
      if (ntp && !ntp.classList.contains('hidden')) {
        // Animate NTP fading out
        if (typeof Motion !== 'undefined') {
          Motion.animate(ntp, 
            { opacity: [1, 0] },
            { duration: 0.15, easing: [0.22, 1, 0.36, 1] }
          ).finished.then(() => {
            ntp.classList.add('hidden');
            ntp.style.opacity = '';
          });
        } else {
          ntp.classList.add('hidden');
        }
      }
      
      // Animate webview fading in
      if (webviewContainer && !webviewContainer.classList.contains('active')) {
        webviewContainer.classList.add('active');
        if (typeof Motion !== 'undefined') {
          webviewContainer.style.opacity = '0';
          Motion.animate(webviewContainer, 
            { opacity: [0, 1] },
            { duration: 0.2, easing: [0.22, 1, 0.36, 1] }
          ).finished.then(() => {
            webviewContainer.style.opacity = '';
          });
        }
      }

    } else {
      // Show New Tab Page with animation
      if (webviewContainer && webviewContainer.classList.contains('active')) {
        // Animate webview fading out
        if (typeof Motion !== 'undefined') {
          Motion.animate(webviewContainer, 
            { opacity: [1, 0] },
            { duration: 0.15, easing: [0.22, 1, 0.36, 1] }
          ).finished.then(() => {
            webviewContainer.classList.remove('active');
            webviewContainer.style.opacity = '';
          });
        } else {
          webviewContainer.classList.remove('active');
        }
      }
      
      // Animate NTP fading in
      if (ntp && ntp.classList.contains('hidden')) {
        ntp.classList.remove('hidden');
        if (typeof Motion !== 'undefined') {
          ntp.style.opacity = '0';
          Motion.animate(ntp, 
            { opacity: [0, 1] },
            { duration: 0.2, easing: [0.22, 1, 0.36, 1] }
          ).finished.then(() => {
            ntp.style.opacity = '';
          });
        }
      }
      
      this.renderNtp();
      // Initialize content blocks system (batch) with fallback to direct AI
      if (typeof BlocksService !== 'undefined') {
        BlocksService.init('');
      } else if (typeof ContentCards !== 'undefined') {
        ContentCards.init('');
      }

    }
  },

  /**
   * Render New Tab Page content
   */
  renderNtp() {
    const ntpData = BrowserState.getNtpData();
    
    this.renderFavorites(ntpData.favorites);
    this.renderRecentChats(ntpData.recentChats);
    this.renderWidgets(ntpData.widgets);
  },

  /**
   * Render favorites row
   */
  renderFavorites(favorites) {
    if (!this.elements.favoritesRow) return;

    // Clear existing
    this.elements.favoritesRow.innerHTML = '';

    // Render favorites (max 12)
    favorites.slice(0, 12).forEach((fav, index) => {
      const favEl = document.createElement('div');
      favEl.className = `favorite-icon favicon-${fav.favicon || 'wikipedia'}`;
      favEl.title = fav.title;
      favEl.dataset.favoriteId = fav.id;
      favEl.dataset.index = index;
      favEl.draggable = true;

      // Click to navigate
      favEl.addEventListener('click', () => {
        this.navigateToUrl(fav.url);
      });

      // Right-click context menu
      favEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showFavoriteContextMenu(e, fav);
      });

      // Drag and drop
      favEl.addEventListener('dragstart', (e) => this.onFavoriteDragStart(e, fav));
      favEl.addEventListener('dragover', (e) => this.onFavoriteDragOver(e));
      favEl.addEventListener('dragenter', (e) => this.onFavoriteDragEnter(e));
      favEl.addEventListener('dragleave', (e) => this.onFavoriteDragLeave(e));
      favEl.addEventListener('drop', (e) => this.onFavoriteDrop(e, fav));
      favEl.addEventListener('dragend', (e) => this.onFavoriteDragEnd(e));

      this.elements.favoritesRow.appendChild(favEl);
    });

    // Add button
    const addBtn = document.createElement('button');
    addBtn.className = 'icon-btn icon-btn-lg add-favorite-btn';
    addBtn.title = 'Add Favorite';
    addBtn.setAttribute('aria-label', 'Add favorite');
    addBtn.innerHTML = '<span class="sf-icon sf-icon-md"> f0174</span>';
    addBtn.addEventListener('click', () => {
      this.showAddFavoriteDialog();
    });
    this.elements.favoritesRow.appendChild(addBtn);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FAVORITES DRAG AND DROP
  // ═══════════════════════════════════════════════════════════════════════════

  draggedFavorite: null,

  onFavoriteDragStart(e, fav) {
    this.draggedFavorite = fav;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  },

  onFavoriteDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  },

  onFavoriteDragEnter(e) {
    const favIcon = e.target.closest('.favorite-icon');
    if (favIcon && !favIcon.classList.contains('dragging')) {
      favIcon.classList.add('drag-over');
    }
  },

  onFavoriteDragLeave(e) {
    const favIcon = e.target.closest('.favorite-icon');
    if (favIcon) {
      favIcon.classList.remove('drag-over');
    }
  },

  onFavoriteDrop(e, targetFav) {
    e.preventDefault();
    const favIcon = e.target.closest('.favorite-icon');
    if (favIcon) {
      favIcon.classList.remove('drag-over');
    }

    if (!this.draggedFavorite || this.draggedFavorite.id === targetFav.id) return;

    BrowserState.reorderFavorite(this.draggedFavorite.id, targetFav.id);
  },

  onFavoriteDragEnd(e) {
    e.target.classList.remove('dragging');
    this.draggedFavorite = null;
    document.querySelectorAll('.favorite-icon.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FAVORITES CONTEXT MENU
  // ═══════════════════════════════════════════════════════════════════════════

  showFavoriteContextMenu(e, fav) {
    this.hideContextMenu();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id = 'tab-context-menu';

    menu.innerHTML = `
      <div class="context-menu-item" data-action="open">
        <span>Open</span>
      </div>
      <div class="context-menu-item" data-action="open-new-tab">
        <span>Open in New Tab</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="edit">
        <span>Edit</span>
      </div>
      <div class="context-menu-item" data-action="remove">
        <span>Remove</span>
      </div>
    `;

    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    menu.addEventListener('click', (event) => {
      const item = event.target.closest('.context-menu-item');
      if (!item) return;

      const action = item.dataset.action;
      this.handleFavoriteContextAction(action, fav);
      this.hideContextMenu();
    });

    document.body.appendChild(menu);

    // Adjust position if off-screen
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }

    // Close on click outside
    setTimeout(() => {
      const closeHandler = (event) => {
        if (!menu.contains(event.target)) {
          this.hideContextMenu();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 0);
  },

  handleFavoriteContextAction(action, fav) {
    switch (action) {
      case 'open':
        this.navigateToUrl(fav.url);
        break;
      case 'open-new-tab':
        BrowserState.addTab({ url: fav.url, title: fav.title });
        break;
      case 'edit':
        this.showEditFavoriteDialog(fav);
        break;
      case 'remove':
        BrowserState.removeFavorite(fav.id);
        break;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADD/EDIT FAVORITE DIALOGS
  // ═══════════════════════════════════════════════════════════════════════════

  showAddFavoriteDialog() {
    this.showFavoriteDialog({
      title: '',
      url: '',
      favicon: 'wikipedia'
    }, false);
  },

  showEditFavoriteDialog(fav) {
    this.showFavoriteDialog(fav, true);
  },

  showFavoriteDialog(fav, isEdit) {
    // Remove existing modal
    const existing = document.getElementById('favorite-dialog');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'favorite-dialog';
    modal.className = 'modal-overlay';

    const faviconOptions = [
      'google', 'youtube', 'wikipedia', 'reddit', 'twitter', 'facebook',
      'instagram', 'linkedin', 'netflix', 'spotify', 'amazon', 'github'
    ];

    modal.innerHTML = `
      <div class="modal-content favorite-dialog">
        <div class="modal-header">
          <h2>${isEdit ? 'Edit Favorite' : 'Add Favorite'}</h2>
          <button class="modal-close" onclick="document.getElementById('favorite-dialog').remove()" aria-label="Close">
            <span class="sf-icon sf-icon-sm"> f1067</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="setting-group">
            <label class="setting-label">Title</label>
            <input type="text" id="fav-title" class="setting-input" value="${this.escapeHtml(fav.title)}" placeholder="Website name">
          </div>
          <div class="setting-group">
            <label class="setting-label">URL</label>
            <input type="text" id="fav-url" class="setting-input" value="${this.escapeHtml(fav.url)}" placeholder="https://example.com">
          </div>
          <div class="setting-group">
            <label class="setting-label">Icon</label>
            <div class="favicon-picker">
              ${faviconOptions.map(f => `
                <div class="favicon-option favicon-${f} ${f === fav.favicon ? 'selected' : ''}" data-favicon="${f}"></div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('favorite-dialog').remove()">Cancel</button>
          <button class="btn btn-primary" id="save-favorite-btn">${isEdit ? 'Save' : 'Add'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Favicon picker
    let selectedFavicon = fav.favicon || 'wikipedia';
    modal.querySelectorAll('.favicon-option').forEach(opt => {
      opt.addEventListener('click', () => {
        modal.querySelectorAll('.favicon-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedFavicon = opt.dataset.favicon;
      });
    });

    // Save button
    document.getElementById('save-favorite-btn').addEventListener('click', () => {
      const title = document.getElementById('fav-title').value.trim();
      const url = document.getElementById('fav-url').value.trim();
      
      if (!url) {
        alert('Please enter a URL');
        return;
      }

      if (isEdit) {
        BrowserState.updateFavorite(fav.id, {
          title: title || url,
          url: url,
          favicon: selectedFavicon
        });
      } else {
        BrowserState.addFavorite({
          title: title || url,
          url: url,
          favicon: selectedFavicon
        });
      }

      modal.remove();
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  },

  /**
   * Render recent chats
   */
  renderRecentChats(chats) {
    if (!this.elements.chatsRow) return;

    this.elements.chatsRow.innerHTML = '';

    // Get real conversations from state
    const conversations = BrowserState.getRecentChats(4);
    
    if (conversations.length === 0) {
      // Show empty state
      const emptyState = document.createElement('div');
      emptyState.className = 'chats-empty-state';
      emptyState.innerHTML = `
        <p>No recent conversations</p>
        <p class="hint">Start a chat using the input below</p>
      `;
      this.elements.chatsRow.appendChild(emptyState);
      return;
    }

    conversations.forEach(conv => {
      const card = document.createElement('div');
      card.className = 'chat-card';
      card.dataset.conversationId = conv.id;

      // Use description from the processed chat data
      const preview = conv.description || 'New conversation';
      
      // Determine favicon based on context
      const favicon = conv.pageContext?.url ? this.getFaviconForUrl(conv.pageContext.url) : 'copilot';

      card.innerHTML = `
        <div class="chat-card-header">
          <div class="favicon favicon-${favicon}"></div>
          <span class="name">${this.escapeHtml(conv.title)}</span>
        </div>
        <div class="chat-card-description"><span>${this.escapeHtml(preview)}</span></div>
        <div class="chat-card-meta">
          <span class="time">${this.formatRelativeTime(conv.lastUpdated)}</span>
          <span class="message-count">${conv.messageCount} messages</span>
        </div>
      `;

      // Click to resume conversation
      card.addEventListener('click', () => {
        BrowserState.setActiveConversation(conv.id);
        console.log('[UI] Resumed conversation:', conv.id);
      });

      // Right-click to delete
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showChatContextMenu(e, conv);
      });

      this.elements.chatsRow.appendChild(card);
    });
  },

  /**
   * Show chat context menu
   */
  showChatContextMenu(e, conv) {
    this.hideContextMenu();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id = 'tab-context-menu';

    menu.innerHTML = `
      <div class="context-menu-item" data-action="open">
        <span>Continue Chat</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="delete">
        <span>Delete</span>
      </div>
    `;

    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    menu.addEventListener('click', (event) => {
      const item = event.target.closest('.context-menu-item');
      if (!item) return;

      const action = item.dataset.action;
      if (action === 'open') {
        BrowserState.setActiveConversation(conv.id);
      } else if (action === 'delete') {
        BrowserState.deleteConversation(conv.id);
      }
      this.hideContextMenu();
    });

    document.body.appendChild(menu);

    setTimeout(() => {
      const closeHandler = (event) => {
        if (!menu.contains(event.target)) {
          this.hideContextMenu();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 0);
  },

  /**
   * Format relative time
   */
  formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  },

  /**
   * Get favicon class for a URL
   */
  getFaviconForUrl(url) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const faviconMap = {
        'google.com': 'google', 'youtube.com': 'youtube', 'wikipedia.org': 'wikipedia',
        'reddit.com': 'reddit', 'twitter.com': 'twitter', 'x.com': 'x',
        'facebook.com': 'facebook', 'instagram.com': 'instagram', 'linkedin.com': 'linkedin',
        'netflix.com': 'netflix', 'spotify.com': 'spotify', 'amazon.com': 'amazon',
        'github.com': 'github', 'notion.so': 'notion', 'figma.com': 'figma'
      };
      for (const [domain, favicon] of Object.entries(faviconMap)) {
        if (hostname.includes(domain)) return favicon;
      }
    } catch (e) {}
    return 'wikipedia';
  },

  /**
   * Render widgets
   */
  renderWidgets(widgets) {
    if (!this.elements.widgetsRow) return;

    this.elements.widgetsRow.innerHTML = '';

    // Get enabled widgets from registry
    const enabledWidgets = BrowserState.getEnabledWidgets();

    if (enabledWidgets.length === 0) {
      // Show placeholder widgets
      this.renderPlaceholderWidgets();
      return;
    }

    enabledWidgets.forEach(widget => {
      const card = document.createElement('div');
      card.className = 'widget-card';
      card.dataset.widgetId = widget.id;

      card.innerHTML = `
        <div class="widget-card-header">
          <div class="widget-icon">${widget.icon || '📦'}</div>
          <span class="name">${this.escapeHtml(widget.title)}</span>
          <button class="widget-settings-btn" title="Widget settings">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4a1 1 0 100-2 1 1 0 000 2zm0 5a1 1 0 100-2 1 1 0 000 2zm0 5a1 1 0 100-2 1 1 0 000 2z"/>
            </svg>
          </button>
        </div>
        <div class="widget-card-content" id="widget-content-${widget.id}"></div>
      `;

      // Widget settings
      card.querySelector('.widget-settings-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showWidgetSettingsMenu(e, widget);
      });

      this.elements.widgetsRow.appendChild(card);

      // Render widget content
      const contentEl = card.querySelector('.widget-card-content');
      if (typeof widget.render === 'function') {
        widget.render(contentEl);
      }
    });

    // Add widget button
    const addWidgetBtn = document.createElement('button');
    addWidgetBtn.className = 'add-widget-btn';
    addWidgetBtn.setAttribute('aria-label', 'Add widget');
    addWidgetBtn.innerHTML = `
      <span class="sf-icon sf-icon-md"> f0174</span>
      <span>Add Widget</span>
    `;
    addWidgetBtn.addEventListener('click', () => this.showWidgetPicker());
    this.elements.widgetsRow.appendChild(addWidgetBtn);
  },

  renderPlaceholderWidgets() {
    const placeholders = [
      { title: 'Notes', icon: '📝' },
      { title: 'Weather', icon: '🌤️' }
    ];

    placeholders.forEach(p => {
      const card = document.createElement('div');
      card.className = 'widget-card placeholder';
      card.innerHTML = `
        <div class="widget-card-header">
          <div class="widget-icon">${p.icon}</div>
          <span class="name">${p.title}</span>
        </div>
        <div class="widget-card-content">
          <p class="widget-placeholder-text">Widget not configured</p>
        </div>
      `;
      this.elements.widgetsRow.appendChild(card);
    });
  },

  /**
   * Show widget settings menu
   */
  showWidgetSettingsMenu(e, widget) {
    this.hideContextMenu();

    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.id = 'tab-context-menu';

    menu.innerHTML = `
      <div class="context-menu-item" data-action="refresh">
        <span>Refresh</span>
      </div>
      <div class="context-menu-divider"></div>
      <div class="context-menu-item" data-action="remove">
        <span>Remove Widget</span>
      </div>
    `;

    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    menu.addEventListener('click', (event) => {
      const item = event.target.closest('.context-menu-item');
      if (!item) return;

      const action = item.dataset.action;
      if (action === 'refresh' && typeof widget.render === 'function') {
        const contentEl = document.getElementById(`widget-content-${widget.id}`);
        if (contentEl) widget.render(contentEl);
      } else if (action === 'remove') {
        BrowserState.disableWidget(widget.id);
      }
      this.hideContextMenu();
    });

    document.body.appendChild(menu);

    setTimeout(() => {
      const closeHandler = (event) => {
        if (!menu.contains(event.target)) {
          this.hideContextMenu();
          document.removeEventListener('click', closeHandler);
        }
      };
      document.addEventListener('click', closeHandler);
    }, 0);
  },

  /**
   * Show widget picker
   */
  showWidgetPicker() {
    const existing = document.getElementById('widget-picker');
    if (existing) existing.remove();

    const allWidgets = BrowserState.getAllWidgets();
    const enabledIds = BrowserState.ntp.enabledWidgets;

    const modal = document.createElement('div');
    modal.id = 'widget-picker';
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal-content widget-picker-modal">
        <div class="modal-header">
          <h2>Add Widget</h2>
          <button class="modal-close" onclick="document.getElementById('widget-picker').remove()" aria-label="Close">
            <span class="sf-icon sf-icon-sm"> f1067</span>
          </button>
        </div>
        <div class="modal-body">
          ${allWidgets.length === 0 ? '<p>No widgets available</p>' : ''}
          <div class="widget-picker-list">
            ${allWidgets.map(w => `
              <div class="widget-picker-item ${enabledIds.includes(w.id) ? 'enabled' : ''}" data-widget-id="${w.id}">
                <div class="widget-icon">${w.icon || '📦'}</div>
                <div class="widget-info">
                  <span class="widget-name">${this.escapeHtml(w.title)}</span>
                  <span class="widget-desc">${this.escapeHtml(w.description || '')}</span>
                </div>
                <div class="widget-toggle">
                  ${enabledIds.includes(w.id) ? '✓ Added' : 'Add'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Toggle widgets
    modal.querySelectorAll('.widget-picker-item').forEach(item => {
      item.addEventListener('click', () => {
        const widgetId = item.dataset.widgetId;
        if (BrowserState.isWidgetEnabled(widgetId)) {
          BrowserState.disableWidget(widgetId);
          item.classList.remove('enabled');
          item.querySelector('.widget-toggle').textContent = 'Add';
        } else {
          BrowserState.enableWidget(widgetId);
          item.classList.add('enabled');
          item.querySelector('.widget-toggle').textContent = '✓ Added';
        }
      });
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  },

  /**
   * Navigate to a URL
   */
  navigateToUrl(url) {
    if (!url) return;

    const normalizedUrl = BrowserState.normalizeUrl(url);
    
    // Ensure we have an active tab
    let tab = BrowserState.getActiveTab();
    if (!tab) {
      tab = BrowserState.addTab({ url: normalizedUrl, title: 'Loading...' });
    } else {
      BrowserState.updateTab(tab.id, { url: normalizedUrl, title: 'Loading...' });
    }

    // Update address bar
    BrowserState.addressBar.value = normalizedUrl;
    BrowserState.addressBar.isEditing = false;

    // Set loading state
    BrowserState.setTabLoading(tab.id, true);

    // Load in webview
    const webview = this.elements.webviewFrame;
    if (webview && normalizedUrl.startsWith('http')) {
      if (isElectron) {
        // Electron webview uses loadURL method
        webview.loadURL(normalizedUrl);
      } else {
        // Fallback for iframe
        webview.src = normalizedUrl;
      }
      this.elements.webviewContainer?.classList.add('active');
      this.elements.newTabPage?.classList.add('hidden');
    }

    console.log('[UI] Navigating to:', normalizedUrl);
  },

  /**
   * Navigate back
   */
  navigateBack() {
    const webview = this.elements.webviewFrame;
    if (isElectron && webview && webview.canGoBack()) {
      webview.goBack();
    } else if (webview?.contentWindow) {
      try {
        webview.contentWindow.history.back();
      } catch (e) {
        console.log('[UI] Cannot navigate back (cross-origin)');
      }
    }
  },

  /**
   * Navigate forward
   */
  navigateForward() {
    const webview = this.elements.webviewFrame;
    if (isElectron && webview && webview.canGoForward()) {
      webview.goForward();
    } else if (webview?.contentWindow) {
      try {
        webview.contentWindow.history.forward();
      } catch (e) {
        console.log('[UI] Cannot navigate forward (cross-origin)');
      }
    }
  },

  /**
   * Handle webview load complete
   */
  onWebviewLoad() {
    const tab = BrowserState.getActiveTab();
    if (!tab) return;

    BrowserState.setTabLoading(tab.id, false);

    // For Electron, title/favicon are handled by webview events
    if (isElectron) {
      this.updateNavigationState();
      return;
    }

    // Try to get title from iframe (fallback for non-Electron)
    try {
      const iframeDoc = this.elements.webviewFrame?.contentDocument;
      if (iframeDoc) {
        const title = iframeDoc.title || tab.url;
        BrowserState.updateTab(tab.id, { title });
      }
    } catch (e) {
      // Cross-origin - use URL as title
      const title = new URL(tab.url).hostname;
      BrowserState.updateTab(tab.id, { title });
    }

    console.log('[UI] Webview loaded');
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPLIT VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Toggle split view mode
   */
  toggleSplitView() {
    BrowserState.toggleSplitView();
    this.renderSplitView();
  },

  /**
   * Set the active split pane
   * @param {number} pane - 1 or 2
   */
  setActiveSplitPane(pane) {
    BrowserState.setActiveSplitPane(pane);
    this.updateSplitPaneStyles();
  },

  /**
   * Render split view based on state
   */
  renderSplitView() {
    const { enabled, activePane, pane1TabId, pane2TabId } = BrowserState.splitView;
    const pane1 = this.elements.tabFrame1;
    const pane2 = this.elements.tabFrame2;
    const container = this.elements.splitContainer;
    const self = this;
    
    // Toggle split mode class on container
    if (container) {
      container.classList.toggle('split-mode', enabled);
    }

    // Update split button active state
    if (this.elements.splitBtn) {
      this.elements.splitBtn.classList.toggle('active', enabled);
    }

    // Update pane styles
    this.updateSplitPaneStyles();

    // When entering split mode - instant, no animation
    if (enabled) {
      requestAnimationFrame(() => {
        const saved = localStorage.getItem('split_ratio');
        let ratio = 50;
        if (saved) {
          const parsed = parseFloat(saved);
          if (!isNaN(parsed) && parsed > 0 && parsed < 100) {
            ratio = parsed;
          }
        }
        this.setSplitRatio(ratio);
        this.updatePillPosition();
      });
    } else {
      // When exiting split mode - instant, no animation
      if (pane1) {
        pane1.style.width = '';
        pane1.style.flex = '';
      }
      if (pane2) {
        pane2.style.width = '';
        pane2.style.flex = '';
        pane2.style.opacity = '';
      }
      if (container) {
        container.style.removeProperty('--split-ratio');
      }
    }

    // Initialize webview for pane 2 if needed
    if (enabled && this.elements.webviewFrame2) {
      this.initWebviewPane2();
    }

    // Update tabs for each pane
    if (enabled) {
      this.updateSplitPaneTab(1, pane1TabId);
      this.updateSplitPaneTab(2, pane2TabId);
    }

    console.log('[UI] Split view rendered:', enabled ? 'enabled' : 'disabled');
  },

  /**
   * Update visual styles for active/inactive panes
   */
  updateSplitPaneStyles() {
    const { activePane } = BrowserState.splitView;
    
    if (this.elements.tabFrame1) {
      this.elements.tabFrame1.classList.toggle('split-active', activePane === 1);
    }
    if (this.elements.tabFrame2) {
      this.elements.tabFrame2.classList.toggle('split-active', activePane === 2);
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPLIT RESIZE HANDLE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize split resize handle events
   */
  initSplitResizeHandle() {
    const handle = this.elements.splitResizeHandle;
    const container = this.elements.splitContainer;
    const pane1 = this.elements.tabFrame1;
    const pane2 = this.elements.tabFrame2;
    
    if (!handle || !container) {
      console.error('[UI] Split resize handle or container not found!');
      return;
    }
    
    if (!pane1 || !pane2) {
      console.error('[UI] Tab frames not found!');
      return;
    }

    const self = this;
    let isDragging = false;
    let startX = 0;
    let startWidth1 = 0;

    // Mouse down starts the drag
    handle.addEventListener('mousedown', function(e) {
      // Only activate in split mode
      if (!container.classList.contains('split-mode')) {
        return;
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      isDragging = true;
      startX = e.clientX;
      startWidth1 = pane1.getBoundingClientRect().width;
      
      // Add dragging class
      handle.classList.add('dragging');
      document.body.classList.add('split-resizing');
      
      // Disable pointer events on webviews
      const wf1 = document.getElementById('webview-frame');
      const wf2 = document.getElementById('webview-frame-2');
      if (wf1) wf1.style.pointerEvents = 'none';
      if (wf2) wf2.style.pointerEvents = 'none';
    });

    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      
      const containerRect = container.getBoundingClientRect();
      
      // Account for settings pane if open
      const settingsPane = document.getElementById('settings-pane');
      let settingsWidth = 0;
      if (settingsPane && settingsPane.classList.contains('open')) {
        settingsWidth = settingsPane.getBoundingClientRect().width + 4; // width + margin
      }
      
      const containerWidth = containerRect.width - 4 - settingsWidth; // minus margin space and settings
      const deltaX = e.clientX - startX;
      
      let newWidth1 = startWidth1 + deltaX;
      
      // Enforce minimum 20% on each side, with a floor of 300px
      const minWidthPercent = containerWidth * 0.2;
      const minWidth = Math.max(300, minWidthPercent);
      newWidth1 = Math.max(minWidth, Math.min(containerWidth - minWidth, newWidth1));
      
      const newWidth2 = containerWidth - newWidth1;
      
      // Apply widths directly
      pane1.style.width = `${newWidth1}px`;
      pane2.style.width = `${newWidth2}px`;
      
      // Store ratio for persistence (ratio of available space, not including settings)
      const ratio = (newWidth1 / containerWidth) * 100;
      container.style.setProperty('--split-ratio', ratio);
      
      // Update pill position
      self.updatePillPosition();
    });

    document.addEventListener('mouseup', function() {
      if (!isDragging) return;
      
      isDragging = false;
      handle.classList.remove('dragging');
      document.body.classList.remove('split-resizing');
      
      // Re-enable pointer events on webviews
      const wf1 = document.getElementById('webview-frame');
      const wf2 = document.getElementById('webview-frame-2');
      if (wf1) wf1.style.pointerEvents = '';
      if (wf2) wf2.style.pointerEvents = '';
      
      // Save split ratio
      const ratio = container.style.getPropertyValue('--split-ratio');
      if (ratio) {
        localStorage.setItem('split_ratio', parseFloat(ratio).toString());
        console.log('[RESIZE] Saved ratio:', ratio);
      }
    });
    
    // Update pill position on window resize
    window.addEventListener('resize', () => {
      if (container.classList.contains('split-mode')) {
        // Get current ratio and recalculate widths
        const ratio = parseFloat(container.style.getPropertyValue('--split-ratio')) || 50;
        self.setSplitRatio(ratio);
      }
    });

    console.log('[UI] Split resize handle initialized');
  },

  /**
   * Get current split ratio as percentage (0-100)
   */
  getSplitRatio() {
    const container = this.elements.splitContainer;
    if (!container) return 50;
    
    const cssValue = getComputedStyle(container).getPropertyValue('--split-ratio');
    if (cssValue) {
      return parseFloat(cssValue) || 50;
    }
    return 50;
  },

  /**
   * Set split ratio and update pane widths
   * @param {number} ratio - Percentage (0-100) for left pane width
   */
  setSplitRatio(ratio) {
    const container = this.elements.splitContainer;
    const pane1 = this.elements.tabFrame1;
    const pane2 = this.elements.tabFrame2;
    const settingsPane = document.getElementById('settings-pane');
    
    if (!container || !pane1 || !pane2) {
      console.log('[UI] setSplitRatio - missing elements');
      return;
    }
    
    // Ensure ratio is valid
    if (isNaN(ratio) || ratio < 0 || ratio > 100) {
      ratio = 50;
    }
    
    // Store ratio
    container.style.setProperty('--split-ratio', ratio);
    
    // Calculate pixel widths - account for settings pane if open
    const containerRect = container.getBoundingClientRect();
    let settingsWidth = 0;
    if (settingsPane && settingsPane.classList.contains('open')) {
      const settingsRect = settingsPane.getBoundingClientRect();
      settingsWidth = settingsRect.width + 4; // width + margin-left
    }
    const containerWidth = containerRect.width - 4 - settingsWidth; // minus margin space and settings
    
    const width1 = (ratio / 100) * containerWidth;
    const width2 = containerWidth - width1;
    
    // Apply widths
    pane1.style.width = `${width1}px`;
    pane2.style.width = `${width2}px`;
    
    console.log('[UI] setSplitRatio:', ratio, '% -> pane1:', width1, 'px, pane2:', width2, 'px');
    
    // Update pill position
    this.updatePillPosition();
    
    // Update card visibility in single-row cards
    this.updateSingleRowCards();
  },

  /**
   * Update the pill position based on actual pane positions
   * This calculates where the first pane ends and positions the pill in the gap
   */
  updatePillPosition() {
    const container = this.elements.splitContainer;
    const pane1 = this.elements.tabFrame1;
    const handle = this.elements.splitResizeHandle;
    
    if (!container || !pane1 || !handle) return;
    if (!container.classList.contains('split-mode')) return;
    
    const containerRect = container.getBoundingClientRect();
    const pane1Rect = pane1.getBoundingClientRect();
    
    // Position pill at the right edge of pane1 + half the margin space (2px)
    const pillX = pane1Rect.right - containerRect.left + 2;
    
    // Set position directly - transform only handles horizontal centering now
    handle.style.left = `${pillX}px`;
    handle.style.transform = 'translateX(-50%)';
  },

  /**
   * Load saved split ratio from localStorage
   */
  loadSplitRatio() {
    const saved = localStorage.getItem('split_ratio');
    if (saved) {
      try {
        const ratio = parseFloat(saved);
        if (!isNaN(ratio) && ratio > 0 && ratio < 100) {
          this.setSplitRatio(ratio);
        }
      } catch (e) {
        console.error('[UI] Failed to load split ratio:', e);
      }
    }
  },

  /**
   * Reset split ratio to 50/50
   */
  resetSplitRatio() {
    this.setSplitRatio(50);
    localStorage.removeItem('split_ratio');
  },

  /**
   * Update the tab shown in a split pane
   * @param {number} pane - 1 or 2
   * @param {string} tabId - Tab ID
   */
  updateSplitPaneTab(pane, tabId) {
    const tab = BrowserState.getTab(tabId);
    if (!tab) return;

    if (pane === 1) {
      // Update pane 1 toolbar
      const titleEl = this.elements.toolbarTab?.querySelector('.tab-title');
      if (titleEl) titleEl.textContent = tab.title || 'New tab';
      
      const faviconEl = this.elements.toolbarTab?.querySelector('.favicon');
      if (faviconEl) {
        this.updateFaviconElement(faviconEl, tab);
      }
    } else if (pane === 2) {
      // Update pane 2 toolbar
      const titleEl = this.elements.toolbarTab2?.querySelector('.tab-title');
      if (titleEl) titleEl.textContent = tab.title || 'New tab';
      
      const faviconEl = this.elements.toolbarTab2?.querySelector('.favicon');
      if (faviconEl) {
        this.updateFaviconElement(faviconEl, tab);
      }
    }
  },

  /**
   * Initialize webview events for pane 2
   */
  initWebviewPane2() {
    const webview = this.elements.webviewFrame2;
    if (!webview || !isElectron || webview._eventsInitialized) return;

    webview._eventsInitialized = true;

    webview.addEventListener('dom-ready', () => {
      console.log('[UI] Webview 2 DOM ready');
    });

    webview.addEventListener('did-start-loading', () => {
      const tabId = BrowserState.splitView.pane2TabId;
      if (tabId) {
        BrowserState.setTabLoading(tabId, true);
      }
    });

    webview.addEventListener('did-stop-loading', () => {
      const tabId = BrowserState.splitView.pane2TabId;
      if (tabId) {
        BrowserState.setTabLoading(tabId, false);
      }
    });

    webview.addEventListener('did-navigate', (e) => {
      const tabId = BrowserState.splitView.pane2TabId;
      if (tabId) {
        BrowserState.updateTab(tabId, { url: e.url });
        if (BrowserState.splitView.activePane === 2) {
          BrowserState.addressBar.value = e.url;
          BrowserState.emit('addressBarChanged');
        }
      }
    });

    webview.addEventListener('page-title-updated', (e) => {
      const tabId = BrowserState.splitView.pane2TabId;
      if (tabId) {
        BrowserState.updateTab(tabId, { title: e.title });
        this.updateSplitPaneTab(2, tabId);
      }
    });

    webview.addEventListener('page-favicon-updated', (e) => {
      const tabId = BrowserState.splitView.pane2TabId;
      if (tabId && e.favicons && e.favicons.length > 0) {
        BrowserState.updateTab(tabId, { faviconUrl: e.favicons[0] });
      }
    });

    console.log('[UI] Webview 2 events initialized');
  },

  /**
   * Show/hide loading indicator
   */
  showLoadingIndicator(show) {
    if (this.elements.toolbarTab) {
      this.elements.toolbarTab.classList.toggle('loading', show);
    }
    // Also update the loading bar if it exists
    const loadingBar = document.getElementById('loading-bar');
    if (loadingBar) {
      loadingBar.classList.toggle('active', show);
    }
  },

  /**
   * Show error page for failed loads
   */
  showErrorPage(url, errorDescription, errorCode) {
    // Create error page if it doesn't exist
    let errorPage = document.getElementById('error-page');
    if (!errorPage) {
      errorPage = document.createElement('div');
      errorPage.id = 'error-page';
      errorPage.className = 'error-page';
      this.elements.webviewContainer?.parentElement?.appendChild(errorPage);
    }

    // Get user-friendly error message
    const friendlyMessage = this.getErrorMessage(errorCode, errorDescription);

    errorPage.innerHTML = `
      <div class="error-content">
        <div class="error-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 8v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
          </svg>
        </div>
        <h1 class="error-title">${friendlyMessage.title}</h1>
        <p class="error-description">${friendlyMessage.description}</p>
        <p class="error-url">${this.escapeHtml(url)}</p>
        <div class="error-actions">
          <button class="error-retry-btn" onclick="UIBindings.retryNavigation()">Try again</button>
        </div>
        <details class="error-details">
          <summary>Technical details</summary>
          <p>Error code: ${errorCode}</p>
          <p>${this.escapeHtml(errorDescription)}</p>
        </details>
      </div>
    `;

    errorPage.classList.add('active');
    this.elements.webviewContainer?.classList.remove('active');
  },

  /**
   * Hide error page
   */
  hideErrorPage() {
    const errorPage = document.getElementById('error-page');
    if (errorPage) {
      errorPage.classList.remove('active');
    }
  },

  /**
   * Get user-friendly error message
   */
  getErrorMessage(errorCode, errorDescription) {
    const messages = {
      '-2': { title: 'Network error', description: 'Unable to connect. Check your internet connection.' },
      '-3': { title: 'Aborted', description: 'The page load was cancelled.' },
      '-6': { title: 'File not found', description: 'The requested file could not be found.' },
      '-7': { title: 'Timed out', description: 'The connection timed out. Try again later.' },
      '-10': { title: 'Access denied', description: 'Access to this resource was denied.' },
      '-21': { title: 'Network changed', description: 'Network connection changed during loading.' },
      '-100': { title: 'Connection closed', description: 'The connection was closed unexpectedly.' },
      '-101': { title: 'Connection reset', description: 'The connection was reset.' },
      '-102': { title: 'Connection refused', description: 'The server refused the connection.' },
      '-103': { title: 'Connection failed', description: 'Unable to establish a connection.' },
      '-104': { title: 'Name not resolved', description: 'The server name could not be found.' },
      '-105': { title: 'DNS error', description: 'Unable to resolve the DNS address.' },
      '-106': { title: 'Internet disconnected', description: 'You appear to be offline.' },
      '-118': { title: 'Connection timed out', description: 'The connection timed out.' },
      '-200': { title: 'Certificate error', description: 'There is a problem with the site\'s security certificate.' },
      '-201': { title: 'Certificate date invalid', description: 'The site\'s security certificate has expired.' },
      '-202': { title: 'Certificate authority invalid', description: 'The certificate is not from a trusted authority.' },
    };

    return messages[errorCode.toString()] || {
      title: 'Page failed to load',
      description: errorDescription || 'An unknown error occurred.'
    };
  },

  /**
   * Retry navigation to the current URL
   */
  retryNavigation() {
    const tab = BrowserState.getActiveTab();
    if (tab && tab.url) {
      this.hideErrorPage();
      this.navigateToUrl(tab.url);
    }
  },

  /**
   * Reload the current page
   */
  reloadPage() {
    const webview = this.elements.webviewFrame;
    if (isElectron && webview) {
      webview.reload();
    } else if (webview) {
      webview.src = webview.src;
    }
  },

  /**
   * Stop loading the current page
   */
  stopLoading() {
    const webview = this.elements.webviewFrame;
    if (isElectron && webview) {
      webview.stop();
    }
    this.showLoadingIndicator(false);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FIND IN PAGE
  // ═══════════════════════════════════════════════════════════════════════════

  findInPage: {
    isOpen: false,
    query: '',
    currentMatch: 0,
    totalMatches: 0
  },

  /**
   * Open find-in-page dialog
   */
  openFindInPage() {
    this.findInPage.isOpen = true;
    this.renderFindBar();
    
    const findInput = document.getElementById('find-input');
    findInput?.focus();
    findInput?.select();
  },

  /**
   * Close find-in-page dialog
   */
  closeFindInPage() {
    this.findInPage.isOpen = false;
    this.findInPage.query = '';
    this.findInPage.currentMatch = 0;
    this.findInPage.totalMatches = 0;
    
    // Stop find in webview
    const webview = this.elements.webviewFrame;
    if (isElectron && webview) {
      webview.stopFindInPage('clearSelection');
    }
    
    // Remove find bar
    const findBar = document.getElementById('find-bar');
    if (findBar) {
      findBar.remove();
    }
  },

  /**
   * Render find-in-page bar
   */
  renderFindBar() {
    // Remove existing find bar
    let findBar = document.getElementById('find-bar');
    if (!findBar) {
      findBar = document.createElement('div');
      findBar.id = 'find-bar';
      findBar.className = 'find-bar';
      this.elements.toolbar?.parentElement?.insertBefore(findBar, this.elements.toolbar.nextSibling);
    }

    findBar.innerHTML = `
      <div class="find-bar-content">
        <input type="text" id="find-input" class="find-input" placeholder="Find in page" value="${this.escapeHtml(this.findInPage.query)}">
        <span class="find-matches">${this.findInPage.totalMatches > 0 ? `${this.findInPage.currentMatch}/${this.findInPage.totalMatches}` : ''}</span>
        <button class="find-btn find-prev" title="Previous match">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 4l-4 4h8l-4-4z"/></svg>
        </button>
        <button class="find-btn find-next" title="Next match">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 12l4-4H4l4 4z"/></svg>
        </button>
        <button class="find-btn find-close" title="Close">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
        </button>
      </div>
    `;

    // Bind events
    const findInput = findBar.querySelector('#find-input');
    findInput?.addEventListener('input', (e) => {
      this.findInPage.query = e.target.value;
      this.executeFind();
    });
    findInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          this.findPrevious();
        } else {
          this.findNext();
        }
      } else if (e.key === 'Escape') {
        this.closeFindInPage();
      }
    });

    findBar.querySelector('.find-prev')?.addEventListener('click', () => this.findPrevious());
    findBar.querySelector('.find-next')?.addEventListener('click', () => this.findNext());
    findBar.querySelector('.find-close')?.addEventListener('click', () => this.closeFindInPage());
  },

  /**
   * Execute find in webview
   */
  executeFind() {
    const webview = this.elements.webviewFrame;
    if (!isElectron || !webview || !this.findInPage.query) {
      this.findInPage.currentMatch = 0;
      this.findInPage.totalMatches = 0;
      this.updateFindMatches();
      return;
    }

    webview.findInPage(this.findInPage.query)
      .then(result => {
        this.findInPage.currentMatch = result.activeMatchOrdinal;
        this.findInPage.totalMatches = result.matches;
        this.updateFindMatches();
      })
      .catch(err => {
        console.log('[UI] Find error:', err);
      });
  },

  /**
   * Find next match
   */
  findNext() {
    const webview = this.elements.webviewFrame;
    if (!isElectron || !webview || !this.findInPage.query) return;

    webview.findInPage(this.findInPage.query, { forward: true, findNext: true })
      .then(result => {
        this.findInPage.currentMatch = result.activeMatchOrdinal;
        this.findInPage.totalMatches = result.matches;
        this.updateFindMatches();
      });
  },

  /**
   * Find previous match
   */
  findPrevious() {
    const webview = this.elements.webviewFrame;
    if (!isElectron || !webview || !this.findInPage.query) return;

    webview.findInPage(this.findInPage.query, { forward: false, findNext: true })
      .then(result => {
        this.findInPage.currentMatch = result.activeMatchOrdinal;
        this.findInPage.totalMatches = result.matches;
        this.updateFindMatches();
      });
  },

  /**
   * Update find matches display
   */
  updateFindMatches() {
    const matchesEl = document.querySelector('.find-matches');
    if (matchesEl) {
      matchesEl.textContent = this.findInPage.totalMatches > 0 
        ? `${this.findInPage.currentMatch}/${this.findInPage.totalMatches}` 
        : '';
    }
  },

  /**
   * Update loading state UI
   */
  updateLoadingState(isLoading) {
    // Could add a loading spinner or progress bar here
    if (this.elements.toolbarTab) {
      this.elements.toolbarTab.classList.toggle('loading', isLoading);
    }
  },

  /**
   * Update favicon element with URL or fallback class
   */
  updateFavicon(element, favicon) {
    // Remove existing favicon classes
    const classes = Array.from(element.classList);
    classes.forEach(cls => {
      if (cls.startsWith('favicon-')) {
        element.classList.remove(cls);
      }
    });
    // Add new favicon class
    element.classList.add(`favicon-${favicon || 'default'}`);
  },

  /**
   * Event handlers
   */
  
  // Track tabs being animated to prevent re-render interruption
  _animatingTabs: new Set(),
  
  onTabAdded(tab) {
    console.log('[UI] Tab added:', tab.title);
    // Preload favicon when tab is created
    if (tab.url) {
      this.preloadFavicon(tab.url);
    }
    
    // Mark tab as animating
    this._animatingTabs.add(tab.id);
    
    this.renderTabStrip();
    
    // Animate new tab in the tab strip
    // Use double rAF to ensure DOM is fully laid out
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const tabItems = document.querySelectorAll(`.tab-strip-tab[data-tab-id="${tab.id}"]`);
        if (tabItems.length === 0) {
          this._animatingTabs.delete(tab.id);
          return;
        }
        
        tabItems.forEach(tabItem => {
          if (tabItem && window.Motion) {
            // Get actual width before hiding
            const width = tabItem.offsetWidth || 180; // fallback width
            
            // Set initial state
            tabItem.style.width = '0px';
            tabItem.style.opacity = '0';
            tabItem.style.overflow = 'hidden';
            
            window.Motion.animate(tabItem, 
              { 
                opacity: [0, 1], 
                width: ['0px', width + 'px']
              },
              { duration: 0.2, easing: [0.22, 1, 0.36, 1] }
            ).then(() => {
              tabItem.style.width = '';
              tabItem.style.overflow = '';
              tabItem.style.opacity = '';
              this._animatingTabs.delete(tab.id);
            });
          } else {
            this._animatingTabs.delete(tab.id);
          }
        });
      });
    });
  },

  onTabRemoved(tab) {
    console.log('[UI] Tab removed:', tab.title);
    // Animation already handled by animateCloseTab before removal
    // Just re-render the tab strip to clean up
    this.renderTabStrip();
  },

  onActiveTabChanged(tab) {
    console.log('[UI] Active tab changed:', tab?.title);
    
    // Ensure home tabs always have correct title
    if (tab && (!tab.url || tab.url === '' || tab.url === 'about:blank')) {
      if (tab.title !== 'Home') {
        BrowserState.updateTab(tab.id, { title: 'Home', faviconUrl: null });
      }
    }
    
    this.render();
    
    // Navigate to URL if tab has one
    const webview = this.elements.webviewFrame;
    if (tab?.url && tab.url.startsWith('http') && webview) {
      const currentUrl = isElectron ? webview.getURL?.() : webview.src;
      if (currentUrl !== tab.url) {
        if (isElectron) {
          webview.loadURL(tab.url);
        } else {
          webview.src = tab.url;
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTINGS MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Show main settings modal
   * @param {string} section - Initial section to show ('appearance', 'search', 'ai', 'privacy', 'data')
   */
  showSettings(section = 'appearance') {
    this.hideSettings();

    const settings = BrowserState.getSettings();
    const hasApiKey = typeof AIService !== 'undefined' && AIService.isConfigured();

    const modal = document.createElement('div');
    modal.id = 'settings-modal';
    modal.className = 'modal-overlay';

    modal.innerHTML = `
      <div class="modal-content settings-modal">
        <div class="modal-header">
          <h2>Settings</h2>
          <button class="modal-close" onclick="UIBindings.hideSettings()" aria-label="Close">
            <span class="sf-icon sf-icon-sm"> f1067</span>
          </button>
        </div>
        <div class="settings-layout">
          <nav class="settings-nav">
            <button class="settings-nav-item ${section === 'appearance' ? 'active' : ''}" data-section="appearance">
              <span class="nav-icon">🎨</span>
              <span>Appearance</span>
            </button>
            <button class="settings-nav-item ${section === 'search' ? 'active' : ''}" data-section="search">
              <span class="nav-icon">🔍</span>
              <span>Search</span>
            </button>
            <button class="settings-nav-item ${section === 'ai' ? 'active' : ''}" data-section="ai">
              <span class="nav-icon">🤖</span>
              <span>AI</span>
            </button>
            <button class="settings-nav-item ${section === 'privacy' ? 'active' : ''}" data-section="privacy">
              <span class="nav-icon">🔒</span>
              <span>Privacy</span>
            </button>
            <button class="settings-nav-item ${section === 'data' ? 'active' : ''}" data-section="data">
              <span class="nav-icon">💾</span>
              <span>Data</span>
            </button>
          </nav>
          <div class="settings-content">
            <!-- Appearance Section -->
            <div class="settings-section ${section === 'appearance' ? 'active' : ''}" data-section="appearance">
              <h3>Appearance</h3>
              <div class="setting-group">
                <label class="setting-label">Theme</label>
                <div class="theme-options">
                  <button class="theme-option ${settings.theme === 'light' ? 'selected' : ''}" data-theme="light">
                    <span class="theme-icon">☀️</span>
                    <span>Light</span>
                  </button>
                  <button class="theme-option ${settings.theme === 'dark' ? 'selected' : ''}" data-theme="dark">
                    <span class="theme-icon">🌙</span>
                    <span>Dark</span>
                  </button>
                  <button class="theme-option ${settings.theme === 'system' ? 'selected' : ''}" data-theme="system">
                    <span class="theme-icon">💻</span>
                    <span>System</span>
                  </button>
                </div>
              </div>
              <div class="setting-group">
                <label class="setting-label">Accent Color</label>
                <div class="accent-options">
                  <button class="accent-option accent-default ${settings.accentColor === 'default' ? 'selected' : ''}" data-accent="default" title="Default"></button>
                  <button class="accent-option accent-blue ${settings.accentColor === 'blue' ? 'selected' : ''}" data-accent="blue" title="Blue"></button>
                  <button class="accent-option accent-purple ${settings.accentColor === 'purple' ? 'selected' : ''}" data-accent="purple" title="Purple"></button>
                  <button class="accent-option accent-green ${settings.accentColor === 'green' ? 'selected' : ''}" data-accent="green" title="Green"></button>
                  <button class="accent-option accent-orange ${settings.accentColor === 'orange' ? 'selected' : ''}" data-accent="orange" title="Orange"></button>
                </div>
              </div>
            </div>

            <!-- Search Section -->
            <div class="settings-section ${section === 'search' ? 'active' : ''}" data-section="search">
              <h3>Search</h3>
              <div class="setting-group">
                <label class="setting-label">Default Search Engine</label>
                <select id="settings-search-engine" class="setting-select">
                  <option value="google" ${settings.searchEngine === 'google' ? 'selected' : ''}>Google</option>
                  <option value="bing" ${settings.searchEngine === 'bing' ? 'selected' : ''}>Bing</option>
                  <option value="duckduckgo" ${settings.searchEngine === 'duckduckgo' ? 'selected' : ''}>DuckDuckGo</option>
                  <option value="brave" ${settings.searchEngine === 'brave' ? 'selected' : ''}>Brave Search</option>
                </select>
              </div>
              <div class="setting-group">
                <label class="setting-toggle">
                  <input type="checkbox" id="settings-search-suggestions" ${settings.showSearchSuggestions ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                  <span class="toggle-label">Show search suggestions</span>
                </label>
                <p class="setting-hint">Display search suggestions as you type in the address bar</p>
              </div>
            </div>

            <!-- AI Section -->
            <div class="settings-section ${section === 'ai' ? 'active' : ''}" data-section="ai">
              <h3>AI Assistant</h3>
              <div class="setting-group">
                <label class="setting-label">Provider</label>
                <select id="settings-ai-provider" class="setting-select">
                  <option value="openai" ${settings.aiProvider === 'openai' ? 'selected' : ''}>OpenAI</option>
                  <option value="anthropic" ${settings.aiProvider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
                </select>
              </div>
              <div class="setting-group">
                <label class="setting-label">Model</label>
                <select id="settings-ai-model" class="setting-select">
                  ${this.getModelOptionsForSettings(settings.aiProvider, settings.aiModel)}
                </select>
              </div>
              <div class="setting-group">
                <label class="setting-label">
                  API Key 
                  ${hasApiKey ? '<span class="key-status configured">✓ Configured</span>' : '<span class="key-status">Not set</span>'}
                </label>
                <input type="password" id="settings-ai-key" class="setting-input" placeholder="Enter your API key">
                <p class="setting-hint">Your API key is stored locally and never sent to our servers.</p>
              </div>
            </div>

            <!-- Privacy Section -->
            <div class="settings-section ${section === 'privacy' ? 'active' : ''}" data-section="privacy">
              <h3>Privacy</h3>
              <div class="setting-group">
                <label class="setting-toggle">
                  <input type="checkbox" id="settings-clear-on-exit" ${settings.clearDataOnExit ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                  <span class="toggle-label">Clear browsing data on exit</span>
                </label>
              </div>
              <div class="setting-group">
                <label class="setting-toggle">
                  <input type="checkbox" id="settings-block-trackers" ${settings.blockTrackers ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                  <span class="toggle-label">Block trackers</span>
                </label>
              </div>
              <div class="setting-group">
                <label class="setting-toggle">
                  <input type="checkbox" id="settings-dnt" ${settings.doNotTrack ? 'checked' : ''}>
                  <span class="toggle-slider"></span>
                  <span class="toggle-label">Send "Do Not Track" requests</span>
                </label>
              </div>
            </div>

            <!-- Data Section -->
            <div class="settings-section ${section === 'data' ? 'active' : ''}" data-section="data">
              <h3>Data Management</h3>
              <div class="setting-group">
                <label class="setting-label">Export Data</label>
                <p class="setting-hint">Download all your favorites, conversations, and settings as a JSON file.</p>
                <button class="btn btn-secondary" id="export-data-btn">
                  <span>Export Data</span>
                </button>
              </div>
              <div class="setting-group">
                <label class="setting-label">Import Data</label>
                <p class="setting-hint">Restore data from a previously exported file.</p>
                <input type="file" id="import-data-input" accept=".json" style="display: none;">
                <button class="btn btn-secondary" id="import-data-btn">
                  <span>Import Data</span>
                </button>
              </div>
              <div class="setting-group setting-danger">
                <label class="setting-label">Clear Data</label>
                <p class="setting-hint">Permanently delete your browsing data. This cannot be undone.</p>
                <div class="clear-data-options">
                  <label class="checkbox-label">
                    <input type="checkbox" id="clear-favorites"> Favorites
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" id="clear-conversations"> Conversations
                  </label>
                  <label class="checkbox-label">
                    <input type="checkbox" id="clear-settings"> Settings
                  </label>
                </div>
                <button class="btn btn-danger" id="clear-data-btn">
                  <span>Clear Selected Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Bind navigation
    modal.querySelectorAll('.settings-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetSection = btn.dataset.section;
        modal.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
        modal.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        modal.querySelector(`.settings-section[data-section="${targetSection}"]`)?.classList.add('active');
      });
    });

    // Theme selection
    modal.querySelectorAll('.theme-option').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.theme-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        BrowserState.setSetting('theme', btn.dataset.theme);
      });
    });

    // Accent color selection
    modal.querySelectorAll('.accent-option').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.accent-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        BrowserState.setSetting('accentColor', btn.dataset.accent);
      });
    });

    // Search engine
    document.getElementById('settings-search-engine')?.addEventListener('change', (e) => {
      BrowserState.setSetting('searchEngine', e.target.value);
    });

    // Search suggestions
    document.getElementById('settings-search-suggestions')?.addEventListener('change', (e) => {
      BrowserState.setSetting('showSearchSuggestions', e.target.checked);
    });

    // AI provider change - update model options
    document.getElementById('settings-ai-provider')?.addEventListener('change', (e) => {
      const modelSelect = document.getElementById('settings-ai-model');
      if (modelSelect) {
        modelSelect.innerHTML = this.getModelOptionsForSettings(e.target.value);
      }
      BrowserState.setSetting('aiProvider', e.target.value);
      if (typeof AIService !== 'undefined') {
        AIService.setProvider(e.target.value);
      }
    });

    // AI model
    document.getElementById('settings-ai-model')?.addEventListener('change', (e) => {
      BrowserState.setSetting('aiModel', e.target.value);
      if (typeof AIService !== 'undefined') {
        AIService.setModel(e.target.value);
      }
    });

    // AI API key
    document.getElementById('settings-ai-key')?.addEventListener('change', (e) => {
      if (e.target.value && typeof AIService !== 'undefined') {
        AIService.setApiKey(e.target.value);
        // Update the status indicator
        const label = modal.querySelector('.settings-section[data-section="ai"] .key-status');
        if (label) {
          label.textContent = '✓ Configured';
          label.classList.add('configured');
        }
      }
    });

    // Privacy toggles
    document.getElementById('settings-clear-on-exit')?.addEventListener('change', (e) => {
      BrowserState.setSetting('clearDataOnExit', e.target.checked);
    });
    document.getElementById('settings-block-trackers')?.addEventListener('change', (e) => {
      BrowserState.setSetting('blockTrackers', e.target.checked);
    });
    document.getElementById('settings-dnt')?.addEventListener('change', (e) => {
      BrowserState.setSetting('doNotTrack', e.target.checked);
    });

    // Export data
    document.getElementById('export-data-btn')?.addEventListener('click', () => {
      this.exportUserData();
    });

    // Import data
    document.getElementById('import-data-btn')?.addEventListener('click', () => {
      document.getElementById('import-data-input')?.click();
    });
    document.getElementById('import-data-input')?.addEventListener('change', (e) => {
      this.importUserData(e.target.files[0]);
    });

    // Clear data
    document.getElementById('clear-data-btn')?.addEventListener('click', () => {
      const options = {
        favorites: document.getElementById('clear-favorites')?.checked,
        conversations: document.getElementById('clear-conversations')?.checked,
        settings: document.getElementById('clear-settings')?.checked
      };
      
      if (!options.favorites && !options.conversations && !options.settings) {
        alert('Please select at least one type of data to clear.');
        return;
      }
      
      if (confirm('Are you sure you want to clear the selected data? This cannot be undone.')) {
        BrowserState.clearData(options);
        this.hideSettings();
      }
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.hideSettings();
    });

    // Close on escape
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.hideSettings();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  },

  /**
   * Hide settings modal
   */
  hideSettings() {
    document.getElementById('settings-modal')?.remove();
  },

  /**
   * Get model options for settings modal
   */
  getModelOptionsForSettings(provider, selectedModel) {
    if (typeof AIService === 'undefined') return '';
    
    const models = AIService.models[provider] || [];
    return models.map(m => 
      `<option value="${m.id}" ${m.id === selectedModel ? 'selected' : ''}>${m.name}</option>`
    ).join('');
  },

  /**
   * Export user data to file
   */
  exportUserData() {
    const data = BrowserState.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `browser-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[UI] Data exported');
  },

  /**
   * Import user data from file
   */
  importUserData(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        BrowserState.importData(data);
        alert('Data imported successfully!');
        this.hideSettings();
      } catch (err) {
        console.error('[UI] Failed to import data:', err);
        alert('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // KEYBOARD SHORTCUTS HELP
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Show keyboard shortcuts help overlay
   */
  showKeyboardShortcuts() {
    this.hideKeyboardShortcuts();

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const mod = isMac ? '⌘' : 'Ctrl';
    const alt = isMac ? '⌥' : 'Alt';

    const shortcuts = [
      { category: 'Navigation', items: [
        { keys: `${mod} + L`, action: 'Focus address bar' },
        { keys: `${alt} + ←`, action: 'Go back' },
        { keys: `${alt} + →`, action: 'Go forward' },
        { keys: `${mod} + R`, action: 'Reload page' },
        { keys: `${mod} + F`, action: 'Find in page' },
      ]},
      { category: 'Tabs', items: [
        { keys: `${mod} + T`, action: 'New tab' },
        { keys: `${mod} + W`, action: 'Close tab' },
        { keys: `${mod} + 1-9`, action: 'Switch to tab' },
        { keys: `${mod} + Shift + T`, action: 'Reopen closed tab' },
      ]},
      { category: 'Application', items: [
        { keys: `${mod} + ,`, action: 'Open settings' },
        { keys: `${mod} + /`, action: 'Show this help' },
        { keys: 'Esc', action: 'Close dialogs' },
      ]},
    ];

    const modal = document.createElement('div');
    modal.id = 'shortcuts-modal';
    modal.className = 'modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-label', 'Keyboard shortcuts');

    modal.innerHTML = `
      <div class="modal-content shortcuts-modal">
        <div class="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button class="modal-close" aria-label="Close" onclick="UIBindings.hideKeyboardShortcuts()">
            <span class="sf-icon sf-icon-sm"> f1067</span>
          </button>
        </div>
        <div class="modal-body shortcuts-body">
          ${shortcuts.map(cat => `
            <div class="shortcuts-category">
              <h3>${cat.category}</h3>
              <div class="shortcuts-list">
                ${cat.items.map(s => `
                  <div class="shortcut-item">
                    <kbd class="shortcut-keys">${s.keys}</kbd>
                    <span class="shortcut-action">${s.action}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Focus trap
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn?.focus();

    // Close handlers
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.hideKeyboardShortcuts();
    });

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.hideKeyboardShortcuts();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  },

  /**
   * Hide keyboard shortcuts overlay
   */
  hideKeyboardShortcuts() {
    document.getElementById('shortcuts-modal')?.remove();
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTINGS MODAL
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Bind settings pane events
   */
  bindSettingsEvents() {
    const settingsPane = document.getElementById('settings-pane');
    const settingsClose = document.getElementById('settings-close');
    
    // Profile dropdown
    const profileTrigger = document.getElementById('settings-profile-trigger');
    const profileDropdown = document.getElementById('settings-profile-dropdown');
    
    profileTrigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other dropdowns
      document.getElementById('settings-location-dropdown')?.classList.remove('open');
      document.getElementById('settings-typeface-dropdown')?.classList.remove('open');
      document.getElementById('settings-search-engine-dropdown')?.classList.remove('open');
      profileDropdown?.classList.toggle('open');
    });
    
    const deleteProfileBtn = document.getElementById('delete-profile-btn');

    profileDropdown?.addEventListener('click', (e) => {
      const item = e.target.closest('.settings-dropdown-item');
      if (item) {
        const value = item.dataset.value;
        profileDropdown.querySelectorAll('.settings-dropdown-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        const text = document.getElementById('settings-profile-text');
        if (text) text.textContent = item.querySelector('.dropdown-item-text')?.textContent || value;
        // Update trigger avatar
        const triggerAvatar = document.querySelector('#profile-trigger-avatar img');
        const itemAvatar = item.querySelector('.dropdown-item-avatar img');
        if (triggerAvatar && itemAvatar) triggerAvatar.src = itemAvatar.src;
        profileDropdown.classList.remove('open');
        localStorage.setItem('user_profile', value);
        // Load the character for this profile
        const profileChar = item.dataset.character || localStorage.getItem('user_character') || 'bear';
        localStorage.setItem('user_character', profileChar);
        // Sync character picker
        document.querySelectorAll('.character-avatar').forEach(a => {
          a.classList.toggle('selected', a.dataset.character === profileChar);
        });
        // Update all home tab favicons to new character
        document.querySelectorAll('.favicon-home .favicon-character').forEach(img => {
          img.src = `characters/${profileChar}.png`;
        });
        // Update greeting character icons
        document.querySelectorAll('.ntp-greeting-name-icon').forEach(img => {
          img.src = `characters/${profileChar}.png`;
        });
        // Update delete button state
        if (deleteProfileBtn) deleteProfileBtn.disabled = (value === 'guest');
      }
    });
    
    // New profile button
    const newProfileBtn = document.getElementById('new-profile-btn');
    newProfileBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = prompt('Profile name:');
      if (!name || !name.trim()) return;
      const value = name.trim().toLowerCase().replace(/\s+/g, '-');
      // Check for duplicate
      if (profileDropdown.querySelector(`.settings-dropdown-item[data-value="${value}"]`)) return;
      const character = localStorage.getItem('user_character') || 'bear';
      const item = document.createElement('div');
      item.className = 'settings-dropdown-item';
      item.dataset.value = value;
      item.dataset.character = character;
      item.setAttribute('role', 'option');
      item.innerHTML = `
        <div class="dropdown-item-avatar"><img src="characters/${character}.png" alt="${name.trim()}" draggable="false"></div>
        <span class="dropdown-item-text">${name.trim()}</span>
        <span class="sf-icon dropdown-item-check">􀁢</span>
      `;
      // Insert before the new-profile button
      newProfileBtn.before(item);
      // Select the new profile
      profileDropdown.querySelectorAll('.settings-dropdown-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      const text = document.getElementById('settings-profile-text');
      if (text) text.textContent = name.trim();
      const trigAv = document.querySelector('#profile-trigger-avatar img');
      if (trigAv) trigAv.src = `characters/${character}.png`;
      profileDropdown.classList.remove('open');
      localStorage.setItem('user_profile', value);
      // Enable delete button for custom profiles
      if (deleteProfileBtn) deleteProfileBtn.disabled = false;
    });

    // Delete profile button
    deleteProfileBtn?.addEventListener('click', () => {
      const currentProfile = localStorage.getItem('user_profile') || 'guest';
      if (currentProfile === 'guest') return;
      // Remove the selected profile item from dropdown
      const selectedItem = profileDropdown?.querySelector(`.settings-dropdown-item[data-value="${currentProfile}"]`);
      if (selectedItem) selectedItem.remove();
      // Switch back to Guest
      const guestItem = profileDropdown?.querySelector('.settings-dropdown-item[data-value="guest"]');
      if (guestItem) {
        profileDropdown.querySelectorAll('.settings-dropdown-item').forEach(i => i.classList.remove('selected'));
        guestItem.classList.add('selected');
        const text = document.getElementById('settings-profile-text');
        if (text) text.textContent = 'Ethan';
        const triggerAvatar = document.querySelector('#profile-trigger-avatar img');
        const guestAvatar = guestItem.querySelector('.dropdown-item-avatar img');
        if (triggerAvatar && guestAvatar) triggerAvatar.src = guestAvatar.src;
        localStorage.setItem('user_profile', 'guest');
        const guestChar = guestItem.dataset.character || 'elephant';
        localStorage.setItem('user_character', guestChar);
        document.querySelectorAll('.character-avatar').forEach(a => {
          a.classList.toggle('selected', a.dataset.character === guestChar);
        });
        // Update greeting character icons
        document.querySelectorAll('.ntp-greeting-name-icon').forEach(img => {
          img.src = `characters/${guestChar}.png`;
        });
      }
      // Disable delete button since we're back to Guest
      deleteProfileBtn.disabled = true;
    });
    
    // Name input - save on blur or Enter
    const nameInput = document.getElementById('settings-name');
    nameInput?.addEventListener('blur', () => {
      const name = nameInput.value.trim();
      localStorage.setItem('user_name', name);
      this.updateGreeting();
    });
    nameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        nameInput.blur(); // Will trigger save via blur handler
      }
    });
    
    // Interests pills
    document.querySelectorAll('.interest-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        pill.classList.toggle('selected');
        // Save selected interests
        const selected = Array.from(document.querySelectorAll('.interest-pill.selected'))
          .map(p => p.dataset.interest);
        localStorage.setItem('user_interests', JSON.stringify(selected));
        localStorage.setItem('card_categories', JSON.stringify(selected));
        
        // Sync config to main process and trigger pool refresh
        if (typeof BlocksService !== 'undefined') {
          BlocksService.syncConfig(true).then(() => {
            if (window.blocksAPI) window.blocksAPI.refreshPool();
          });
        }
      });
    });
    
    // Location dropdown
    const locationTrigger = document.getElementById('settings-location-trigger');
    const locationDropdown = document.getElementById('settings-location-dropdown');
    const locationSearchInput = document.getElementById('location-search-input');
    const locationList = document.getElementById('settings-location-list');
    
    locationTrigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      locationDropdown?.classList.toggle('open');
      // Focus search input when opening
      if (locationDropdown?.classList.contains('open')) {
        setTimeout(() => locationSearchInput?.focus(), 50);
      }
    });
    
    // Location search — live city search via Open-Meteo geocoding API
    this._locationSearchDebounce = null;
    this._defaultLocationItems = locationList ? locationList.innerHTML : '';
    
    locationSearchInput?.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      // If empty, restore default suggestions
      if (!query) {
        if (locationList) locationList.innerHTML = this._defaultLocationItems;
        this._updateLocationSelected();
        return;
      }
      
      // Debounce API calls
      clearTimeout(this._locationSearchDebounce);
      this._locationSearchDebounce = setTimeout(() => this.searchCities(query, locationList), 300);
    });
    
    // Prevent dropdown from closing when clicking search input
    locationSearchInput?.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    // Location dropdown item selection
    locationDropdown?.addEventListener('click', (e) => {
      const item = e.target.closest('.settings-location-item');
      if (item) {
        const locationType = item.dataset.type;
        const locationValue = item.dataset.location;
        
        // Handle "Your location" geolocation request
        if (locationType === 'geolocation') {
          this.requestUserLocation(item, locationDropdown);
          return;
        }
        
        // Save and update everywhere (NTP, settings trigger, localStorage, weather)
        localStorage.removeItem('user_location_mode'); // Clear geolocation tracking
        this.setLocation(locationValue);
        
        // Close dropdown, clear search, restore defaults
        locationDropdown.classList.remove('open');
        if (locationSearchInput) locationSearchInput.value = '';
        if (locationList) {
          locationList.innerHTML = this._defaultLocationItems;
          this._updateLocationSelected();
        }
      }
    });
    
    // Close location dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.settings-location-wrapper')) {
        locationDropdown?.classList.remove('open');
        // Clear search on close, restore defaults
        if (locationSearchInput) locationSearchInput.value = '';
        if (locationList) {
          locationList.innerHTML = this._defaultLocationItems;
          this._updateLocationSelected();
        }
      }
    });
    
    // Typeface dropdown
    const typefaceTrigger = document.getElementById('settings-typeface-trigger');
    const typefaceDropdown = document.getElementById('settings-typeface-dropdown');
    
    typefaceTrigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other dropdowns
      locationDropdown?.classList.remove('open');
      profileDropdown?.classList.remove('open');
      document.getElementById('settings-search-engine-dropdown')?.classList.remove('open');
      typefaceDropdown?.classList.toggle('open');
    });
    
    typefaceDropdown?.addEventListener('click', (e) => {
      const item = e.target.closest('.settings-dropdown-item');
      if (item) {
        const value = item.dataset.value;
        // Update selected state
        typefaceDropdown.querySelectorAll('.settings-dropdown-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        // Update trigger text
        const text = document.getElementById('settings-typeface-text');
        if (text) text.textContent = item.querySelector('.dropdown-item-text')?.textContent || value;
        // Close dropdown
        typefaceDropdown.classList.remove('open');
        // Save to localStorage and apply
        localStorage.setItem('user_typeface', value);
        this.applyTypeface(value);
      }
    });
    
    // Search engine dropdown
    const searchEngineTrigger = document.getElementById('settings-search-engine-trigger');
    const searchEngineDropdown = document.getElementById('settings-search-engine-dropdown');
    
    searchEngineTrigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other dropdowns
      locationDropdown?.classList.remove('open');
      typefaceDropdown?.classList.remove('open');
      profileDropdown?.classList.remove('open');
      searchEngineDropdown?.classList.toggle('open');
    });
    
    searchEngineDropdown?.addEventListener('click', (e) => {
      const item = e.target.closest('.settings-dropdown-item');
      if (item) {
        const value = item.dataset.value;
        const domain = item.dataset.domain;
        // Update selected state
        searchEngineDropdown.querySelectorAll('.settings-dropdown-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        // Update trigger text and favicon
        const text = document.getElementById('settings-search-engine-text');
        if (text) text.textContent = item.querySelector('.dropdown-item-text')?.textContent || value;
        const favicon = document.getElementById('search-engine-favicon');
        if (favicon && domain) {
          favicon.innerHTML = `<img class="favicon-img" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" alt="">`;
        }
        // Close dropdown
        searchEngineDropdown.classList.remove('open');
        // Save to localStorage and sync with BrowserState
        localStorage.setItem('search_engine', value);
        BrowserState.settings.searchEngine = value;
      }
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.settings-dropdown-wrapper')) {
        typefaceDropdown?.classList.remove('open');
        searchEngineDropdown?.classList.remove('open');
        profileDropdown?.classList.remove('open');
      }
    });
    
    // Close button
    settingsClose?.addEventListener('click', () => this.closeSettings());
    
    // Theme cards
    const themeCards = settingsPane?.querySelectorAll('.settings-theme-card');
    themeCards?.forEach(card => {
      card.addEventListener('click', () => {
        const theme = card.dataset.theme;
        if (BrowserState.settings.theme === theme) return;

        // Animate the theme transition
        if (typeof Motion !== 'undefined') {
          // Cross-fade the entire page
          Motion.animate(document.documentElement,
            { opacity: [1, 0.92, 1] },
            { duration: 0.3, easing: [0.22, 1, 0.36, 1] }
          );
          // Press effect on the selected card
          Motion.animate(card,
            { scale: [1, 0.97, 1] },
            { duration: 0.25, easing: [0.22, 1, 0.36, 1] }
          );
        }

        this.setTheme(theme);
        // Update selected state
        themeCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });
    
    // Toggle API key visibility
    document.getElementById('toggle-api-key')?.addEventListener('click', () => {
      const input = document.getElementById('settings-api-key');
      const btn = document.getElementById('toggle-api-key');
      if (input) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        if (btn) {
          btn.textContent = isPassword ? '􀋮' : '􀋭'; // eye.slash vs eye
        }
      }
    });
    
    // Toggle OpenAI API key visibility
    document.getElementById('toggle-openai-api-key')?.addEventListener('click', () => {
      const input = document.getElementById('settings-openai-api-key');
      const btn = document.getElementById('toggle-openai-api-key');
      if (input) {
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        if (btn) {
          btn.textContent = isPassword ? '􀋮' : '􀋭';
        }
      }
    });
    
    // AI Provider switch toggles
    document.querySelectorAll('.settings-switch[data-provider]').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        const provider = toggle.dataset.provider;
        const isActive = toggle.classList.contains('active');
        
        // Toggle the switch state
        toggle.classList.toggle('active', !isActive);
        
        // Show/hide the corresponding API section
        const apiSection = document.getElementById(`${provider}-api-section`);
        if (apiSection) {
          apiSection.classList.toggle('hidden', isActive);
        }
        
        // If enabling, set as current provider
        if (!isActive && typeof AIService !== 'undefined') {
          AIService.setProvider(provider);
        }
      });
    });
    
    // API key input - save on blur or Enter
    document.getElementById('settings-api-key')?.addEventListener('blur', (e) => {
      const apiKey = e.target.value.trim();
      if (apiKey && typeof AIService !== 'undefined') {
        AIService.setApiKey(apiKey, 'anthropic');
      }
    });
    document.getElementById('settings-api-key')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
      }
    });
    
    // OpenAI API key input - save on blur or Enter
    document.getElementById('settings-openai-api-key')?.addEventListener('blur', (e) => {
      const apiKey = e.target.value.trim();
      if (apiKey && typeof AIService !== 'undefined') {
        AIService.setApiKey(apiKey, 'openai');
      }
    });
    document.getElementById('settings-openai-api-key')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
      }
    });
    
    // OpenAI model selection
    document.getElementById('settings-openai-model')?.addEventListener('change', (e) => {
      if (typeof AIService !== 'undefined') {
        AIService.config.model = e.target.value;
      }
    });
    
    // Search engine favicon update
    document.getElementById('settings-search-engine')?.addEventListener('change', (e) => {
      const selectedOption = e.target.options[e.target.selectedIndex];
      const domain = selectedOption.dataset.domain;
      const faviconContainer = document.getElementById('search-engine-favicon');
      if (faviconContainer && domain) {
        this.updateFaviconElement(faviconContainer, { domain });
      }
    });
    
    // Load current settings into the UI
    this.loadSettingsUI();
  },
  
  /**
   * Auto-detect user location on first launch using geolocation + reverse geocoding
   */
  autoDetectLocation() {
    if (!('geolocation' in navigator)) {
      // Fallback if geolocation unavailable
      this.setLocation('Los Angeles, California');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          );
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown';
          const state = data.address?.state || '';
          const locationName = state ? `${city}, ${state}` : city;
          this.setLocation(locationName);
        } catch (error) {
          console.error('[Location] Reverse geocoding failed:', error);
          this.setLocation('Los Angeles, California');
        }
      },
      (error) => {
        console.error('[Location] Geolocation error:', error);
        this.setLocation('Los Angeles, California');
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  },
  
  /**
   * Set location everywhere: NTP, settings, localStorage, and fetch weather
   */
  setLocation(locationName) {
    localStorage.setItem('user_location', locationName);
    
    const locationText = document.getElementById('settings-location-text');
    if (locationText) locationText.textContent = locationName;
    
    // Update intro with new location
    this.updateIntro();
    
    this.fetchWeather(locationName);
  },
  
  /**
   * Request user's geolocation and update location setting
   */
  requestUserLocation(item, dropdown) {
    const locationText = document.getElementById('settings-location-text');
    const locationSearchInput = document.getElementById('location-search-input');
    const locationList = document.getElementById('settings-location-list');
    
    // Show loading state
    const originalText = item.querySelector('.location-item-text')?.textContent;
    const textEl = item.querySelector('.location-item-text');
    if (textEl) textEl.textContent = 'Detecting...';
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            // Use reverse geocoding to get city name
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
            );
            const data = await response.json();
            const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown';
            const state = data.address?.state || '';
            const locationName = state ? `${city}, ${state}` : city;
            
            // Update UI
            if (locationText) locationText.textContent = locationName;
            dropdown?.querySelectorAll('.settings-location-item').forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            if (textEl) textEl.textContent = 'Your location';
            
            // Save to localStorage and update NTP
            localStorage.setItem('user_location', locationName);
            localStorage.setItem('user_location_mode', 'geolocation');
            
            // Update intro with location
            this.updateIntro();
            
            // Fetch weather for detected location
            this.fetchWeather(locationName);
            
            // Close dropdown, clear search, restore defaults
            dropdown?.classList.remove('open');
            if (locationSearchInput) locationSearchInput.value = '';
            if (locationList) {
              locationList.innerHTML = this._defaultLocationItems || '';
              this._updateLocationSelected();
            }
          } catch (error) {
            console.error('Reverse geocoding failed:', error);
            if (textEl) textEl.textContent = originalText;
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          if (textEl) textEl.textContent = originalText;
          alert('Unable to get your location. Please check your browser permissions.');
        },
        { timeout: 10000, enableHighAccuracy: false }
      );
    } else {
      if (textEl) textEl.textContent = originalText;
      alert('Geolocation is not supported by your browser.');
    }
  },
  
  /**
   * Convert full state name to abbreviation
   */
  getStateAbbr(stateName) {
    const states = {
      'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
      'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
      'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
      'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
      'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
      'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
      'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
      'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
      'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
      'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY'
    };
    return states[stateName] || stateName;
  },

  /**
   * Get country code abbreviation for display
   */
  getCountryAbbr(countryCode) {
    return countryCode || '';
  },

  /**
   * Search cities using Open-Meteo geocoding API and populate dropdown
   */
  async searchCities(query, listElement) {
    if (!listElement) return;

    // Show loading state
    listElement.innerHTML = '<div class="location-search-status">Searching...</div>';

    try {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&format=json`
      );
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        listElement.innerHTML = '<div class="location-search-status">No results found</div>';
        return;
      }

      const savedLocation = localStorage.getItem('user_location');
      listElement.innerHTML = '';

      data.results.forEach(result => {
        const city = result.name;
        const admin = result.admin1 || '';
        const country = result.country_code || '';

        // Build display name: "City, State" for US, "City, Country" for others
        let displayName;
        if (country === 'US' && admin) {
          displayName = `${city}, ${admin}`;
        } else if (admin) {
          displayName = `${city}, ${admin}, ${country}`;
        } else {
          displayName = `${city}, ${country}`;
        }

        const item = document.createElement('div');
        item.className = 'settings-location-item';
        if (displayName === savedLocation) item.classList.add('selected');
        item.dataset.location = displayName;
        item.dataset.lat = result.latitude;
        item.dataset.lon = result.longitude;
        item.setAttribute('role', 'option');
        item.innerHTML = `
          <span class="location-item-text">${displayName}</span>
          <span class="sf-icon location-item-check">\udbc0\udc62</span>
        `;
        listElement.appendChild(item);
      });
    } catch (error) {
      console.error('[Location] City search failed:', error);
      listElement.innerHTML = '<div class="location-search-status">Search failed</div>';
    }
  },

  /**
   * Mark the currently saved location as selected in the dropdown
   */
  _updateLocationSelected() {
    const saved = localStorage.getItem('user_location');
    const list = document.getElementById('settings-location-list');
    if (!list || !saved) return;
    list.querySelectorAll('.settings-location-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.location === saved);
    });
  },

  /**
   * Update AI provider UI based on selection (switches)
   */
  updateAIProviderUI(provider) {
    // Update switch states
    const anthropicSwitch = document.getElementById('anthropic-switch');
    const openaiSwitch = document.getElementById('openai-switch');
    const anthropicSection = document.getElementById('anthropic-api-section');
    const openaiSection = document.getElementById('openai-api-section');
    
    if (anthropicSwitch && openaiSwitch) {
      anthropicSwitch.classList.toggle('active', provider === 'anthropic');
      openaiSwitch.classList.toggle('active', provider === 'openai');
    }
    
    if (anthropicSection && openaiSection) {
      anthropicSection.classList.toggle('hidden', provider !== 'anthropic');
      openaiSection.classList.toggle('hidden', provider !== 'openai');
    }
  },
  
  /**
   * Toggle settings pane open/closed
   */
  openSettings() {
    const pane = document.getElementById('settings-pane');
    if (pane) {
      const isOpen = pane.classList.contains('open');
      if (isOpen) {
        this.closeSettings();
      } else {
        pane.classList.add('open');
        pane.style.display = 'flex';
        pane.style.opacity = '1';
        document.getElementById('menu-btn')?.classList.add('active');
        // Visually deemphasize tabs without removing .active (avoids layout shift)
        document.querySelector('.tab-strip')?.classList.add('settings-open');
        this.loadSettingsUI();
      }
    }
  },
  
  /**
   * Close settings pane
   */
  closeSettings() {
    const pane = document.getElementById('settings-pane');
    if (pane && pane.classList.contains('open')) {
      pane.classList.remove('open');
      pane.style.display = '';
      pane.style.opacity = '';
      pane.style.transform = '';
      document.getElementById('menu-btn')?.classList.remove('active');
      document.querySelector('.tab-strip')?.classList.remove('settings-open');
    }
  },
  
  /**
   * Load current settings into the UI
   */
  loadSettingsUI() {
    // ═══════════════════════════════════════════════════════════════════════════
    // PROFILE
    // ═══════════════════════════════════════════════════════════════════════════
    const savedProfile = localStorage.getItem('user_profile') || 'guest';
    const profileText = document.getElementById('settings-profile-text');
    const profileDropdown = document.getElementById('settings-profile-dropdown');
    const triggerAvatar = document.querySelector('#profile-trigger-avatar img');
    
    profileDropdown?.querySelectorAll('.settings-dropdown-item').forEach(item => {
      const isSelected = item.dataset.value === savedProfile;
      item.classList.toggle('selected', isSelected);
      if (isSelected && profileText) {
        profileText.textContent = item.querySelector('.dropdown-item-text')?.textContent || savedProfile;
        // Sync trigger avatar with selected profile's avatar
        const itemAvatar = item.querySelector('.dropdown-item-avatar img');
        if (triggerAvatar && itemAvatar) triggerAvatar.src = itemAvatar.src;
      }
    });

    // Update delete profile button state
    const deleteProfileBtn = document.getElementById('delete-profile-btn');
    if (deleteProfileBtn) deleteProfileBtn.disabled = (savedProfile === 'guest');

    // ═══════════════════════════════════════════════════════════════════════════
    // NAME
    // ═══════════════════════════════════════════════════════════════════════════
    const savedName = localStorage.getItem('user_name') || '';
    const nameInput = document.getElementById('settings-name');
    if (nameInput) {
      nameInput.value = savedName;
    }
    
    // Update greeting with name
    this.updateGreeting();
    
    // ═══════════════════════════════════════════════════════════════════════════
    // LOCATION
    // ═══════════════════════════════════════════════════════════════════════════
    const savedLocation = localStorage.getItem('user_location');
    const locationText = document.getElementById('settings-location-text');
    
    if (savedLocation) {
      const locationMode = localStorage.getItem('user_location_mode');
      if (locationMode === 'geolocation') {
        // User chose "Your location" — re-detect to keep it current
        if (locationText) locationText.textContent = savedLocation; // show cached while detecting
        this.updateIntro();
        this.fetchWeather(savedLocation); // show cached weather initially
        this.autoDetectLocation(); // then update to current
      } else {
        // Use saved fixed location
        if (locationText) locationText.textContent = savedLocation;
        this.updateIntro();
        this.fetchWeather(savedLocation);
      }
    } else {
      // First launch — auto-detect location
      this.autoDetectLocation();
    }
    
    // Update location dropdown selected state
    const locationDropdown = document.getElementById('settings-location-dropdown');
    const locationMode = localStorage.getItem('user_location_mode');
    locationDropdown?.querySelectorAll('.settings-location-item').forEach(item => {
      if (locationMode === 'geolocation' && item.dataset.type === 'geolocation') {
        item.classList.add('selected');
      } else if (savedLocation && !locationMode) {
        item.classList.toggle('selected', item.dataset.location === savedLocation);
      } else if (!savedLocation && item.dataset.type === 'geolocation') {
        item.classList.add('selected');
      }
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // THEME (Appearance)
    // ═══════════════════════════════════════════════════════════════════════════
    const savedTheme = localStorage.getItem('browser_theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    
    // Apply theme
    this.setTheme(currentTheme);
    
    // Update theme cards selection
    document.querySelectorAll('.settings-theme-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.theme === currentTheme);
      const radio = card.querySelector('input[type="radio"]');
      if (radio) radio.checked = card.dataset.theme === currentTheme;
    });
    
    // Listen for system preference changes (auto-switch only when no saved preference)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const userSaved = localStorage.getItem('browser_theme');
      if (!userSaved) {
        const autoTheme = e.matches ? 'dark' : 'light';
        this.setTheme(autoTheme);
        // Update theme card selection in settings
        document.querySelectorAll('.settings-theme-card').forEach(card => {
          card.classList.toggle('selected', card.dataset.theme === autoTheme);
          const radio = card.querySelector('input[type="radio"]');
          if (radio) radio.checked = card.dataset.theme === autoTheme;
        });
      }
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // THEME COLOR (Color palette)
    // ═══════════════════════════════════════════════════════════════════════════
    const savedThemeColor = localStorage.getItem('browser_theme_color') || 'neutral';
    document.documentElement.setAttribute('data-theme-color', savedThemeColor);
    
    // Update swatch selection
    document.querySelectorAll('.theme-color-swatch').forEach(swatch => {
      swatch.classList.toggle('selected', swatch.dataset.color === savedThemeColor);
    });

    // Swatch click handlers
    document.querySelectorAll('.theme-color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const color = swatch.dataset.color;
        if (color) {
          this.setThemeColor(color);
        }
      });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // CHARACTER
    // ═══════════════════════════════════════════════════════════════════════════
    const savedCharacter = localStorage.getItem('user_character') || 'bear';
    document.querySelectorAll('.character-avatar').forEach(avatar => {
      avatar.classList.toggle('selected', avatar.dataset.character === savedCharacter);
    });

    // Character click handlers
    document.querySelectorAll('.character-avatar').forEach(avatar => {
      avatar.addEventListener('click', () => {
        const character = avatar.dataset.character;
        if (character) {
          document.querySelectorAll('.character-avatar').forEach(a => a.classList.remove('selected'));
          avatar.classList.add('selected');
          localStorage.setItem('user_character', character);
          // Update the active profile's dropdown avatar + trigger avatar
          const activeProfile = localStorage.getItem('user_profile') || 'guest';
          if (activeProfile !== 'guest') {
            const profileItem = document.querySelector(`.settings-dropdown-item[data-value="${activeProfile}"]`);
            if (profileItem) {
              profileItem.dataset.character = character;
              const img = profileItem.querySelector('.dropdown-item-avatar img');
              if (img) img.src = `characters/${character}.png`;
            }
          }
          // Always update trigger avatar for current profile
          const triggerAvatar = document.querySelector('#profile-trigger-avatar img');
          if (triggerAvatar && activeProfile !== 'guest') {
            triggerAvatar.src = `characters/${character}.png`;
          }
          // Update all home tab favicons to new character
          document.querySelectorAll('.favicon-home .favicon-character').forEach(img => {
            img.src = `characters/${character}.png`;
          });
          // Update greeting character icons
          document.querySelectorAll('.ntp-greeting-name-icon').forEach(img => {
            img.src = `characters/${character}.png`;
          });
        }
      });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERESTS
    // ═══════════════════════════════════════════════════════════════════════════
    const savedInterests = JSON.parse(localStorage.getItem('user_interests') || 'null');
    document.querySelectorAll('.interest-pill').forEach(pill => {
      // Default: all selected if no saved preferences
      pill.classList.toggle('selected', savedInterests === null || savedInterests.includes(pill.dataset.interest));
    });
    // Persist the default if first load
    if (savedInterests === null) {
      const allInterests = Array.from(document.querySelectorAll('.interest-pill')).map(p => p.dataset.interest);
      localStorage.setItem('user_interests', JSON.stringify(allInterests));
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // TYPEFACE
    // ═══════════════════════════════════════════════════════════════════════════
    const savedTypeface = localStorage.getItem('user_typeface') || 'new-york';
    this.applyTypeface(savedTypeface);
    
    // Update typeface dropdown
    const typefaceText = document.getElementById('settings-typeface-text');
    const typefaceDropdown = document.getElementById('settings-typeface-dropdown');
    
    typefaceDropdown?.querySelectorAll('.settings-dropdown-item').forEach(item => {
      const isSelected = item.dataset.value === savedTypeface;
      item.classList.toggle('selected', isSelected);
      if (isSelected && typefaceText) {
        typefaceText.textContent = item.querySelector('.dropdown-item-text')?.textContent || savedTypeface;
      }
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SEARCH ENGINE
    // ═══════════════════════════════════════════════════════════════════════════
    const savedSearchEngine = localStorage.getItem('search_engine') || 'google';
    const searchEngineText = document.getElementById('settings-search-engine-text');
    const searchEngineFavicon = document.getElementById('search-engine-favicon');
    const searchEngineDropdown = document.getElementById('settings-search-engine-dropdown');
    
    // Sync with BrowserState
    BrowserState.settings.searchEngine = savedSearchEngine;
    
    searchEngineDropdown?.querySelectorAll('.settings-dropdown-item').forEach(item => {
      const isSelected = item.dataset.value === savedSearchEngine;
      item.classList.toggle('selected', isSelected);
      if (isSelected) {
        if (searchEngineText) {
          searchEngineText.textContent = item.querySelector('.dropdown-item-text')?.textContent || savedSearchEngine;
        }
        if (searchEngineFavicon) {
          const domain = item.dataset.domain;
          searchEngineFavicon.innerHTML = `<img class="favicon-img" src="https://www.google.com/s2/favicons?domain=${domain}&sz=32" alt="">`;
        }
      }
    });
    
    // ═══════════════════════════════════════════════════════════════════════════
    // AI PROVIDER & API KEYS
    // ═══════════════════════════════════════════════════════════════════════════
    if (typeof AIService !== 'undefined') {
      const currentProvider = AIService.config.provider;
      this.updateAIProviderUI(currentProvider);
      
      // Show API key placeholders if keys are saved
      const anthropicKey = localStorage.getItem('ai_api_key_anthropic');
      const openaiKey = localStorage.getItem('ai_api_key_openai');
      
      const anthropicKeyInput = document.getElementById('settings-api-key');
      const openaiKeyInput = document.getElementById('settings-openai-api-key');
      
      if (anthropicKeyInput && anthropicKey) {
        anthropicKeyInput.placeholder = '••••••••••••••••';
      }
      if (openaiKeyInput && openaiKey) {
        openaiKeyInput.placeholder = '••••••••••••••••';
      }
    }
  },
  
  /**
   * Update the greeting based on time of day and user name
   */
  updateGreeting() {
    const name = localStorage.getItem('user_name') || '';
    const character = localStorage.getItem('user_character') || 'elephant';
    const hour = new Date().getHours();
    
    let greeting;
    if (hour >= 5 && hour < 12) {
      greeting = 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    
    // Update greeting text (just the time-based part with comma if name exists)
    const greetingText = name ? `${greeting},` : greeting;
    
    // Update both NTP panes
    ['', '-2'].forEach(suffix => {
      const greetingTextEl = document.getElementById(`ntp-greeting-text${suffix}`);
      const nameEl = document.getElementById(`ntp-greeting-name${suffix}`);
      const iconEl = document.getElementById(`ntp-greeting-icon${suffix}`);
      
      if (greetingTextEl) greetingTextEl.textContent = greetingText;
      if (nameEl) {
        nameEl.textContent = name;
        nameEl.style.display = name ? '' : 'none';
      }
      if (iconEl) {
        iconEl.src = `characters/${character}.png`;
        iconEl.style.display = name ? '' : 'none';
      }
    });
    
    // Update the intro sentence
    this.updateIntro();

    // Typewriter on greeting (first load only)
    this.typewriteGreeting();
  },
  
  /**
   * Build and update the intro sentence with weather, live clock, location
   * Format: "It is currently [weather] in [location], where the local time is [clock] on [Day], [date]."
   */
  updateIntro() {
    const location = localStorage.getItem('user_location') || '';
    const city = location.split(',')[0].trim();
    const name = localStorage.getItem('user_name') || '';
    const character = localStorage.getItem('user_character') || 'elephant';
    const hour = new Date().getHours();
    const now = new Date();
    
    let greeting;
    if (hour >= 5 && hour < 12) {
      greeting = 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    
    // Format time: "8:35:15 am" (lowercase, no leading zero)
    let h = now.getHours();
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${h}:${m}:${s} ${ampm}`;
    
    // Format date: "Wednesday" + "February 14th"
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });
    const day = now.getDate();
    const ordinal = (d) => {
      if ([1, 21, 31].includes(d)) return 'st';
      if ([2, 22].includes(d)) return 'nd';
      if ([3, 23].includes(d)) return 'rd';
      return 'th';
    };
    const dateStr = `${monthName} ${day}${ordinal(day)}`;
    
    // Build greeting prefix inline: "Good morning, 🐻 Ethan. "
    let html = '';
    if (name) {
      html += `<strong>${greeting},</strong> <img class="ntp-intro-icon" src="characters/${character}.png" alt=""> <strong>${name}.</strong> `;
    } else {
      html += `<strong>${greeting}.</strong> `;
    }
    
    if (this._weatherData) {
      const { temp, description } = this._weatherData;
      const weatherSearch = city ? `${city} weather today` : 'weather today';
      html += `It is currently <a class="ntp-link" data-search="${weatherSearch}"><strong>${temp}</strong></a><strong>°</strong> with ${description}`;
    } else {
      html += `It is currently`;
    }
    
    if (location) {
      html += ` in <a class="ntp-link" data-search="${location}"><strong>${location}</strong></a>`;
    }
    
    html += `, where the time is <strong><span class="ntp-live-clock">${timeStr}</span></strong> on <a class="ntp-link" data-search="${dayName} ${monthName} ${day}">`;
    
    const dateSearch = `what is happening today ${monthName} ${day}`;
    html += `<strong>${dayName}, ${dateStr}</strong></a>`;
    
    html += `.`;
    
    // Update both NTP panes
    ['', '-2'].forEach(suffix => {
      const introEl = document.getElementById(`ntp-intro${suffix}`);
      if (introEl) introEl.innerHTML = html;
    });
    
    // Typewriter animation on first load
    this.typewriteIntro();
    
    // Start the live clock if not yet started
    // Delay if typewriter is running to avoid conflicts with text reveal
    if (!this._liveClockInterval) {
      const clockDelay = this._ntpFirstLoad ? 2000 : 0;
      setTimeout(() => {
        if (!this._liveClockInterval) {
          this._liveClockInterval = setInterval(() => this._updateLiveClock(), 1000);
        }
      }, clockDelay);
    }
  },

  /**
   * Update only the live clock text (every second)
   */
  _updateLiveClock() {
    const now = new Date();
    let h = now.getHours();
    const ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${h}:${m}:${s} ${ampm}`;
    
    document.querySelectorAll('.ntp-live-clock').forEach(el => {
      el.textContent = timeStr;
    });
  },
  
  /**
   * Get human-readable weather description from WMO weather code
   */
  getWeatherDescription(code) {
    // Weather code → description per BUILD_NTP_CONTENT.md spec
    const descriptions = {
      0: 'clear skies',
      1: 'partly cloudy skies',
      2: 'partly cloudy skies',
      3: 'partly cloudy skies',
      45: 'foggy conditions',
      48: 'foggy conditions',
      51: 'light drizzle',
      53: 'light drizzle',
      55: 'heavy drizzle',
      56: 'light drizzle',
      57: 'heavy drizzle',
      61: 'light rain and cloudy skies',
      63: 'rain and overcast skies',
      65: 'heavy rain',
      66: 'light rain and cloudy skies',
      67: 'heavy rain',
      71: 'light snow',
      73: 'light snow',
      75: 'heavy snow',
      77: 'light snow',
      80: 'rain showers',
      81: 'rain showers',
      82: 'rain showers',
      85: 'snow showers',
      86: 'snow showers',
      95: 'thunderstorms',
      96: 'thunderstorms',
      99: 'thunderstorms'
    };
    return descriptions[code] || 'clear skies';
  },
  
  /**
   * Apply typeface to the document
   */
  applyTypeface(typeface) {
    const fontMap = {
      'new-york': "'New York', Georgia, serif",
      'sf-pro': "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      'system': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    };
    
    const fontFamily = fontMap[typeface] || fontMap['new-york'];
    document.documentElement.style.setProperty('--font-family-display', fontFamily);
  },
  
  /**
   * Get search URL for the selected search engine
   */
  getSearchUrl(query) {
    const engine = localStorage.getItem('search_engine') || 'google';
    const encodedQuery = encodeURIComponent(query);
    
    const searchUrls = {
      'google': `https://www.google.com/search?q=${encodedQuery}`,
      'duckduckgo': `https://duckduckgo.com/?q=${encodedQuery}`,
      'bing': `https://www.bing.com/search?q=${encodedQuery}`,
      'yahoo': `https://search.yahoo.com/search?p=${encodedQuery}`
    };
    
    return searchUrls[engine] || searchUrls['google'];
  },
  
  /**
   * Fetch weather data for a location
   */
  async fetchWeather(location) {
    // Parse city name for API
    const city = location.split(',')[0].trim();
    
    try {
      // Using Open-Meteo free API (no API key required)
      // First, geocode the city
      const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
      const geoData = await geoResponse.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        console.warn('[Weather] City not found:', city);
        return;
      }
      
      const { latitude, longitude } = geoData.results[0];
      
      // Fetch weather (include is_day for day/night icon variants)
      const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day&temperature_unit=fahrenheit`);
      const weatherData = await weatherResponse.json();
      
      if (weatherData.current) {
        const temp = Math.round(weatherData.current.temperature_2m);
        const weatherCode = weatherData.current.weather_code;
        const isDay = weatherData.current.is_day === 1;
        
        // Store weather data for greeting body
        this._weatherData = {
          temp,
          description: this.getWeatherDescription(weatherCode)
        };
        
        // Update intro with weather info
        this.updateIntro();
      }
    } catch (error) {
      console.error('[Weather] Failed to fetch weather:', error);
    }
  },
  
  /**
   * Get weather icon URL based on WMO weather code
   */
  getWeatherIconUrl(code, isDay = true) {
    // WMO Weather codes → 8 weather types
    const iconMap = {
      0: 'clear',           // Clear sky
      1: 'clear',           // Mainly clear
      2: 'partlycloudy',    // Partly cloudy
      3: 'overcast',        // Overcast
      45: 'fog',            // Fog
      48: 'fog',            // Depositing rime fog
      51: 'drizzle',        // Light drizzle
      53: 'drizzle',        // Moderate drizzle
      55: 'drizzle',        // Dense drizzle
      56: 'drizzle',        // Light freezing drizzle
      57: 'drizzle',        // Dense freezing drizzle
      61: 'rain',           // Slight rain
      63: 'rain',           // Moderate rain
      65: 'rain',           // Heavy rain
      66: 'rain',           // Light freezing rain
      67: 'rain',           // Heavy freezing rain
      71: 'snow',           // Slight snow
      73: 'snow',           // Moderate snow
      75: 'snow',           // Heavy snow
      77: 'snow',           // Snow grains
      80: 'rain',           // Slight rain showers
      81: 'rain',           // Moderate rain showers
      82: 'rain',           // Violent rain showers
      85: 'snow',           // Slight snow showers
      86: 'snow',           // Heavy snow showers
      95: 'thunderstorm',   // Thunderstorm
      96: 'thunderstorm',   // Thunderstorm with slight hail
      99: 'thunderstorm',   // Thunderstorm with heavy hail
    };
    
    const iconType = iconMap[code] || 'clear';
    const suffix = isDay ? '' : 'night';
    return `weather/${iconType}${suffix}.png`;
  },
  
  /**
   * Update model options based on provider
   */
  updateModelOptions(provider) {
    const modelSelect = document.getElementById('ai-model-select');
    if (!modelSelect || typeof AIService === 'undefined') return;
    
    // Show/hide optgroups based on provider
    const openaiGroup = modelSelect.querySelector('#openai-models');
    const anthropicGroup = modelSelect.querySelector('#anthropic-models');
    
    if (openaiGroup) openaiGroup.style.display = provider === 'openai' ? '' : 'none';
    if (anthropicGroup) anthropicGroup.style.display = provider === 'anthropic' ? '' : 'none';
    
    // Select first model of the provider
    const models = AIService.models[provider] || [];
    if (models.length > 0) {
      modelSelect.value = models[0].id;
    }
  },
  
  /**
   * Save AI settings from the settings modal
   */
  saveSettingsAI() {
    if (typeof AIService === 'undefined') return;
    
    const provider = document.getElementById('ai-provider-select')?.value;
    const model = document.getElementById('ai-model-select')?.value;
    const apiKey = document.getElementById('ai-api-key')?.value;
    
    if (provider) {
      AIService.setProvider(provider);
    }
    if (model) {
      AIService.setModel(model);
    }
    if (apiKey && apiKey.trim()) {
      AIService.setApiKey(apiKey.trim());
    }
    
    // Update the model name display
    this.updateModelDisplay();
    
    // Show success status
    const status = document.getElementById('ai-settings-status');
    if (status) {
      status.textContent = '✓ Saved';
      setTimeout(() => { status.textContent = ''; }, 2000);
    }
    
    console.log('[UI] AI settings saved');
  },
  
  /**
   * Set theme (light/dark)
   */
  setTheme(theme) {
    // Disable all transitions during theme switch to prevent border/color flashes
    document.documentElement.style.setProperty('--theme-transition', 'none');
    document.documentElement.classList.add('theme-switching');

    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('browser_theme', theme);
    BrowserState.settings.theme = theme;
    
    // Update meta theme-color for native title bar
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff');
    }

    // Re-enable transitions after a frame so all styles have settled
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('theme-switching');
        document.documentElement.style.removeProperty('--theme-transition');
      });
    });
  },

  /**
   * Set theme color palette (neutral, stone, blush, etc.)
   */
  setThemeColor(color) {
    document.documentElement.classList.add('theme-switching');

    document.documentElement.setAttribute('data-theme-color', color);
    localStorage.setItem('browser_theme_color', color);

    // Update swatch selection
    document.querySelectorAll('.theme-color-swatch').forEach(swatch => {
      swatch.classList.toggle('selected', swatch.dataset.color === color);
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('theme-switching');
      });
    });
  },
  
  /**
   * Clear browsing data
   */
  clearBrowsingData() {
    // Clear localStorage except API keys
    const apiKeyOpenai = localStorage.getItem('ai_api_key_openai');
    const apiKeyAnthropic = localStorage.getItem('ai_api_key_anthropic');
    
    localStorage.clear();
    
    // Restore API keys
    if (apiKeyOpenai) localStorage.setItem('ai_api_key_openai', apiKeyOpenai);
    if (apiKeyAnthropic) localStorage.setItem('ai_api_key_anthropic', apiKeyAnthropic);
    
    // Clear tabs and conversations
    BrowserState.tabs = [];
    BrowserState.conversations = [];
    BrowserState.addTab(); // Add a new tab
    
    alert('Browsing data cleared.');
    this.closeSettings();
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI SETTINGS (legacy modal)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Show AI settings modal
   */
  showAISettings() {
    // Remove existing modal
    this.hideAISettings();

    const modal = document.createElement('div');
    modal.id = 'ai-settings-modal';
    modal.className = 'modal-overlay';

    const provider = typeof AIService !== 'undefined' ? AIService.config.provider : 'openai';
    const model = typeof AIService !== 'undefined' ? AIService.config.model : 'gpt-4o';
    const hasKey = typeof AIService !== 'undefined' && AIService.isConfigured();

    modal.innerHTML = `
      <div class="modal-content ai-settings-modal">
        <div class="modal-header">
          <h2>AI Settings</h2>
          <button class="modal-close" onclick="UIBindings.hideAISettings()" aria-label="Close">
            <span class="sf-icon sf-icon-sm"> f1067</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="setting-group">
            <label class="setting-label">Provider</label>
            <select id="ai-provider" class="setting-select">
              <option value="openai" ${provider === 'openai' ? 'selected' : ''}>OpenAI</option>
              <option value="anthropic" ${provider === 'anthropic' ? 'selected' : ''}>Anthropic</option>
            </select>
          </div>
          <div class="setting-group">
            <label class="setting-label">Model</label>
            <select id="ai-model" class="setting-select">
              ${this.getModelOptions(provider, model)}
            </select>
          </div>
          <div class="setting-group">
            <label class="setting-label">API Key ${hasKey ? '<span class="key-status configured">✓ Configured</span>' : '<span class="key-status">Not set</span>'}</label>
            <input type="password" id="ai-api-key" class="setting-input" placeholder="Enter your API key" />
            <p class="setting-hint">Your API key is stored locally and never sent to our servers.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="UIBindings.hideAISettings()">Cancel</button>
          <button class="btn btn-primary" onclick="UIBindings.saveAISettings()">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Bind provider change to update model options
    const providerSelect = document.getElementById('ai-provider');
    providerSelect?.addEventListener('change', (e) => {
      const modelSelect = document.getElementById('ai-model');
      if (modelSelect) {
        modelSelect.innerHTML = this.getModelOptions(e.target.value);
      }
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideAISettings();
      }
    });

    // Close on escape
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.hideAISettings();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  },

  /**
   * Get model options HTML for a provider
   */
  getModelOptions(provider, selectedModel) {
    if (typeof AIService === 'undefined') return '';
    
    const models = AIService.models[provider] || [];
    return models.map(m => 
      `<option value="${m.id}" ${m.id === selectedModel ? 'selected' : ''}>${m.name} - ${m.description}</option>`
    ).join('');
  },

  /**
   * Hide AI settings modal
   */
  hideAISettings() {
    const modal = document.getElementById('ai-settings-modal');
    if (modal) {
      modal.remove();
    }
  },

  /**
   * Save AI settings
   */
  saveAISettings() {
    if (typeof AIService === 'undefined') {
      console.error('[UI] AIService not available');
      return;
    }

    const provider = document.getElementById('ai-provider')?.value;
    const model = document.getElementById('ai-model')?.value;
    const apiKey = document.getElementById('ai-api-key')?.value;

    if (provider) {
      AIService.setProvider(provider);
    }
    if (model) {
      AIService.setModel(model);
    }
    if (apiKey) {
      AIService.setApiKey(apiKey);
    }

    // Update the model name display
    this.updateModelDisplay();

    this.hideAISettings();
    console.log('[UI] AI settings saved');
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NTP HEADER - Greeting, Location, Weather
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize single row cards - hide cards that don't fit
   */
  initSingleRowCards() {
    this.updateSingleRowCards();
    
    // Use ResizeObserver to watch for tab frame size changes
    // This handles split screen resizing, settings panel open/close, and window resize
    const resizeObserver = new ResizeObserver(() => {
      this.updateSingleRowCards();
    });
    
    // Observe both tab frames
    const tabFrame1 = document.getElementById('tab-frame-1');
    const tabFrame2 = document.getElementById('tab-frame-2');
    
    if (tabFrame1) resizeObserver.observe(tabFrame1);
    if (tabFrame2) resizeObserver.observe(tabFrame2);
    
    // Also update on window resize as fallback
    window.addEventListener('resize', () => {
      this.updateSingleRowCards();
    });
  },

  /**
   * Update single row cards visibility based on available width
   */
  updateSingleRowCards() {
    const rows = document.querySelectorAll('.cards-single-row');
    
    rows.forEach(row => {
      const cards = row.querySelectorAll('.chat-card');
      const rowWidth = row.offsetWidth;
      const gap = 16; // gap between cards
      const minCardWidth = 200;
      
      // Calculate how many cards can fit
      // Formula: rowWidth >= (n * minCardWidth) + ((n - 1) * gap)
      // Solving for n: n <= (rowWidth + gap) / (minCardWidth + gap)
      const maxCards = Math.floor((rowWidth + gap) / (minCardWidth + gap));
      
      cards.forEach((card, index) => {
        if (index < maxCards) {
          card.style.display = '';
          card.style.visibility = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  },

  /**
   * Initialize the NTP header with greeting, location, and weather
   */
  initNTPHeader() {
    this._ntpFirstLoad = true;
    this.updateGreeting();
    // Location & weather are handled by loadSettingsUI (auto-detect or saved)
    
    // Update greeting every minute (time-of-day changes)
    setInterval(() => this.updateGreeting(), 60000);
  },

  /**
   * Run typewriter animation on the NTP greeting (called after greeting text is set)
   */
  typewriteGreeting() {
    if (!this._ntpFirstLoad) return;
    ['', '-2'].forEach(suffix => {
      const greetingEl = document.getElementById(`ntp-greeting${suffix}`);
      if (greetingEl) {
        this.typewrite(greetingEl, { speed: 18, delay: 0 });
      }
    });
  },

  /**
   * Run typewriter animation on the NTP intro element (called after intro HTML is set)
   */
  typewriteIntro() {
    if (!this._ntpFirstLoad) return;
    ['', '-2'].forEach(suffix => {
      const introEl = document.getElementById(`ntp-intro${suffix}`);
      if (introEl) {
        // Cancel any prior animation
        if (this._typewriterAbort) this._typewriterAbort();
        const { abort } = this.typewrite(introEl, { speed: 8, delay: 500 });
        this._typewriterAbort = abort;
      }
    });
  },

  /**
   * Run typewriter animation on NTP blocks (called after blocks are rendered)
   */
  typewriteBlocks(ntp) {
    if (!this._ntpFirstLoad) return;
    this._ntpFirstLoad = false; // Only animate on first load
    const grid = ntp?.querySelector('.ntp-blocks');
    if (grid) {
      this.typewrite(grid, { speed: 6, delay: 1800 });
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCH SUGGESTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  searchSuggestionsDebounce: null,
  selectedSuggestionIndex: { 1: -1, 2: -1 },
  currentSuggestions: { 1: [], 2: [] },

  /**
   * Fetch search suggestions from Google Suggest API
   */
  async fetchSearchSuggestions(query, pane = 1) {
    const suggestionsEl = pane === 2 ? this.elements.searchSuggestions2 : this.elements.searchSuggestions;
    
    if (!query || query.length < 2) {
      this.hideSearchSuggestions(pane);
      return;
    }

    // Debounce the request
    clearTimeout(this.searchSuggestionsDebounce);
    this.searchSuggestionsDebounce = setTimeout(async () => {
      try {
        // Use Google's suggest API (more permissive, JSONP-style with callback)
        const response = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        // Google returns [query, [suggestions]]
        const suggestions = data[1] || [];
        this.currentSuggestions[pane] = suggestions;
        this.selectedSuggestionIndex[pane] = -1;
        this.renderSearchSuggestions(suggestions, query, pane);
      } catch (error) {
        console.error('[UI] Failed to fetch suggestions:', error);
        this.hideSearchSuggestions(pane);
      }
    }, 150);
  },

  /**
   * Render search suggestions in the dropdown
   */
  renderSearchSuggestions(suggestions, query, pane = 1) {
    const suggestionsEl = pane === 2 ? this.elements.searchSuggestions2 : this.elements.searchSuggestions;
    if (!suggestionsEl) return;

    if (suggestions.length === 0) {
      this.hideSearchSuggestions(pane);
      return;
    }

    // Check if query looks like a URL
    const isUrl = query.includes('.') && !query.includes(' ');

    suggestionsEl.innerHTML = '';

    // If it looks like a URL, add a "Go to" option first
    if (isUrl) {
      const goToItem = document.createElement('div');
      goToItem.className = 'search-suggestion-item';
      goToItem.dataset.value = query;
      goToItem.dataset.type = 'url';
      goToItem.innerHTML = `
        <span class="suggestion-icon"><span class="sf-icon">􀆪</span></span>
        <span class="suggestion-text">${this.escapeHtml(query)}</span>
        <span class="suggestion-type">Go to site</span>
      `;
      goToItem.addEventListener('click', () => this.selectSuggestion(query, pane, 'url'));
      suggestionsEl.appendChild(goToItem);
    }

    // Add search suggestions
    suggestions.slice(0, 8).forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.className = 'search-suggestion-item';
      item.dataset.value = suggestion;
      item.dataset.index = isUrl ? index + 1 : index;
      item.innerHTML = `
        <span class="suggestion-icon"><span class="sf-icon">􀊫</span></span>
        <span class="suggestion-text">${this.escapeHtml(suggestion)}</span>
        <span class="suggestion-type">Search</span>
      `;
      item.addEventListener('click', () => this.selectSuggestion(suggestion, pane, 'search'));
      suggestionsEl.appendChild(item);
    });

    suggestionsEl.classList.add('open');
  },

  /**
   * Hide search suggestions dropdown
   */
  hideSearchSuggestions(pane = 1) {
    const suggestionsEl = pane === 2 ? this.elements.searchSuggestions2 : this.elements.searchSuggestions;
    if (suggestionsEl) {
      suggestionsEl.classList.remove('open');
      suggestionsEl.innerHTML = '';
    }
    this.currentSuggestions[pane] = [];
    this.selectedSuggestionIndex[pane] = -1;
  },

  /**
   * Select a suggestion from the dropdown
   */
  selectSuggestion(value, pane = 1, type = 'search') {
    const addressInput = pane === 2 ? this.elements.addressInput2 : this.elements.addressInput;
    if (addressInput) {
      addressInput.value = value;
      if (pane === 1) {
        BrowserState.setAddressBarValue(value);
      }
    }
    this.hideSearchSuggestions(pane);
    
    // Navigate
    if (type === 'url') {
      this.navigateToUrl(value, pane);
    } else {
      // Search query - use user's selected search engine
      const searchUrl = this.getSearchUrl(value);
      this.navigateToUrl(searchUrl, pane);
    }
    addressInput?.blur();
  },

  /**
   * Get the currently selected suggestion value
   */
  getSelectedSuggestion(pane = 1) {
    const index = this.selectedSuggestionIndex[pane];
    if (index >= 0 && this.currentSuggestions[pane][index]) {
      return this.currentSuggestions[pane][index];
    }
    return null;
  },

  /**
   * Select next suggestion in the dropdown
   */
  selectNextSuggestion(pane = 1) {
    const suggestionsEl = pane === 2 ? this.elements.searchSuggestions2 : this.elements.searchSuggestions;
    const items = suggestionsEl?.querySelectorAll('.search-suggestion-item');
    if (!items || items.length === 0) return;

    const currentIndex = this.selectedSuggestionIndex[pane];
    const newIndex = Math.min(currentIndex + 1, items.length - 1);
    this.highlightSuggestion(newIndex, pane);
  },

  /**
   * Select previous suggestion in the dropdown
   */
  selectPrevSuggestion(pane = 1) {
    const suggestionsEl = pane === 2 ? this.elements.searchSuggestions2 : this.elements.searchSuggestions;
    const items = suggestionsEl?.querySelectorAll('.search-suggestion-item');
    if (!items || items.length === 0) return;

    const currentIndex = this.selectedSuggestionIndex[pane];
    const newIndex = Math.max(currentIndex - 1, -1);
    this.highlightSuggestion(newIndex, pane);
  },

  /**
   * Highlight a specific suggestion
   */
  highlightSuggestion(index, pane = 1) {
    const suggestionsEl = pane === 2 ? this.elements.searchSuggestions2 : this.elements.searchSuggestions;
    const items = suggestionsEl?.querySelectorAll('.search-suggestion-item');
    if (!items) return;

    // Remove previous selection
    items.forEach(item => item.classList.remove('selected'));

    // Set new selection
    this.selectedSuggestionIndex[pane] = index;
    if (index >= 0 && items[index]) {
      items[index].classList.add('selected');
      // Update input value to show selected suggestion
      const value = items[index].dataset.value;
      const addressInput = pane === 2 ? this.elements.addressInput2 : this.elements.addressInput;
      if (addressInput && value) {
        addressInput.value = value;
      }
    }
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIBindings;
}
