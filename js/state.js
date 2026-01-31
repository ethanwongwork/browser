/**
 * Browser State Model
 * Drives the existing UI without visual changes
 */

const BrowserState = {
  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  tabs: [],
  activeTabId: null,
  
  // Address bar state (separate from committed URL)
  addressBar: {
    value: '',        // Current input value (user typing)
    isFocused: false,
    isEditing: false  // True when user has modified but not committed
  },

  // Navigation state for active tab
  navigation: {
    canGoBack: false,
    canGoForward: false
  },

  // UI loading indicators
  ui: {
    isLoading: false,
    loadingTabId: null
  },

  // Chat input state (persistent across tabs)
  chat: {
    inputValue: '',
    activeConversationId: null,
    isLoading: false
  },

  // AI Conversations (independent of tabs, persists across sessions)
  conversations: [],

  // New Tab Page state
  ntp: {
    favorites: [],  // Array of { id, title, url, favicon }
    recentChats: [], // Derived from conversations
    enabledWidgets: ['notes', 'weather'] // Widget IDs that are enabled
  },

  // Widget Registry - stores widget definitions
  _widgetRegistry: {},

  // ═══════════════════════════════════════════════════════════════════════════
  // WIDGET REGISTRY
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Register a widget definition
   * @param {Object} widget - { id, title, favicon, render: (container) => void }
   */
  registerWidget(widget) {
    if (!widget.id || !widget.title || typeof widget.render !== 'function') {
      console.error('[State] Invalid widget definition:', widget);
      return;
    }
    this._widgetRegistry[widget.id] = widget;
    console.log('[State] Registered widget:', widget.id);
    this.emit('widgetRegistered', widget);
  },

  /**
   * Get a widget definition by ID
   * @param {string} widgetId
   * @returns {Object|undefined}
   */
  getWidget(widgetId) {
    return this._widgetRegistry[widgetId];
  },

  /**
   * Get all registered widgets
   * @returns {Array}
   */
  getAllWidgets() {
    return Object.values(this._widgetRegistry);
  },

  /**
   * Get enabled widgets for display
   * @returns {Array}
   */
  getEnabledWidgets() {
    return this.ntp.enabledWidgets
      .map(id => this._widgetRegistry[id])
      .filter(Boolean);
  },

  /**
   * Enable a widget
   * @param {string} widgetId
   */
  enableWidget(widgetId) {
    if (!this._widgetRegistry[widgetId]) {
      console.error('[State] Widget not found:', widgetId);
      return;
    }
    if (!this.ntp.enabledWidgets.includes(widgetId)) {
      this.ntp.enabledWidgets.push(widgetId);
      this.saveNtpData();
      this.emit('ntpUpdated', this.getNtpData());
    }
  },

  /**
   * Disable a widget
   * @param {string} widgetId
   */
  disableWidget(widgetId) {
    const index = this.ntp.enabledWidgets.indexOf(widgetId);
    if (index !== -1) {
      this.ntp.enabledWidgets.splice(index, 1);
      this.saveNtpData();
      this.emit('ntpUpdated', this.getNtpData());
    }
  },

  /**
   * Check if a widget is enabled
   * @param {string} widgetId
   * @returns {boolean}
   */
  isWidgetEnabled(widgetId) {
    return this.ntp.enabledWidgets.includes(widgetId);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERSATION SCHEMA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Creates a new conversation object
   * @param {Object} options
   * @returns {Object} Conversation object
   */
  createConversation(options = {}) {
    const now = Date.now();
    return {
      id: options.id || this.generateId(),
      title: options.title || 'New conversation',
      createdAt: options.createdAt || now,
      lastUpdated: options.lastUpdated || now,
      messages: options.messages || [],
      originatingContext: options.originatingContext || 'global' // 'global' | 'page' | 'tab'
    };
  },

  /**
   * Creates a new message object
   * @param {Object} options
   * @returns {Object} Message object
   */
  createMessage(options = {}) {
    return {
      id: options.id || this.generateId(),
      role: options.role || 'user', // 'user' | 'assistant' | 'system'
      content: options.content || '',
      timestamp: options.timestamp || Date.now(),
      metadata: options.metadata || {}
    };
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB SCHEMA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Creates a new tab object
   * @param {Object} options
   * @returns {Object} Tab object
   */
  createTab(options = {}) {
    return {
      id: options.id || this.generateId(),
      title: options.title || 'New tab',
      url: options.url || '',
      favicon: options.favicon || null,
      isPinned: options.isPinned || false,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      history: [],
      historyIndex: -1
    };
  },

  /**
   * Generates a unique tab ID
   * @returns {string}
   */
  generateId() {
    return `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Adds a new tab
   * @param {Object} options - Tab options
   * @returns {Object} The created tab
   */
  addTab(options = {}) {
    const tab = this.createTab(options);
    this.tabs.push(tab);
    this.setActiveTab(tab.id);
    this.saveTabs();
    this.emit('tabAdded', tab);
    this.emit('stateChanged');
    return tab;
  },

  /**
   * Removes a tab by ID
   * @param {string} tabId
   */
  removeTab(tabId) {
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    const tab = this.tabs[index];
    this.tabs.splice(index, 1);

    // If we removed the active tab, activate another
    if (this.activeTabId === tabId) {
      if (this.tabs.length > 0) {
        // Prefer the tab to the left, or the first tab
        const newIndex = Math.max(0, index - 1);
        this.setActiveTab(this.tabs[newIndex].id);
      } else {
        this.activeTabId = null;
        this.addressBar.value = '';
      }
    }

    this.saveTabs();
    this.emit('tabRemoved', tab);
    this.emit('stateChanged');
  },

  /**
   * Close all tabs except the specified one
   * @param {string} keepTabId - The tab to keep open
   */
  closeOtherTabs(keepTabId) {
    const tabsToClose = this.tabs.filter(t => t.id !== keepTabId);
    tabsToClose.forEach(tab => {
      const index = this.tabs.findIndex(t => t.id === tab.id);
      if (index !== -1) {
        this.tabs.splice(index, 1);
      }
    });
    
    // Make sure the kept tab is active
    this.setActiveTab(keepTabId);
    
    this.saveTabs();
    this.emit('stateChanged');
  },

  /**
   * Close all tabs to the right of the specified tab
   * @param {string} tabId
   */
  closeTabsToRight(tabId) {
    const index = this.tabs.findIndex(t => t.id === tabId);
    if (index === -1) return;

    const tabsToClose = this.tabs.slice(index + 1);
    this.tabs = this.tabs.slice(0, index + 1);

    // If active tab was closed, activate the reference tab
    if (!this.tabs.find(t => t.id === this.activeTabId)) {
      this.setActiveTab(tabId);
    }

    this.saveTabs();
    this.emit('stateChanged');
  },

  /**
   * Duplicate a tab
   * @param {string} tabId
   * @returns {Object} The new duplicated tab
   */
  duplicateTab(tabId) {
    const sourceTab = this.getTab(tabId);
    if (!sourceTab) return null;

    const newTab = this.createTab({
      title: sourceTab.title,
      url: sourceTab.url,
      favicon: sourceTab.favicon
    });

    // Insert after the source tab
    const index = this.tabs.findIndex(t => t.id === tabId);
    this.tabs.splice(index + 1, 0, newTab);

    this.setActiveTab(newTab.id);
    this.saveTabs();
    this.emit('tabAdded', newTab);
    this.emit('stateChanged');
    
    return newTab;
  },

  /**
   * Toggle pin state of a tab
   * @param {string} tabId
   */
  togglePinTab(tabId) {
    const tab = this.getTab(tabId);
    if (!tab) return;

    tab.isPinned = !tab.isPinned;

    // Reorder: pinned tabs go to the front
    if (tab.isPinned) {
      const index = this.tabs.findIndex(t => t.id === tabId);
      this.tabs.splice(index, 1);
      
      // Find the last pinned tab and insert after it
      const lastPinnedIndex = this.tabs.reduce((acc, t, i) => t.isPinned ? i : acc, -1);
      this.tabs.splice(lastPinnedIndex + 1, 0, tab);
    }

    this.saveTabs();
    this.emit('stateChanged');
  },

  /**
   * Reorder a tab (move draggedTabId before targetTabId)
   * @param {string} draggedTabId
   * @param {string} targetTabId
   */
  reorderTab(draggedTabId, targetTabId) {
    const draggedIndex = this.tabs.findIndex(t => t.id === draggedTabId);
    const targetIndex = this.tabs.findIndex(t => t.id === targetTabId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;

    // Don't allow moving pinned to unpinned section or vice versa
    const draggedTab = this.tabs[draggedIndex];
    const targetTab = this.tabs[targetIndex];
    if (draggedTab.isPinned !== targetTab.isPinned) return;

    // Remove and re-insert
    const [removed] = this.tabs.splice(draggedIndex, 1);
    const newTargetIndex = this.tabs.findIndex(t => t.id === targetTabId);
    this.tabs.splice(newTargetIndex, 0, removed);

    this.saveTabs();
    this.emit('stateChanged');
  },

  /**
   * Sets the active tab
   * @param {string} tabId
   */
  setActiveTab(tabId) {
    const tab = this.getTab(tabId);
    if (!tab) return;

    this.activeTabId = tabId;
    
    // Sync address bar with tab URL
    this.addressBar.value = tab.url;
    this.addressBar.isEditing = false;

    // Sync navigation state
    this.navigation.canGoBack = tab.canGoBack;
    this.navigation.canGoForward = tab.canGoForward;

    this.saveTabs();
    this.emit('activeTabChanged', tab);
    this.emit('stateChanged');
  },

  /**
   * Gets a tab by ID
   * @param {string} tabId
   * @returns {Object|null}
   */
  getTab(tabId) {
    return this.tabs.find(t => t.id === tabId) || null;
  },

  /**
   * Gets the active tab
   * @returns {Object|null}
   */
  getActiveTab() {
    return this.getTab(this.activeTabId);
  },

  /**
   * Get tab context for AI (titles and URLs of all open tabs)
   * @returns {Object} Tab context with tabs array and activeTabId
   */
  getTabContext() {
    return {
      activeTabId: this.activeTabId,
      tabs: this.tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url || null,
        isActive: tab.id === this.activeTabId
      }))
    };
  },

  /**
   * Updates a tab's properties
   * @param {string} tabId
   * @param {Object} updates
   */
  updateTab(tabId, updates) {
    const tab = this.getTab(tabId);
    if (!tab) return;

    Object.assign(tab, updates);

    // If updating active tab, sync navigation state
    if (tabId === this.activeTabId) {
      if ('canGoBack' in updates) this.navigation.canGoBack = updates.canGoBack;
      if ('canGoForward' in updates) this.navigation.canGoForward = updates.canGoForward;
      if ('url' in updates && !this.addressBar.isEditing) {
        this.addressBar.value = updates.url;
      }
    }

    // Save if persistent fields changed
    if ('url' in updates || 'title' in updates || 'favicon' in updates) {
      this.saveTabs();
    }

    this.emit('tabUpdated', tab);
    this.emit('stateChanged');
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADDRESS BAR OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Sets the address bar input value (user typing)
   * @param {string} value
   */
  setAddressBarValue(value) {
    this.addressBar.value = value;
    this.addressBar.isEditing = true;
    this.emit('addressBarChanged', this.addressBar);
  },

  /**
   * Commits the address bar value (user pressed Enter)
   * @returns {string} The committed URL
   */
  commitAddressBar() {
    const url = this.normalizeUrl(this.addressBar.value);
    this.addressBar.value = url;
    this.addressBar.isEditing = false;

    const tab = this.getActiveTab();
    if (tab) {
      this.updateTab(tab.id, { url });
    }

    this.emit('addressBarCommitted', url);
    this.emit('stateChanged');
    return url;
  },

  /**
   * Cancels address bar editing, reverts to committed URL
   */
  cancelAddressBarEdit() {
    const tab = this.getActiveTab();
    this.addressBar.value = tab ? tab.url : '';
    this.addressBar.isEditing = false;
    this.emit('addressBarChanged', this.addressBar);
  },

  /**
   * Sets address bar focus state
   * @param {boolean} focused
   */
  setAddressBarFocus(focused) {
    this.addressBar.isFocused = focused;
    if (!focused && this.addressBar.isEditing) {
      // Optionally cancel edit on blur
      // this.cancelAddressBarEdit();
    }
    this.emit('addressBarFocusChanged', focused);
  },

  /**
   * Normalizes a URL string
   * @param {string} input
   * @returns {string}
   */
  normalizeUrl(input) {
    const trimmed = input.trim();
    if (!trimmed) return '';
    
    // If it looks like a URL, ensure it has a protocol
    if (trimmed.includes('.') && !trimmed.includes(' ')) {
      if (!trimmed.match(/^https?:\/\//i)) {
        return 'https://' + trimmed;
      }
      return trimmed;
    }
    
    // Otherwise treat as search query (placeholder)
    return trimmed;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Sets loading state for a tab
   * @param {string} tabId
   * @param {boolean} isLoading
   */
  setTabLoading(tabId, isLoading) {
    const tab = this.getTab(tabId);
    if (!tab) return;

    tab.isLoading = isLoading;

    // Update UI loading indicator if this is the active tab
    if (tabId === this.activeTabId) {
      this.ui.isLoading = isLoading;
      this.ui.loadingTabId = isLoading ? tabId : null;
    }

    this.emit('loadingStateChanged', { tabId, isLoading });
    this.emit('stateChanged');
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENT SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════

  _listeners: {},

  /**
   * Subscribe to state events
   * @param {string} event
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
    
    return () => {
      this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    };
  },

  /**
   * Emit an event
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(cb => cb(data));
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize with default state
   */
  init() {
    // Clear existing state
    this.tabs = [];
    this.activeTabId = null;
    this.addressBar = { value: '', isFocused: false, isEditing: false };
    this.navigation = { canGoBack: false, canGoForward: false };
    this.ui = { isLoading: false, loadingTabId: null };
    this.chat = { inputValue: '', activeConversationId: null };
    
    // Register default widgets
    this.registerDefaultWidgets();
    
    // Load persisted data
    this.loadTabs();
    this.loadConversations();
    this.loadNtpData();

    this.emit('initialized');
    return this;
  },

  /**
   * Register default widgets
   */
  registerDefaultWidgets() {
    // Notes widget
    this.registerWidget({
      id: 'notes',
      title: 'Notes',
      favicon: 'notion', // Using Notion icon as notes icon
      render: (container) => {
        const textarea = document.createElement('textarea');
        textarea.className = 'widget-notes-textarea';
        textarea.placeholder = 'Write your notes here...';
        textarea.value = localStorage.getItem('widget_notes_content') || '';
        textarea.addEventListener('input', (e) => {
          localStorage.setItem('widget_notes_content', e.target.value);
        });
        container.appendChild(textarea);
      }
    });

    // Weather widget (stub)
    this.registerWidget({
      id: 'weather',
      title: 'Weather',
      favicon: 'gemini', // Using generic icon as weather placeholder
      render: (container) => {
        const weatherContent = document.createElement('div');
        weatherContent.className = 'widget-weather-content';
        weatherContent.innerHTML = `
          <div class="weather-temp">72°F</div>
          <div class="weather-condition">Sunny</div>
          <div class="weather-location">San Francisco, CA</div>
        `;
        container.appendChild(weatherContent);
      }
    });

    // Clock widget
    this.registerWidget({
      id: 'clock',
      title: 'Clock',
      favicon: 'perplexity', // Using generic icon for clock
      render: (container) => {
        const clockContent = document.createElement('div');
        clockContent.className = 'widget-clock-content';
        
        const updateTime = () => {
          const now = new Date();
          const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          clockContent.innerHTML = `
            <div class="clock-time">${timeStr}</div>
            <div class="clock-date">${dateStr}</div>
          `;
        };
        
        updateTime();
        const intervalId = setInterval(updateTime, 1000);
        
        // Store interval ID for cleanup
        container.dataset.clockInterval = intervalId;
        
        // Cleanup when widget is removed
        const observer = new MutationObserver((mutations) => {
          if (!document.body.contains(container)) {
            clearInterval(intervalId);
            observer.disconnect();
          }
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
    });

    // Quick Links widget
    this.registerWidget({
      id: 'quicklinks',
      title: 'Quick Links',
      favicon: 'google', 
      render: (container) => {
        const linksContent = document.createElement('div');
        linksContent.className = 'widget-quicklinks-content';
        
        const defaultLinks = [
          { name: 'Google', url: 'https://google.com' },
          { name: 'GitHub', url: 'https://github.com' },
          { name: 'YouTube', url: 'https://youtube.com' },
          { name: 'Reddit', url: 'https://reddit.com' }
        ];
        
        const links = JSON.parse(localStorage.getItem('widget_quicklinks') || 'null') || defaultLinks;
        
        links.forEach(link => {
          const a = document.createElement('a');
          a.href = '#';
          a.className = 'quicklink-item';
          a.textContent = link.name;
          a.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.UIBindings) {
              window.UIBindings.navigateToUrl(link.url);
            }
          });
          linksContent.appendChild(a);
        });
        
        container.appendChild(linksContent);
      }
    });

    console.log('[State] Registered default widgets:', Object.keys(this._widgetRegistry));
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NTP (NEW TAB PAGE) OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get NTP data for rendering
   * @returns {Object} NTP view model
   */
  getNtpData() {
    return {
      favorites: this.ntp.favorites,
      recentChats: this.getRecentChats(4),
      widgets: this.getEnabledWidgets()
    };
  },

  /**
   * Get recent chats for NTP display
   * @param {number} limit
   * @returns {Array}
   */
  getRecentChats(limit = 4) {
    return this.conversations
      .slice()
      .filter(c => c.messages && c.messages.length > 0)
      .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
      .slice(0, limit)
      .map(c => ({
        id: c.id,
        title: c.title || 'New conversation',
        description: this.getConversationPreview(c),
        messageCount: c.messages.length,
        lastUpdated: c.lastUpdated || c.createdAt,
        pageContext: c.pageContext,
        favicon: 'chat' // Default favicon for chats
      }));
  },

  /**
   * Get a preview of conversation content
   * @param {Object} conversation
   * @returns {string}
   */
  getConversationPreview(conversation) {
    if (!conversation.messages || conversation.messages.length === 0) return 'No messages yet';
    // Get last assistant message for better preview
    const lastAssistantMsg = [...conversation.messages]
      .reverse()
      .find(m => m.role === 'assistant');
    const lastMessage = lastAssistantMsg || conversation.messages[conversation.messages.length - 1];
    if (!lastMessage) return '';
    const content = lastMessage.content || '';
    return content.slice(0, 100) + (content.length > 100 ? '...' : '');
  },

  /**
   * Add a favorite to NTP
   * @param {Object} favorite - { title, url, favicon }
   */
  addFavorite(favorite) {
    const fav = {
      id: this.generateId(),
      title: favorite.title || 'Untitled',
      url: favorite.url || '',
      favicon: favorite.favicon || null
    };
    this.ntp.favorites.push(fav);
    this.saveNtpData();
    this.emit('ntpUpdated', this.getNtpData());
    return fav;
  },

  /**
   * Update an existing favorite
   * @param {string} favoriteId
   * @param {Object} updates - { title, url, favicon }
   */
  updateFavorite(favoriteId, updates) {
    const fav = this.ntp.favorites.find(f => f.id === favoriteId);
    if (!fav) return;

    if (updates.title !== undefined) fav.title = updates.title;
    if (updates.url !== undefined) fav.url = updates.url;
    if (updates.favicon !== undefined) fav.favicon = updates.favicon;

    this.saveNtpData();
    this.emit('ntpUpdated', this.getNtpData());
  },

  /**
   * Remove a favorite from NTP
   * @param {string} favoriteId
   */
  removeFavorite(favoriteId) {
    const index = this.ntp.favorites.findIndex(f => f.id === favoriteId);
    if (index !== -1) {
      this.ntp.favorites.splice(index, 1);
      this.saveNtpData();
      this.emit('ntpUpdated', this.getNtpData());
    }
  },

  /**
   * Reorder a favorite
   * @param {string} draggedId - ID of favorite being dragged
   * @param {string} targetId - ID of favorite to drop before
   */
  reorderFavorite(draggedId, targetId) {
    const draggedIndex = this.ntp.favorites.findIndex(f => f.id === draggedId);
    const targetIndex = this.ntp.favorites.findIndex(f => f.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [removed] = this.ntp.favorites.splice(draggedIndex, 1);
    const newTargetIndex = this.ntp.favorites.findIndex(f => f.id === targetId);
    this.ntp.favorites.splice(newTargetIndex, 0, removed);

    this.saveNtpData();
    this.emit('ntpUpdated', this.getNtpData());
  },

  /**
   * Save NTP data to localStorage
   */
  saveNtpData() {
    try {
      localStorage.setItem('browser_ntp', JSON.stringify({
        favorites: this.ntp.favorites,
        enabledWidgets: this.ntp.enabledWidgets
      }));
    } catch (e) {
      console.error('[State] Failed to save NTP data:', e);
    }
  },

  /**
   * Load NTP data from localStorage
   */
  loadNtpData() {
    try {
      const data = localStorage.getItem('browser_ntp');
      if (data) {
        const parsed = JSON.parse(data);
        this.ntp.favorites = parsed.favorites || [];
        this.ntp.enabledWidgets = parsed.enabledWidgets || ['notes', 'weather'];
        console.log('[State] Loaded NTP data with', this.ntp.favorites.length, 'favorites,', this.ntp.enabledWidgets.length, 'widgets');
      } else {
        // Initialize with default favorites
        this.ntp.favorites = this.getDefaultFavorites();
        this.ntp.enabledWidgets = ['notes', 'weather'];
        this.saveNtpData();
      }
    } catch (e) {
      console.error('[State] Failed to load NTP data:', e);
      this.ntp.favorites = this.getDefaultFavorites();
      this.ntp.enabledWidgets = ['notes', 'weather'];
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TAB PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save tabs to localStorage
   */
  saveTabs() {
    try {
      const tabData = {
        activeTabId: this.activeTabId,
        tabs: this.tabs.map(tab => ({
          id: tab.id,
          title: tab.title,
          url: tab.url,
          favicon: tab.favicon
        }))
      };
      localStorage.setItem('browser_tabs', JSON.stringify(tabData));
    } catch (e) {
      console.error('[State] Failed to save tabs:', e);
    }
  },

  /**
   * Load tabs from localStorage
   */
  loadTabs() {
    try {
      const data = localStorage.getItem('browser_tabs');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.tabs && parsed.tabs.length > 0) {
          // Restore tabs with full structure
          this.tabs = parsed.tabs.map(tab => this.createTab({
            id: tab.id,
            title: tab.title,
            url: tab.url,
            favicon: tab.favicon
          }));
          this.activeTabId = parsed.activeTabId || this.tabs[0]?.id || null;
          console.log('[State] Loaded', this.tabs.length, 'tabs, active:', this.activeTabId);
        }
      }
    } catch (e) {
      console.error('[State] Failed to load tabs:', e);
      this.tabs = [];
      this.activeTabId = null;
    }
  },

  /**
   * Get default favorites for new users
   * @returns {Array}
   */
  getDefaultFavorites() {
    return [
      { id: this.generateId(), title: 'Google', url: 'https://google.com', favicon: 'google' },
      { id: this.generateId(), title: 'GitHub', url: 'https://github.com', favicon: 'github' },
      { id: this.generateId(), title: 'YouTube', url: 'https://youtube.com', favicon: 'youtube' },
      { id: this.generateId(), title: 'Twitter', url: 'https://twitter.com', favicon: 'twitter' },
      { id: this.generateId(), title: 'Reddit', url: 'https://reddit.com', favicon: 'reddit' },
      { id: this.generateId(), title: 'Wikipedia', url: 'https://wikipedia.org', favicon: 'wikipedia' },
      { id: this.generateId(), title: 'Amazon', url: 'https://amazon.com', favicon: 'amazon' },
      { id: this.generateId(), title: 'Netflix', url: 'https://netflix.com', favicon: 'netflix' },
      { id: this.generateId(), title: 'LinkedIn', url: 'https://linkedin.com', favicon: 'linkedin' },
      { id: this.generateId(), title: 'Spotify', url: 'https://spotify.com', favicon: 'spotify' },
      { id: this.generateId(), title: 'Facebook', url: 'https://facebook.com', favicon: 'facebook' },
      { id: this.generateId(), title: 'Instagram', url: 'https://instagram.com', favicon: 'instagram' }
    ];
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHAT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set chat input value
   * @param {string} value
   */
  setChatInput(value) {
    this.chat.inputValue = value;
    this.emit('chatInputChanged', value);
  },

  /**
   * Submit chat input and trigger AI invocation
   * @param {Object|null} pageContext - Optional page context from UIBindings.extractPageContext()
   */
  submitChat(pageContext = null) {
    const value = this.chat.inputValue.trim();
    if (!value) return;

    console.log('[State] Chat submitted:', value);

    // Determine originating context based on page
    const activeTab = this.getActiveTab();
    const hasPage = activeTab && activeTab.url && activeTab.url.startsWith('http');
    const originatingContext = hasPage ? 'page' : 'global';

    // Get or create active conversation
    let conversation = this.getActiveConversation();
    if (!conversation) {
      conversation = this.addConversation({
        originatingContext,
        pageUrl: hasPage ? activeTab.url : null
      });
      console.log('[State] Created new conversation:', conversation.id, 'context:', originatingContext);
    }

    // Add user message to conversation
    const userMessage = this.addMessage(conversation.id, {
      role: 'user',
      content: value
    });
    console.log('[State] Added user message:', userMessage.id);

    // Get tab context (titles and URLs of all open tabs)
    const tabContext = this.getTabContext();

    // Build AI invocation payload with page and tab context
    const invocationPayload = {
      conversationId: conversation.id,
      prompt: value,
      timestamp: Date.now(),
      pageContext: pageContext || null,
      tabContext: tabContext
    };

    // Log context status
    console.log('[State] Tab context:', tabContext.tabs.length, 'tabs, active:', tabContext.activeTabId);
    if (pageContext) {
      if (pageContext.restricted) {
        console.log('[State] Page context: restricted (cross-origin)', pageContext.url);
      } else if (pageContext.content) {
        console.log('[State] Page context: available,', pageContext.content.length, 'chars');
      } else {
        console.log('[State] Page context: no content available');
      }
    } else {
      console.log('[State] Page context: none (new tab page)');
    }

    // Emit AI invocation event with context
    this.emit('aiInvocation', invocationPayload);

    // Call AI service for real response
    this.invokeAI(conversation.id, pageContext, tabContext);

    // Clear input after submit
    this.chat.inputValue = '';
    this.emit('chatInputChanged', '');
  },

  /**
   * Invoke the AI service with streaming response
   * @param {string} conversationId
   * @param {Object} pageContext
   * @param {Object} tabContext
   */
  async invokeAI(conversationId, pageContext, tabContext) {
    const conversation = this.getConversation(conversationId);
    if (!conversation) return;

    // Check if AI service is configured
    if (typeof AIService === 'undefined' || !AIService.isConfigured()) {
      // Add error message if no API key
      this.addMessage(conversationId, {
        role: 'assistant',
        content: '⚠️ AI is not configured. Please set your API key in settings to enable AI responses.\n\nGo to Settings → AI → Enter your OpenAI or Anthropic API key.'
      });
      return;
    }

    // Set loading state
    this.chat.isLoading = true;
    this.emit('chatLoadingChanged', true);

    // Create placeholder message for streaming
    const assistantMessage = this.addMessage(conversationId, {
      role: 'assistant',
      content: '',
      isStreaming: true
    });

    try {
      // Build messages from conversation history
      const messages = AIService.buildMessages(
        conversation.messages.slice(0, -1), // Exclude the empty placeholder
        pageContext,
        tabContext
      );

      // Stream the response
      await AIService.chatStream(
        messages,
        // onChunk
        (chunk, fullContent) => {
          this.updateMessage(conversationId, assistantMessage.id, {
            content: fullContent,
            isStreaming: true
          });
        },
        // onComplete
        (fullContent) => {
          this.updateMessage(conversationId, assistantMessage.id, {
            content: fullContent,
            isStreaming: false
          });
          this.chat.isLoading = false;
          this.emit('chatLoadingChanged', false);
          console.log('[State] AI response complete:', fullContent.length, 'chars');
        },
        // onError
        (error) => {
          console.error('[State] AI error:', error);
          this.updateMessage(conversationId, assistantMessage.id, {
            content: `❌ Error: ${error.message}`,
            isStreaming: false,
            isError: true
          });
          this.chat.isLoading = false;
          this.emit('chatLoadingChanged', false);
        }
      );
    } catch (error) {
      console.error('[State] AI invocation error:', error);
      this.updateMessage(conversationId, assistantMessage.id, {
        content: `❌ Error: ${error.message}`,
        isStreaming: false,
        isError: true
      });
      this.chat.isLoading = false;
      this.emit('chatLoadingChanged', false);
    }
  },

  /**
   * Update an existing message
   * @param {string} conversationId
   * @param {string} messageId
   * @param {Object} updates
   */
  updateMessage(conversationId, messageId, updates) {
    const conversation = this.getConversation(conversationId);
    if (!conversation) return;

    const message = conversation.messages.find(m => m.id === messageId);
    if (!message) return;

    Object.assign(message, updates);
    conversation.lastUpdated = Date.now();

    this.saveConversations();
    this.emit('messageUpdated', { conversationId, messageId, message });
    this.emit('conversationUpdated', conversation);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERSATION OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new conversation
   * @param {Object} options
   * @returns {Object} The created conversation
   */
  addConversation(options = {}) {
    const conversation = this.createConversation(options);
    this.conversations.push(conversation);
    this.chat.activeConversationId = conversation.id;
    this.saveConversations();
    this.emit('conversationAdded', conversation);
    this.emit('activeConversationChanged', conversation);
    return conversation;
  },

  /**
   * Get a conversation by ID
   * @param {string} conversationId
   * @returns {Object|undefined}
   */
  getConversation(conversationId) {
    return this.conversations.find(c => c.id === conversationId);
  },

  /**
   * Get the active conversation
   * @returns {Object|undefined}
   */
  getActiveConversation() {
    return this.getConversation(this.chat.activeConversationId);
  },

  /**
   * Set the active conversation
   * @param {string} conversationId
   */
  setActiveConversation(conversationId) {
    const conversation = this.getConversation(conversationId);
    if (!conversation) return;
    
    this.chat.activeConversationId = conversationId;
    this.emit('activeConversationChanged', conversation);
  },

  /**
   * Add a message to a conversation
   * @param {string} conversationId
   * @param {Object} messageOptions
   * @returns {Object} The created message
   */
  addMessage(conversationId, messageOptions = {}) {
    const conversation = this.getConversation(conversationId);
    if (!conversation) return null;

    const message = this.createMessage(messageOptions);
    conversation.messages.push(message);
    conversation.lastUpdated = Date.now();
    
    // Auto-generate title from first user message if still default
    if (conversation.title === 'New conversation' && message.role === 'user') {
      conversation.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
    }

    this.saveConversations();
    this.emit('messageAdded', { conversationId, message });
    this.emit('conversationUpdated', conversation);
    return message;
  },

  /**
   * Update a conversation's properties
   * @param {string} conversationId
   * @param {Object} updates
   */
  updateConversation(conversationId, updates) {
    const conversation = this.getConversation(conversationId);
    if (!conversation) return;

    Object.assign(conversation, updates, { lastUpdated: Date.now() });
    this.saveConversations();
    this.emit('conversationUpdated', conversation);
  },

  /**
   * Delete a conversation
   * @param {string} conversationId
   */
  deleteConversation(conversationId) {
    const index = this.conversations.findIndex(c => c.id === conversationId);
    if (index === -1) return;

    const conversation = this.conversations[index];
    this.conversations.splice(index, 1);

    // If deleted conversation was active, clear active
    if (this.chat.activeConversationId === conversationId) {
      this.chat.activeConversationId = null;
      this.emit('activeConversationChanged', null);
    }

    this.saveConversations();
    this.emit('conversationDeleted', conversation);
    this.emit('ntpUpdated', this.getNtpData());
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERSATION PERSISTENCE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save conversations to localStorage
   */
  saveConversations() {
    try {
      localStorage.setItem('browser_conversations', JSON.stringify(this.conversations));
    } catch (e) {
      console.error('[State] Failed to save conversations:', e);
    }
  },

  /**
   * Load conversations from localStorage
   */
  loadConversations() {
    try {
      const data = localStorage.getItem('browser_conversations');
      if (data) {
        this.conversations = JSON.parse(data);
        console.log('[State] Loaded', this.conversations.length, 'conversations');
      } else {
        this.conversations = [];
      }
    } catch (e) {
      console.error('[State] Failed to load conversations:', e);
      this.conversations = [];
    }
  },

  /**
   * Get a serializable snapshot of the state
   * @returns {Object}
   */
  getSnapshot() {
    return {
      tabs: this.tabs.map(t => ({ ...t })),
      activeTabId: this.activeTabId,
      addressBar: { ...this.addressBar },
      navigation: { ...this.navigation },
      ui: { ...this.ui },
      chat: { ...this.chat },
      conversations: this.conversations.map(c => ({ ...c, messages: [...c.messages] }))
    };
  }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BrowserState;
}
