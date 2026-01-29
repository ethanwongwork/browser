/**
 * UI Bindings
 * Connects BrowserState to the existing DOM without visual changes
 */

const UIBindings = {
  // DOM element references (cached on init)
  elements: {
    toolbar: null,
    toolbarTab: null,
    toolbarTabFavicon: null,
    toolbarTabTitle: null,
    searchBar: null,
    searchText: null,
    sidebar: null,
    newTabBtn: null,
    closeBtn: null,
    panelBtn: null,
    splitBtn: null,
    webviewContainer: null,
    newTabPage: null
  },

  // Map of tab ID -> iframe element (one webview per tab)
  webviews: new Map(),

  // Sidebar visibility state
  sidebarVisible: false,

  /**
   * Initialize UI bindings
   */
  init() {
    this.cacheElements();
    this.bindStateEvents();
    this.bindDOMEvents();
    this.applySidebarVisibility(); // Apply initial sidebar state
    this.render(); // Initial render
    return this;
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements.toolbar = document.querySelector('.toolbar');
    this.elements.toolbarTab = document.querySelector('.toolbar-tab');
    this.elements.toolbarTabFavicon = document.querySelector('.toolbar-tab .favicon');
    this.elements.toolbarTabTitle = document.querySelector('.toolbar-tab .tab-title');
    this.elements.searchBar = document.querySelector('.search-bar');
    this.elements.searchText = document.querySelector('.search-bar .search-text');
    this.elements.addressInput = document.getElementById('address-input');
    this.elements.searchPlaceholder = document.querySelector('.search-bar .search-placeholder');
    this.elements.sidebar = document.querySelector('.sidebar');
    this.elements.newTabBtn = document.querySelector('.icon-btn[title="New Tab"]');
    this.elements.closeBtn = document.querySelector('.toolbar > .icon-btn[title="Close"]');
    this.elements.backBtn = document.querySelector('.icon-btn[title="Back"]');
    this.elements.forwardBtn = document.querySelector('.icon-btn[title="Forward"]');
    this.elements.panelBtn = document.querySelector('.toolbar-left .icon-btn[title="Panel"]');
    this.elements.splitBtn = document.querySelector('.icon-btn[title="Split"]');
    this.elements.starBtn = document.querySelector('.toolbar > .icon-btn[title="Star"]');
    this.elements.webviewContainer = document.getElementById('webview-container');
    this.elements.newTabPage = document.getElementById('new-tab-page');
    this.elements.chatInput = document.getElementById('chat-input');
    this.elements.chatSendBtn = document.querySelector('.send-btn');
    
    // Remove the static iframe - we'll create per-tab iframes dynamically
    const staticFrame = document.getElementById('webview-frame');
    if (staticFrame) {
      staticFrame.remove();
    }
  },

  /**
   * Bind to BrowserState events
   */
  bindStateEvents() {
    BrowserState.on('stateChanged', () => this.render());
    BrowserState.on('activeTabChanged', (tab) => {
      this.renderActiveTab(tab);
      // Switch to the tab's webview (don't re-navigate, preserve history)
      this.switchWebview(tab);
    });
    BrowserState.on('tabAdded', () => this.renderSidebar());
    BrowserState.on('tabRemoved', (tab) => {
      this.renderSidebar();
      this.destroyWebview(tab.id);
    });
    BrowserState.on('tabUpdated', (tab) => {
      this.render();
      // Navigate webview if URL changed on active tab
      if (tab.id === BrowserState.activeTabId && tab.url) {
        this.navigateWebview(tab.url);
      }
    });
    BrowserState.on('addressBarChanged', () => this.renderAddressBar());
    BrowserState.on('addressBarCommitted', (url) => this.navigateWebview(url));
    BrowserState.on('loadingStateChanged', ({ tabId, isLoading }) => {
      this.renderLoadingState(tabId, isLoading);
    });
    BrowserState.on('chatInputChanged', (value) => this.renderChatInput(value));
    BrowserState.on('aiInvocation', (data) => {
      console.log('[UI] AI Invocation triggered:', data);
    });
    BrowserState.on('ntpUpdated', () => this.renderNtp());
    BrowserState.on('conversationAdded', () => this.renderNtp());
    BrowserState.on('conversationUpdated', () => this.renderNtp());
  },

  /**
   * Bind DOM events to state actions
   */
  bindDOMEvents() {
    // Toolbar tab click - no action needed currently
    if (this.elements.toolbarTab) {
      this.elements.toolbarTab.addEventListener('click', () => {
        // Could toggle sidebar or show tab menu
        console.log('[UI] Toolbar tab clicked');
      });
    }

    // Search bar click - focus the input
    if (this.elements.searchBar) {
      this.elements.searchBar.addEventListener('click', () => {
        this.focusAddressBar();
      });
    }

    // Address input events
    if (this.elements.addressInput) {
      // Handle Enter key to navigate
      this.elements.addressInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.commitAddressBar();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.elements.addressInput.blur();
        }
      });

      // Handle focus - select all text
      this.elements.addressInput.addEventListener('focus', () => {
        BrowserState.setAddressBarFocus(true);
        // Select all on focus for easy replacement
        setTimeout(() => this.elements.addressInput.select(), 0);
      });

      // Handle blur - reset to current URL
      this.elements.addressInput.addEventListener('blur', () => {
        BrowserState.setAddressBarFocus(false);
        this.renderAddressBar();
      });
    }

    // New tab button
    if (this.elements.newTabBtn) {
      this.elements.newTabBtn.addEventListener('click', () => {
        console.log('[UI] New Tab clicked');
        BrowserState.addTab({
          title: 'New tab',
          url: '',
          favicon: 'wikipedia'
        });
      });
    }

    // Close button - closes active tab (if more than 1 tab)
    if (this.elements.closeBtn) {
      this.elements.closeBtn.addEventListener('click', () => {
        console.log('[UI] Close clicked');
        const activeTab = BrowserState.getActiveTab();
        if (activeTab && BrowserState.tabs.length > 1) {
          BrowserState.removeTab(activeTab.id);
        }
      });
    }

    // Panel button - toggles sidebar visibility
    if (this.elements.panelBtn) {
      this.elements.panelBtn.addEventListener('click', () => {
        console.log('[UI] Panel clicked - toggling sidebar');
        this.toggleSidebar();
      });
    }

    // Split button
    if (this.elements.splitBtn) {
      this.elements.splitBtn.addEventListener('click', () => {
        console.log('[UI] Split clicked - no action');
      });
    }

    // Chat input
    if (this.elements.chatInput) {
      // Sync input value to state on input
      this.elements.chatInput.addEventListener('input', (e) => {
        BrowserState.setChatInput(e.target.value);
      });

      // Submit on Enter key
      this.elements.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.submitChatWithContext();
        }
      });
    }

    // Chat send button
    if (this.elements.chatSendBtn) {
      this.elements.chatSendBtn.addEventListener('click', () => {
        this.submitChatWithContext();
      });
    }

    // Sidebar tab clicks are bound during renderSidebar()
  },

  /**
   * Submit chat with page context extraction
   * Only extracts context when user explicitly submits - never auto-invokes
   */
  submitChatWithContext() {
    // Extract page context only at submit time
    const pageContext = this.extractPageContext();
    
    // Pass to state for AI invocation
    BrowserState.submitChat(pageContext);
  },

  /**
   * Focus the address bar for editing
   */
  focusAddressBar() {
    if (!this.elements.addressInput) return;
    
    console.log('[UI] Address bar focused');
    this.elements.addressInput.focus();
  },

  /**
   * Commit address bar input - navigate or search
   */
  commitAddressBar() {
    if (!this.elements.addressInput) return;

    const input = this.elements.addressInput.value.trim();
    if (!input) return;

    console.log('[UI] Address bar committed:', input);

    // Determine if it's a URL or search query
    const url = this.parseAddressInput(input);
    
    // Update active tab URL and navigate
    const activeTab = BrowserState.getActiveTab();
    if (activeTab) {
      BrowserState.updateTab(activeTab.id, { url });
      BrowserState.setTabLoading(activeTab.id, true);
    }

    // Blur input after navigation
    this.elements.addressInput.blur();
  },

  /**
   * Parse address bar input into a navigable URL
   * @param {string} input - User input
   * @returns {string} Valid URL
   */
  parseAddressInput(input) {
    // If it looks like a URL with protocol, use as-is
    if (/^https?:\/\//i.test(input)) {
      return input;
    }

    // If it looks like a domain (has dot, no spaces)
    if (/^[^\s]+\.[^\s]+$/.test(input) && !input.includes(' ')) {
      return 'https://' + input;
    }

    // Otherwise, treat as search query
    return 'https://www.google.com/search?q=' + encodeURIComponent(input);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SIDEBAR VISIBILITY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Toggle sidebar visibility
   */
  toggleSidebar() {
    this.sidebarVisible = !this.sidebarVisible;
    this.applySidebarVisibility();
  },

  /**
   * Apply sidebar visibility state to DOM
   */
  applySidebarVisibility() {
    if (!this.elements.sidebar) return;
    
    if (this.sidebarVisible) {
      this.elements.sidebar.classList.remove('hidden');
      if (this.elements.panelBtn) {
        this.elements.panelBtn.classList.add('selected');
      }
    } else {
      this.elements.sidebar.classList.add('hidden');
      if (this.elements.panelBtn) {
        this.elements.panelBtn.classList.remove('selected');
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER METHODS (update DOM from state, preserving visuals)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Full render from state
   */
  render() {
    const activeTab = BrowserState.getActiveTab();
    if (activeTab) {
      this.renderActiveTab(activeTab);
      this.switchWebview(activeTab);
    }
    this.renderSidebar();
    this.renderAddressBar();
    this.renderChatInput(BrowserState.chat.inputValue);
    this.renderNtp();
  },

  /**
   * Render New Tab Page from state
   */
  renderNtp() {
    if (!this.elements.newTabPage) return;

    const ntpData = BrowserState.getNtpData();
    
    // Render favorites
    const favoritesRow = this.elements.newTabPage.querySelector('.favorites-row');
    if (favoritesRow) {
      const favoriteIcons = favoritesRow.querySelectorAll('.favorite-icon');
      favoriteIcons.forEach((icon, index) => {
        const favorite = ntpData.favorites[index];
        if (favorite) {
          // Update favicon class
          this.updateFavicon(icon, favorite.favicon);
          
          // Store data for click handling
          icon.dataset.favoriteId = favorite.id;
          icon.dataset.url = favorite.url;
          icon.title = favorite.title;
          icon.style.display = '';
          
          // Add click handler (only once)
          if (!icon.dataset.bound) {
            icon.addEventListener('click', () => {
              const url = icon.dataset.url;
              if (url) {
                console.log('[UI] Favorite clicked:', url);
                const activeTab = BrowserState.getActiveTab();
                if (activeTab) {
                  BrowserState.updateTab(activeTab.id, { url, title: icon.title });
                }
              }
            });
            icon.dataset.bound = 'true';
          }
        } else {
          // Hide unused icons
          icon.style.display = 'none';
        }
      });
    }
    
    // Render recent chats
    const chatsRow = this.elements.newTabPage.querySelector('.chats-row');
    if (chatsRow) {
      const chatCards = chatsRow.querySelectorAll('.chat-card');
      chatCards.forEach((card, index) => {
        const chat = ntpData.recentChats[index];
        if (chat) {
          // Update card with chat data
          const nameEl = card.querySelector('.name');
          const descEl = card.querySelector('.chat-card-description span');
          const faviconEl = card.querySelector('.favicon');
          
          if (nameEl) nameEl.textContent = chat.title;
          if (descEl) descEl.textContent = chat.description;
          if (faviconEl) this.updateFavicon(faviconEl, chat.favicon);
          
          // Store conversation ID for click handling
          card.dataset.conversationId = chat.id;
          card.style.display = '';
          
          // Add click handler to reopen conversation (only once)
          if (!card.dataset.bound) {
            card.addEventListener('click', () => {
              const conversationId = card.dataset.conversationId;
              if (conversationId) {
                console.log('[UI] Chat card clicked, resuming conversation:', conversationId);
                BrowserState.setActiveConversation(conversationId);
              }
            });
            card.dataset.bound = 'true';
          }
        } else {
          // Hide unused cards
          card.style.display = 'none';
        }
      });
    }
    
    // Render widgets
    this.renderWidgets(ntpData.widgets);
  },

  /**
   * Render widgets into NTP widget cards
   * @param {Array} widgets - Array of widget definitions
   */
  renderWidgets(widgets) {
    if (!this.elements.newTabPage) return;
    
    const widgetsRow = this.elements.newTabPage.querySelector('.widgets-row');
    if (!widgetsRow) return;
    
    const widgetCards = widgetsRow.querySelectorAll('.widget-card');
    
    widgetCards.forEach((card, index) => {
      const widget = widgets[index];
      if (widget) {
        // Update widget header
        const headerTitle = card.querySelector('.widget-card-header .name');
        const headerFavicon = card.querySelector('.widget-card-header .favicon');
        
        if (headerTitle) headerTitle.textContent = widget.title;
        if (headerFavicon) this.updateFavicon(headerFavicon, widget.favicon);
        
        // Get or create widget content container
        let contentArea = card.querySelector('.widget-content');
        if (!contentArea) {
          contentArea = document.createElement('div');
          contentArea.className = 'widget-content';
          card.appendChild(contentArea);
        }
        
        // Render widget content (only once per widget)
        if (card.dataset.widgetId !== widget.id) {
          contentArea.innerHTML = '';
          widget.render(contentArea);
          card.dataset.widgetId = widget.id;
        }
        
        card.style.display = '';
      } else {
        // Hide unused widget cards
        card.style.display = 'none';
      }
    });
  },

  /**
   * Render chat input value
   * @param {string} value
   */
  renderChatInput(value) {
    if (!this.elements.chatInput) return;
    
    // Only update if different to avoid cursor position issues
    if (this.elements.chatInput.value !== value) {
      this.elements.chatInput.value = value;
    }
  },

  /**
   * Render active tab info in toolbar
   */
  renderActiveTab(tab) {
    if (!tab) return;

    // Update toolbar tab title
    if (this.elements.toolbarTabTitle) {
      this.elements.toolbarTabTitle.textContent = tab.title;
    }

    // Update toolbar tab favicon
    if (this.elements.toolbarTabFavicon) {
      this.updateFavicon(this.elements.toolbarTabFavicon, tab.favicon);
    }
  },

  /**
   * Render address bar content
   */
  renderAddressBar() {
    const activeTab = BrowserState.getActiveTab();
    const url = activeTab?.url || '';

    // Update input value (only if not focused to avoid disrupting typing)
    if (this.elements.addressInput && document.activeElement !== this.elements.addressInput) {
      this.elements.addressInput.value = url;
    }

    // Update placeholder visibility
    if (this.elements.searchPlaceholder) {
      const showPlaceholder = !url && document.activeElement !== this.elements.addressInput;
      this.elements.searchPlaceholder.style.display = showPlaceholder ? '' : 'none';
    }
  },

  /**
   * Render sidebar tabs dynamically from state
   */
  renderSidebar() {
    if (!this.elements.sidebar) return;

    const tabs = BrowserState.tabs;
    const activeTabId = BrowserState.activeTabId;

    // Clear existing tabs
    this.elements.sidebar.innerHTML = '';

    // Create tab elements from state
    tabs.forEach((tab) => {
      const tabEl = document.createElement('div');
      tabEl.className = 'sidebar-tab';
      tabEl.dataset.tabId = tab.id;
      
      // Add active class if this is the active tab
      if (tab.id === activeTabId) {
        tabEl.classList.add('active');
      }

      // Create favicon
      const faviconEl = document.createElement('div');
      faviconEl.className = 'favicon';
      if (tab.favicon) {
        faviconEl.classList.add(`favicon-${tab.favicon}`);
      }
      tabEl.appendChild(faviconEl);

      // Create title
      const titleEl = document.createElement('span');
      titleEl.className = 'tab-title';
      titleEl.textContent = tab.title;
      tabEl.appendChild(titleEl);

      // Click handler to activate tab
      tabEl.addEventListener('click', () => {
        console.log('[UI] Sidebar tab clicked:', tab.id, tab.title);
        BrowserState.setActiveTab(tab.id);
      });

      this.elements.sidebar.appendChild(tabEl);
    });
  },

  /**
   * Render loading state for a tab
   */
  renderLoadingState(tabId, isLoading) {
    console.log('[UI] Loading state:', tabId, isLoading);
    // Visual loading indicators would require UI changes - skipping per lock
  },

  /**
   * Update favicon element class
   */
  updateFavicon(element, favicon) {
    if (!element) return;

    // Remove all favicon-* classes except base
    const classes = Array.from(element.classList);
    classes.forEach(cls => {
      if (cls.startsWith('favicon-')) {
        element.classList.remove(cls);
      }
    });

    // Add new favicon class
    if (favicon) {
      element.classList.add(`favicon-${favicon}`);
    } else {
      element.classList.add('favicon-wikipedia'); // Default
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WEBVIEW METHODS (Per-tab webview instances)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get or create a webview iframe for a tab
   * @param {string} tabId - Tab ID
   * @returns {HTMLIFrameElement} The iframe element
   */
  getOrCreateWebview(tabId) {
    if (this.webviews.has(tabId)) {
      return this.webviews.get(tabId);
    }

    // Create new iframe for this tab
    const iframe = document.createElement('iframe');
    iframe.className = 'webview-frame';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');
    iframe.src = 'about:blank';
    iframe.style.display = 'none'; // Hidden by default
    iframe.dataset.tabId = tabId;

    // Add to container
    if (this.elements.webviewContainer) {
      this.elements.webviewContainer.appendChild(iframe);
    }

    this.webviews.set(tabId, iframe);
    console.log('[UI] Created webview for tab:', tabId);
    return iframe;
  },

  /**
   * Destroy a webview when its tab is closed
   * @param {string} tabId - Tab ID
   */
  destroyWebview(tabId) {
    const iframe = this.webviews.get(tabId);
    if (iframe) {
      iframe.remove();
      this.webviews.delete(tabId);
      console.log('[UI] Destroyed webview for tab:', tabId);
    }
  },

  /**
   * Switch to show the webview for a specific tab
   * @param {Object} tab - The tab to switch to
   */
  switchWebview(tab) {
    if (!this.elements.webviewContainer || !this.elements.newTabPage) return;

    const hasUrl = tab && tab.url && tab.url.startsWith('http');

    // Hide all webviews first
    this.webviews.forEach((iframe) => {
      iframe.style.display = 'none';
    });

    if (hasUrl) {
      // Show this tab's webview, hide new tab page
      this.elements.webviewContainer.classList.add('active');
      this.elements.newTabPage.classList.add('hidden');

      const iframe = this.getOrCreateWebview(tab.id);
      iframe.style.display = 'block';

      // If iframe hasn't been navigated yet, navigate it
      if (iframe.src === 'about:blank' || iframe.src === '') {
        this.navigateWebview(tab.url);
      }
    } else {
      // Show new tab page, hide webview container
      this.elements.webviewContainer.classList.remove('active');
      this.elements.newTabPage.classList.remove('hidden');
    }
  },

  /**
   * Navigate the active tab's webview to a URL
   * @param {string} url - URL to navigate to
   */
  navigateWebview(url) {
    const activeTab = BrowserState.getActiveTab();
    if (!activeTab) return;
    if (!url || !url.startsWith('http')) {
      console.log('[UI] Invalid URL for navigation:', url);
      return;
    }

    // Get or create the webview for this tab
    const iframe = this.getOrCreateWebview(activeTab.id);

    // Skip if already at this URL
    if (iframe.src === url) {
      console.log('[UI] Already at URL:', url);
      return;
    }

    console.log('[UI] Navigating webview to:', url, 'for tab:', activeTab.id);

    // Set loading state
    BrowserState.setTabLoading(activeTab.id, true);

    // Store tab ID for the load handler (in case active tab changes)
    const tabId = activeTab.id;

    // Navigate iframe
    iframe.src = url;

    // Listen for load complete
    iframe.onload = () => {
      console.log('[UI] Webview loaded for tab:', tabId);
      BrowserState.setTabLoading(tabId, false);
      
      // Try to get page title (may fail due to cross-origin)
      try {
        const title = iframe.contentDocument?.title;
        if (title) {
          BrowserState.updateTab(tabId, { title });
        }
      } catch (e) {
        // Cross-origin - can't access title, use URL hostname
        try {
          const hostname = new URL(url).hostname;
          BrowserState.updateTab(tabId, { title: hostname });
        } catch (e2) {
          // Keep existing title
        }
      }
    };

    iframe.onerror = () => {
      console.log('[UI] Webview error for tab:', tabId);
      BrowserState.setTabLoading(tabId, false);
    };
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE CONTEXT EXTRACTION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Extract visible text content from the active webview
   * Returns null if page is restricted (cross-origin) or unavailable
   * @returns {Object|null} Page context with url, title, content, or null if unavailable
   */
  extractPageContext() {
    const activeTab = BrowserState.getActiveTab();
    if (!activeTab || !activeTab.url) {
      console.log('[UI] No active page for context extraction');
      return null;
    }

    const iframe = this.webviews.get(activeTab.id);
    if (!iframe) {
      console.log('[UI] No webview found for active tab');
      return null;
    }

    try {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        console.log('[UI] Cannot access document (cross-origin)');
        return {
          url: activeTab.url,
          title: activeTab.title,
          content: null,
          restricted: true
        };
      }

      // Extract visible text content
      const body = doc.body;
      if (!body) {
        return {
          url: activeTab.url,
          title: doc.title || activeTab.title,
          content: null,
          restricted: false
        };
      }

      // Get text content, removing script/style content
      const clone = body.cloneNode(true);
      const scripts = clone.querySelectorAll('script, style, noscript');
      scripts.forEach(el => el.remove());

      // Get clean text, normalize whitespace
      let text = clone.textContent || '';
      text = text.replace(/\s+/g, ' ').trim();

      // Limit content length for AI context (first ~8000 chars)
      const maxLength = 8000;
      if (text.length > maxLength) {
        text = text.slice(0, maxLength) + '...';
      }

      console.log('[UI] Extracted page context:', text.length, 'chars from', activeTab.url);

      return {
        url: activeTab.url,
        title: doc.title || activeTab.title,
        content: text,
        restricted: false
      };

    } catch (e) {
      // Cross-origin or other security restriction
      console.log('[UI] Page context extraction failed (likely cross-origin):', e.message);
      return {
        url: activeTab.url,
        title: activeTab.title,
        content: null,
        restricted: true
      };
    }
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIBindings;
}
