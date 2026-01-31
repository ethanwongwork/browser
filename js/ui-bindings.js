/**
 * UI Bindings
 * Connects BrowserState to the DOM without changing visual appearance
 */

// Detect if running in Electron
const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;

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
    this.initWebview();
    console.log('[UI] Bindings initialized', isElectron ? '(Electron)' : '(Browser)');
    return this;
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
        BrowserState.updateTab(tab.id, { title: e.title });
      }
    });

    // Page favicon updated
    webview.addEventListener('page-favicon-updated', (e) => {
      const tab = BrowserState.getActiveTab();
      if (tab && e.favicons && e.favicons.length > 0) {
        BrowserState.updateTab(tab.id, { faviconUrl: e.favicons[0] });
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
      toolbarTab: document.querySelector('.toolbar-tab'),
      toolbarTabFavicon: document.querySelector('.toolbar-tab .favicon'),
      toolbarTabTitle: document.querySelector('.toolbar-tab .tab-title'),
      panelBtn: document.querySelector('.toolbar-left .icon-btn[title="Panel"]'),
      newTabBtn: document.querySelector('.icon-btn[title="New Tab"]'),
      backBtn: document.querySelector('.icon-btn[title="Back"]'),
      forwardBtn: document.querySelector('.icon-btn[title="Forward"]'),
      reloadBtn: document.querySelector('.icon-btn[title="Reload"]'),
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
      sendBtn: document.getElementById('send-btn'),
      modelSelector: document.getElementById('model-selector'),
      modelName: document.getElementById('model-name'),
      attachBtn: document.querySelector('.chat-input-actions .icon-btn[title="Attach"]')
    };
    
    // Update model name display
    this.updateModelDisplay();
  },

  /**
   * Update the model name display
   */
  updateModelDisplay() {
    if (this.elements.modelName && typeof AIService !== 'undefined') {
      const models = AIService.getAvailableModels();
      const currentModel = AIService.config.model;
      const modelInfo = models.find(m => m.id === currentModel);
      this.elements.modelName.textContent = modelInfo?.name || currentModel;
    }
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

    // Reload button
    this.elements.reloadBtn?.addEventListener('click', () => {
      this.reloadPage();
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

    // Model selector - open AI settings
    this.elements.modelSelector?.addEventListener('click', () => {
      this.showAISettings();
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

    // Escape: Close find bar
    if (e.key === 'Escape') {
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
    
    // Chat/AI events
    BrowserState.on('conversationAdded', (conv) => this.renderConversation());
    BrowserState.on('conversationUpdated', (conv) => this.renderConversation());
    BrowserState.on('messageUpdated', () => this.renderConversation());
    BrowserState.on('activeConversationChanged', () => this.renderConversation());
    BrowserState.on('chatLoadingChanged', (isLoading) => this.updateChatLoadingState(isLoading));
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

    // Separate pinned and unpinned tabs
    const pinnedTabs = tabs.filter(t => t.isPinned);
    const unpinnedTabs = tabs.filter(t => !t.isPinned);

    // Render pinned tabs first
    if (pinnedTabs.length > 0) {
      const pinnedContainer = document.createElement('div');
      pinnedContainer.className = 'sidebar-pinned-tabs';
      pinnedTabs.forEach(tab => {
        const tabItem = this.createSidebarTabItem(tab);
        pinnedContainer.appendChild(tabItem);
      });
      this.elements.sidebar.appendChild(pinnedContainer);
    }

    // Render unpinned tabs
    unpinnedTabs.forEach(tab => {
      const tabItem = this.createSidebarTabItem(tab);
      this.elements.sidebar.appendChild(tabItem);
    });

    // Update overflow indicator
    this.updateTabOverflow();
  },

  /**
   * Create a sidebar tab item element
   */
  createSidebarTabItem(tab) {
    const isActive = tab.id === BrowserState.activeTabId;
    const isPinned = tab.isPinned;
    
    const item = document.createElement('div');
    item.className = `sidebar-tab-item${isActive ? ' active' : ''}${isPinned ? ' pinned' : ''}`;
    item.dataset.tabId = tab.id;
    item.draggable = true;

    if (isPinned) {
      // Pinned tabs show only favicon
      item.innerHTML = `
        <div class="favicon favicon-${tab.favicon || 'wikipedia'}" title="${this.escapeHtml(tab.title)}"></div>
      `;
    } else {
      item.innerHTML = `
        <div class="favicon favicon-${tab.favicon || 'wikipedia'}"></div>
        <span class="tab-item-title">${this.escapeHtml(tab.title)}</span>
        <button class="tab-close-btn" title="Close tab">
          <img src="icons/Dismiss.svg" alt="Close">
        </button>
      `;
    }

    // Click to activate tab
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.tab-close-btn')) {
        BrowserState.setActiveTab(tab.id);
      }
    });

    // Middle-click to close tab
    item.addEventListener('mousedown', (e) => {
      if (e.button === 1) { // Middle mouse button
        e.preventDefault();
        BrowserState.removeTab(tab.id);
      }
    });

    // Right-click context menu
    item.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showTabContextMenu(e, tab);
    });

    // Close button (only for unpinned tabs)
    const closeBtn = item.querySelector('.tab-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      BrowserState.removeTab(tab.id);
    });

    // Drag and drop handlers
    item.addEventListener('dragstart', (e) => this.onTabDragStart(e, tab));
    item.addEventListener('dragover', (e) => this.onTabDragOver(e));
    item.addEventListener('dragenter', (e) => this.onTabDragEnter(e));
    item.addEventListener('dragleave', (e) => this.onTabDragLeave(e));
    item.addEventListener('drop', (e) => this.onTabDrop(e, tab));
    item.addEventListener('dragend', (e) => this.onTabDragEnd(e));

    // Hover preview
    item.addEventListener('mouseenter', (e) => this.showTabPreview(e, tab));
    item.addEventListener('mouseleave', () => this.hideTabPreview());

    return item;
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
    const tabItem = e.target.closest('.sidebar-tab-item');
    if (tabItem && !tabItem.classList.contains('dragging')) {
      tabItem.classList.add('drag-over');
    }
  },

  onTabDragLeave(e) {
    const tabItem = e.target.closest('.sidebar-tab-item');
    if (tabItem) {
      tabItem.classList.remove('drag-over');
    }
  },

  onTabDrop(e, targetTab) {
    e.preventDefault();
    const tabItem = e.target.closest('.sidebar-tab-item');
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
    document.querySelectorAll('.sidebar-tab-item.drag-over').forEach(el => {
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

    preview.innerHTML = `
      <div class="tab-preview-title">${this.escapeHtml(tab.title)}</div>
      <div class="tab-preview-url">${this.escapeHtml(tab.url)}</div>
    `;

    // Position preview to the right of the sidebar
    const tabItem = e.target.closest('.sidebar-tab-item');
    if (tabItem) {
      const rect = tabItem.getBoundingClientRect();
      preview.style.left = `${rect.right + 8}px`;
      preview.style.top = `${rect.top}px`;
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

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB OVERFLOW
  // ═══════════════════════════════════════════════════════════════════════════

  updateTabOverflow() {
    const sidebar = this.elements.sidebar;
    if (!sidebar) return;

    const hasOverflow = sidebar.scrollHeight > sidebar.clientHeight;
    sidebar.classList.toggle('has-overflow', hasOverflow);
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

    const webview = this.elements.webviewFrame;

    // For Electron webview, use executeJavaScript
    if (isElectron && webview) {
      // Return a promise for async extraction
      return webview.executeJavaScript(`
        JSON.stringify({
          url: window.location.href,
          title: document.title,
          content: document.body?.innerText?.slice(0, 5000) || ''
        })
      `).then(result => JSON.parse(result)).catch(() => ({
        url: tab.url,
        title: tab.title,
        restricted: true
      }));
    }

    // Fallback for iframe
    try {
      const iframeDoc = webview?.contentDocument;
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
  // CONVERSATION UI
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Render the conversation messages
   */
  renderConversation() {
    const conversation = BrowserState.getActiveConversation();
    
    // Get or create conversation container
    let container = document.getElementById('conversation-messages');
    if (!container) {
      container = document.createElement('div');
      container.id = 'conversation-messages';
      container.className = 'conversation-messages';
      
      // Insert before chat input wrapper
      const chatOverlay = document.querySelector('.chat-overlay-container');
      if (chatOverlay) {
        chatOverlay.insertBefore(container, chatOverlay.firstChild);
      }
    }

    if (!conversation || conversation.messages.length === 0) {
      container.innerHTML = '';
      container.classList.remove('active');
      return;
    }

    container.classList.add('active');

    // Render messages
    container.innerHTML = conversation.messages.map(msg => this.renderMessage(msg)).join('');

    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
  },

  /**
   * Render a single message
   */
  renderMessage(message) {
    const isUser = message.role === 'user';
    const isStreaming = message.isStreaming;
    const isError = message.isError;
    
    const content = this.renderMarkdown(message.content || '');
    
    return `
      <div class="message ${isUser ? 'message-user' : 'message-assistant'}${isStreaming ? ' streaming' : ''}${isError ? ' error' : ''}">
        <div class="message-avatar">
          ${isUser ? this.getUserAvatar() : this.getAIAvatar()}
        </div>
        <div class="message-content">
          <div class="message-text">${content}${isStreaming ? '<span class="typing-cursor"></span>' : ''}</div>
        </div>
      </div>
    `;
  },

  /**
   * Get user avatar HTML
   */
  getUserAvatar() {
    return `<div class="avatar avatar-user">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    </div>`;
  },

  /**
   * Get AI avatar HTML
   */
  getAIAvatar() {
    return `<div class="avatar avatar-ai">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    </div>`;
  },

  /**
   * Simple markdown rendering
   */
  renderMarkdown(text) {
    if (!text) return '';
    
    let html = this.escapeHtml(text);
    
    // Code blocks (```code```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="code-block${lang ? ` language-${lang}` : ''}"><code>${code.trim()}</code></pre>`;
    });
    
    // Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Bold (**text**)
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Italic (*text*)
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    
    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    
    // Line breaks
    html = html.replace(/\n/g, '<br>');
    
    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
    
    return html;
  },

  /**
   * Update chat loading state
   */
  updateChatLoadingState(isLoading) {
    const sendBtn = this.elements.sendBtn;
    if (sendBtn) {
      sendBtn.disabled = isLoading;
      sendBtn.classList.toggle('loading', isLoading);
    }
    
    // Update chat input
    if (this.elements.chatInput) {
      this.elements.chatInput.disabled = isLoading;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI SETTINGS
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
          <button class="modal-close" onclick="UIBindings.hideAISettings()">
            <img src="icons/Dismiss.svg" alt="Close">
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
  }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIBindings;
}
