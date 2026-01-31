/**
 * Browser App
 * Main entry point - initializes state and UI
 */

(function() {
  'use strict';

  /**
   * Initialize the browser application
   */
  function initBrowser() {
    console.log('[App] Initializing browser...');

    // Initialize AI service
    if (typeof AIService !== 'undefined') {
      AIService.init();
    }

    // Initialize state
    BrowserState.init();

    // Initialize UI bindings
    UIBindings.init();

    // Create initial tab if none exist
    if (BrowserState.tabs.length === 0) {
      BrowserState.addTab({ title: 'New tab' });
    }

    // Initial render
    UIBindings.render();

    // Add keyboard shortcuts
    initKeyboardShortcuts();

    console.log('[App] Browser initialized with', BrowserState.tabs.length, 'tab(s)');
  }

  /**
   * Initialize keyboard shortcuts
   */
  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + T = New Tab
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        BrowserState.addTab();
        console.log('[App] New tab created via shortcut');
      }

      // Cmd/Ctrl + W = Close Tab
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        const activeTab = BrowserState.getActiveTab();
        if (activeTab && BrowserState.tabs.length > 1) {
          BrowserState.removeTab(activeTab.id);
          console.log('[App] Tab closed via shortcut');
        }
      }

      // Cmd/Ctrl + L = Focus Address Bar
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        UIBindings.elements.addressInput?.focus();
        UIBindings.elements.addressInput?.select();
        console.log('[App] Address bar focused via shortcut');
      }

      // Cmd/Ctrl + [ = Back
      if ((e.metaKey || e.ctrlKey) && e.key === '[') {
        e.preventDefault();
        UIBindings.navigateBack();
      }

      // Cmd/Ctrl + ] = Forward
      if ((e.metaKey || e.ctrlKey) && e.key === ']') {
        e.preventDefault();
        UIBindings.navigateForward();
      }

      // Cmd/Ctrl + 1-9 = Switch to tab
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (BrowserState.tabs[index]) {
          BrowserState.setActiveTab(BrowserState.tabs[index].id);
          console.log('[App] Switched to tab', index + 1);
        }
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBrowser);
  } else {
    initBrowser();
  }

})();
