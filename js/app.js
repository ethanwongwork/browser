/**
 * Browser App Initialization
 */

(function() {
  'use strict';

  /**
   * Initialize the browser application
   */
  function initBrowser() {
    try {
      console.log('[Browser] Starting initialization...');
      
      // Initialize state (loads persisted data including tabs)
      BrowserState.init();
      console.log('[Browser] State initialized');

      // Initialize UI bindings
      UIBindings.init();
      console.log('[Browser] UI bindings initialized');

      // Only create default tabs if no tabs were loaded from persistence
      if (BrowserState.tabs.length === 0) {
        console.log('[Browser] No persisted tabs, creating defaults...');
        
        // Create initial tabs matching the existing UI (8 sidebar tabs)
        // First tab has a URL to demonstrate webview
        BrowserState.addTab({
          title: 'Example',
          url: 'https://example.com',
          favicon: 'wikipedia'
        });

        // Remaining tabs are new tabs
        for (let i = 1; i < 8; i++) {
          BrowserState.addTab({
            title: 'New tab',
            url: '',
            favicon: 'wikipedia'
          });
        }
      } else {
        console.log('[Browser] Restored', BrowserState.tabs.length, 'tabs from persistence');
        
        // Trigger active tab render for restored tabs
        if (BrowserState.activeTabId) {
          const activeTab = BrowserState.getActiveTab();
          if (activeTab) {
            BrowserState.emit('activeTabChanged', activeTab);
          }
        }
      }

      // Ensure we have an active tab
      if (BrowserState.tabs.length > 0 && !BrowserState.activeTabId) {
        BrowserState.setActiveTab(BrowserState.tabs[0].id);
      }

      // Log state for debugging
      console.log('[Browser] Initialized with state:', BrowserState.getSnapshot());

      // Expose for debugging
      window.BrowserState = BrowserState;
      window.UIBindings = UIBindings;
    } catch (error) {
      console.error('[Browser] Initialization failed:', error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrowser);
  } else {
    initBrowser();
  }
})();
