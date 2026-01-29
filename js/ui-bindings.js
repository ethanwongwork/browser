/**
 * UI Bindings
 * Connects BrowserState to the DOM without changing visual appearance
 */

const UIBindings = {
  // DOM element references
  elements: {},

  /**
   * Initialize UI bindings
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.subscribeToState();
    console.log('[UI] Bindings initialized');
    return this;
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements = {
      // Toolbar
      toolbar: document.querySelector('.toolbar'),
      toolbarTab: document.querySelector('.toolbar-tab'),
      toolbarTabFavicon: document.querySelector('.toolbar-tab .favicon'),
      toolbarTabTitle: document.querySelector('.toolbar-tab .tab-title'),
      panelBtn: document.querySelector('.toolbar-left .icon-btn[title="Panel"]'),
      newTabBtn: document.querySelector('.icon-btn[title="New Tab"]'),
      backBtn: document.querySelector('.icon-btn[title="Back"]'),
      forwardBtn: document.querySelector('.icon-btn[title="Forward"]'),
      splitBtn: document.querySelector('.icon-btn[title="Split"]'),
      closeBtn: document.querySelector('.icon-btn[title="Close"]'),

      // Search bar
      searchBar: document.querySelector('.search-bar'),
      addressInput: document.getElementById('address-input'),
      searchPlaceholder: document.querySelector('.search-placeholder'),
      starIcon: document.querySelector('.star-icon'),

      // Content area
      contentArea: document.querySelector('.content-area'),
      sidebar: document.querySelector('.sidebar'),
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

      // Chat
      chatInput: document.getElementById('chat-input'),
      chatPlaceholder: document.querySelector('.chat-input-placeholder'),
      sendBtn: document.querySelector('.send-btn'),
      modelSelector: document.querySelector('.model-selector'),
      attachBtn: document.querySelector('.chat-input-actions .icon-btn[title="Attach"]')
    };
  },

  /**
   * Bind DOM event listeners
   */
  bindEvents() {
    // New Tab button
    this.elements.newTabBtn?.addEventListener('click', () => {
      BrowserState.addTab();
    });

    // Back button
    this.elements.backBtn?.addEventListener('click', () => {
      this.navigateBack();
    });

    // Forward button
    this.elements.forwardBtn?.addEventListener('click', () => {
      this.navigateForward();
    });

    // Address bar
    this.elements.addressInput?.addEventListener('focus', () => {
      BrowserState.setAddressBarFocus(true);
      this.elements.addressInput.select();
    });

    this.elements.addressInput?.addEventListener('blur', () => {
      BrowserState.setAddressBarFocus(false);
    });

    this.elements.addressInput?.addEventListener('input', (e) => {
      BrowserState.setAddressBarValue(e.target.value);
      this.updateSearchPlaceholder();
    });

    this.elements.addressInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const url = BrowserState.commitAddressBar();
        this.navigateToUrl(url);
        this.elements.addressInput.blur();
      } else if (e.key === 'Escape') {
        BrowserState.cancelAddressBarEdit();
        this.elements.addressInput.blur();
      }
    });

    // Star/bookmark icon
    this.elements.starIcon?.addEventListener('click', () => {
      const tab = BrowserState.getActiveTab();
      if (tab && tab.url) {
        BrowserState.addFavorite({
          title: tab.title,
          url: tab.url,
          favicon: tab.favicon
        });
        console.log('[UI] Added favorite:', tab.title);
      }
    });

    // Chat input
    this.elements.chatInput?.addEventListener('input', (e) => {
      BrowserState.setChatInput(e.target.value);
      this.updateChatPlaceholder();
    });

    this.elements.chatInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.submitChat();
      }
    });

    // Send button
    this.elements.sendBtn?.addEventListener('click', () => {
      this.submitChat();
    });

    // Panel toggle (sidebar)
    this.elements.panelBtn?.addEventListener('click', () => {
      this.toggleSidebar();
    });

    // Close button (close active tab)
    this.elements.closeBtn?.addEventListener('click', () => {
      const activeTab = BrowserState.getActiveTab();
      if (activeTab) {
        BrowserState.removeTab(activeTab.id);
      }
    });

    // Webview load events
    this.elements.webviewFrame?.addEventListener('load', () => {
      this.onWebviewLoad();
    });
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
  },

  /**
   * Main render function
   */
  render() {
    this.renderToolbar();
    this.renderSidebar();
    this.renderContent();
    this.renderAddressBar();
  },

  /**
   * Render toolbar state
   */
  renderToolbar() {
    const tab = BrowserState.getActiveTab();
    
    // Update tab title
    if (this.elements.toolbarTabTitle) {
      this.elements.toolbarTabTitle.textContent = tab?.title || 'New tab';
    }

    // Update tab favicon
    if (this.elements.toolbarTabFavicon) {
      this.updateFavicon(this.elements.toolbarTabFavicon, tab?.favicon);
    }

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
   * Update chat placeholder visibility
   */
  updateChatPlaceholder() {
    if (this.elements.chatPlaceholder) {
      const hasValue = this.elements.chatInput?.value?.length > 0;
      this.elements.chatPlaceholder.style.display = hasValue ? 'none' : '';
    }
  },

  /**
   * Render sidebar with tabs
   */
  renderSidebar() {
    if (!this.elements.sidebar) return;

    const tabs = BrowserState.tabs;
    
    // Clear existing tab items (keep structure)
    this.elements.sidebar.innerHTML = '';

    // Render each tab
    tabs.forEach(tab => {
      const tabItem = this.createSidebarTabItem(tab);
      this.elements.sidebar.appendChild(tabItem);
    });
  },

  /**
   * Create a sidebar tab item element
   */
  createSidebarTabItem(tab) {
    const isActive = tab.id === BrowserState.activeTabId;
    
    const item = document.createElement('div');
    item.className = `sidebar-tab-item${isActive ? ' active' : ''}`;
    item.dataset.tabId = tab.id;

    item.innerHTML = `
      <div class="favicon favicon-${tab.favicon || 'wikipedia'}"></div>
      <span class="tab-item-title">${this.escapeHtml(tab.title)}</span>
      <button class="tab-close-btn" title="Close tab">
        <img src="icons/Dismiss.svg" alt="Close">
      </button>
    `;

    // Click to activate tab
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.tab-close-btn')) {
        BrowserState.setActiveTab(tab.id);
      }
    });

    // Close button
    const closeBtn = item.querySelector('.tab-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      BrowserState.removeTab(tab.id);
    });

    return item;
  },

  /**
   * Render main content area (NTP or webview)
   */
  renderContent() {
    const tab = BrowserState.getActiveTab();
    const hasUrl = tab && tab.url && tab.url.startsWith('http');

    if (hasUrl) {
      // Show webview
      this.elements.newTabPage?.classList.add('hidden');
      this.elements.webviewContainer?.classList.add('active');
    } else {
      // Show New Tab Page
      this.elements.webviewContainer?.classList.remove('active');
      this.elements.newTabPage?.classList.remove('hidden');
      this.renderNtp();
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

    // Clear existing (except add button)
    const addBtn = this.elements.favoritesRow.querySelector('.icon-btn');
    this.elements.favoritesRow.innerHTML = '';

    // Render favorites (max 12)
    favorites.slice(0, 12).forEach(fav => {
      const favEl = document.createElement('div');
      favEl.className = `favorite-icon favicon-${fav.favicon || 'wikipedia'}`;
      favEl.title = fav.title;
      favEl.addEventListener('click', () => {
        this.navigateToUrl(fav.url);
      });
      this.elements.favoritesRow.appendChild(favEl);
    });

    // Re-add the add button
    if (addBtn) {
      this.elements.favoritesRow.appendChild(addBtn);
    } else {
      // Create add button if missing
      const newAddBtn = document.createElement('button');
      newAddBtn.className = 'icon-btn icon-btn-lg';
      newAddBtn.title = 'Add Favorite';
      newAddBtn.innerHTML = '<span class="icon"><img src="icons/Add.svg" alt="Add Favorite"></span>';
      newAddBtn.addEventListener('click', () => {
        // Prompt for URL (simplified)
        const url = prompt('Enter URL to add to favorites:');
        if (url) {
          BrowserState.addFavorite({ title: url, url: url });
        }
      });
      this.elements.favoritesRow.appendChild(newAddBtn);
    }
  },

  /**
   * Render recent chats
   */
  renderRecentChats(chats) {
    if (!this.elements.chatsRow) return;

    this.elements.chatsRow.innerHTML = '';

    // If no chats, show placeholders
    const displayChats = chats.length > 0 ? chats : [
      { id: '1', title: 'Name', description: 'Description of chat summary here', favicon: 'wikipedia' },
      { id: '2', title: 'Name', description: 'Description of chat summary here', favicon: 'wikipedia' },
      { id: '3', title: 'Name', description: 'Description of chat summary here', favicon: 'wikipedia' },
      { id: '4', title: 'Name', description: 'Description of chat summary here', favicon: 'wikipedia' }
    ];

    displayChats.forEach(chat => {
      const card = document.createElement('div');
      card.className = 'chat-card';
      card.innerHTML = `
        <div class="chat-card-header">
          <div class="favicon favicon-${chat.favicon || 'wikipedia'}"></div>
          <span class="name">${this.escapeHtml(chat.title)}</span>
        </div>
        <div class="chat-card-description"><span>${this.escapeHtml(chat.description || '')}</span></div>
      `;
      card.addEventListener('click', () => {
        if (chat.id && BrowserState.getConversation(chat.id)) {
          BrowserState.setActiveConversation(chat.id);
          console.log('[UI] Activated conversation:', chat.id);
        }
      });
      this.elements.chatsRow.appendChild(card);
    });
  },

  /**
   * Render widgets
   */
  renderWidgets(widgets) {
    if (!this.elements.widgetsRow) return;

    this.elements.widgetsRow.innerHTML = '';

    // If no widgets, show placeholders
    const displayWidgets = widgets.length > 0 ? widgets : [
      { id: 'placeholder1', title: 'Name', favicon: 'wikipedia' },
      { id: 'placeholder2', title: 'Name', favicon: 'wikipedia' }
    ];

    displayWidgets.forEach(widget => {
      const card = document.createElement('div');
      card.className = 'widget-card';
      card.innerHTML = `
        <div class="widget-card-header">
          <div class="favicon favicon-${widget.favicon || 'wikipedia'}"></div>
          <span class="name">${this.escapeHtml(widget.title)}</span>
        </div>
        <div class="widget-card-content"></div>
      `;
      
      // Call widget render function if it exists
      if (typeof widget.render === 'function') {
        const contentEl = card.querySelector('.widget-card-content');
        widget.render(contentEl);
      }
      
      this.elements.widgetsRow.appendChild(card);
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
    if (this.elements.webviewFrame && normalizedUrl.startsWith('http')) {
      this.elements.webviewFrame.src = normalizedUrl;
      this.elements.webviewContainer?.classList.add('active');
      this.elements.newTabPage?.classList.add('hidden');
    }

    console.log('[UI] Navigating to:', normalizedUrl);
  },

  /**
   * Navigate back
   */
  navigateBack() {
    if (this.elements.webviewFrame?.contentWindow) {
      try {
        this.elements.webviewFrame.contentWindow.history.back();
      } catch (e) {
        console.log('[UI] Cannot navigate back (cross-origin)');
      }
    }
  },

  /**
   * Navigate forward
   */
  navigateForward() {
    if (this.elements.webviewFrame?.contentWindow) {
      try {
        this.elements.webviewFrame.contentWindow.history.forward();
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

    // Try to get title from iframe
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

  /**
   * Submit chat message
   */
  submitChat() {
    const value = BrowserState.chat.inputValue.trim();
    if (!value) return;

    // Extract page context if available
    const pageContext = this.extractPageContext();
    
    // Submit to state
    BrowserState.submitChat(pageContext);

    // Clear input
    if (this.elements.chatInput) {
      this.elements.chatInput.value = '';
    }
    this.updateChatPlaceholder();
  },

  /**
   * Extract page context from webview
   */
  extractPageContext() {
    const tab = BrowserState.getActiveTab();
    if (!tab || !tab.url || !tab.url.startsWith('http')) {
      return null;
    }

    try {
      const iframeDoc = this.elements.webviewFrame?.contentDocument;
      if (iframeDoc) {
        return {
          url: tab.url,
          title: iframeDoc.title || tab.title,
          content: iframeDoc.body?.innerText?.slice(0, 5000) || ''
        };
      }
    } catch (e) {
      // Cross-origin restriction
      return {
        url: tab.url,
        title: tab.title,
        restricted: true
      };
    }

    return null;
  },

  /**
   * Toggle sidebar visibility
   */
  toggleSidebar() {
    this.elements.sidebar?.classList.toggle('collapsed');
    console.log('[UI] Sidebar toggled');
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
   * Update favicon element
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
    element.classList.add(`favicon-${favicon || 'wikipedia'}`);
  },

  /**
   * Event handlers
   */
  onTabAdded(tab) {
    console.log('[UI] Tab added:', tab.title);
    this.renderSidebar();
  },

  onTabRemoved(tab) {
    console.log('[UI] Tab removed:', tab.title);
    this.renderSidebar();
  },

  onActiveTabChanged(tab) {
    console.log('[UI] Active tab changed:', tab?.title);
    this.render();
    
    // Navigate to URL if tab has one
    if (tab?.url && tab.url.startsWith('http')) {
      if (this.elements.webviewFrame?.src !== tab.url) {
        this.elements.webviewFrame.src = tab.url;
      }
    }
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIBindings;
}
