/**
 * blocks-service.js — Renderer-side NTP content blocks display
 * Communicates with main process via blocksAPI IPC bridge.
 * NEVER makes direct API calls. 
 */

const BlocksService = {
  // ═══════════════════════════════════════════════════════════════════════════
  // TEXT PARSING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Parse NTP markup syntax into HTML
   * Handles: {{source}}, [[links]]
   */
  parseNtpText(text, faviconUrl) {
    // 1. Source references: {{domain|Name}} → favicon + linked name
    text = text.replace(
      /\{\{(.+?)\|(.+?)\}\}/g,
      (_, domain, name) => {
        const src = faviconUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
        return `<a class="ntp-link ntp-source" data-search="${name}">` +
          `<img class="ntp-source-favicon" src="${src}" alt="" width="16" height="16">` +
          `<strong>${name}</strong></a>`;
      }
    );
    // 2a. Search links with pipe: [[query|text]] → underline link
    text = text.replace(
      /\[\[(.+?)\|(.+?)\]\]/g,
      '<a class="ntp-link" data-search="$1">$2</a>'
    );
    // 2b. Search links without pipe: [[text]] → underline link (text used as both query and display)
    text = text.replace(
      /\[\[(.+?)\]\]/g,
      '<a class="ntp-link" data-search="$1">$1</a>'
    );
    // 3. Bold: **text** → <strong>
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // 4. Italic: *text* → <em>
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return text;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Build HTML for a single text block
   */
  buildBlockHTML(block, index) {
    const parsed = this.parseNtpText(block.text, block.source?.favicon);
    const num = `<span class="ntp-block-num">(${index + 1})&nbsp;</span>`;
    return `<span class="ntp-block" data-block-id="${block.id}" data-url="${block.source.url}">${num}${parsed}</span> `;
  },

  /**
   * Build skeleton loading HTML
   */
  buildSkeletonHTML() {
    return `<div class="ntp-block skeleton-card">
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div class="skeleton-pulse" style="width:100%;height:20px;border-radius:4px;"></div>
        <div class="skeleton-pulse" style="width:90%;height:20px;border-radius:4px;"></div>
        <div class="skeleton-pulse" style="width:60%;height:20px;border-radius:4px;"></div>
      </div>
    </div>`;
  },

  /**
   * Show skeleton loading in the blocks container
   */
  showSkeletons(ntpId = '') {
    const suffix = ntpId ? `-${ntpId}` : '';
    const ntp = document.getElementById(`new-tab-page${suffix}`);
    if (!ntp) return;

    const grid = ntp.querySelector('.ntp-blocks');
    if (grid) {
      grid.innerHTML = Array(4).fill(this.buildSkeletonHTML()).join('');
    }
  },

  /**
   * Render text blocks into the DOM
   */
  renderBlocks(blocks, ntpId = '') {
    const suffix = ntpId ? `-${ntpId}` : '';
    const ntp = document.getElementById(`new-tab-page${suffix}`);
    if (!ntp) return;

    const grid = ntp.querySelector('.ntp-blocks');
    if (!grid) return;

    // Remove any dynamically-added rows from previous renders
    ntp.querySelectorAll('.cards-row').forEach(el => el.remove());

    grid.innerHTML = blocks.map((b, i) => this.buildBlockHTML(b, i)).join('');

    // Bind click handlers
    this.bindBlockClicks(ntp);

    // Typewriter animation on first load, otherwise fade in
    if (typeof UIBindings !== 'undefined' && UIBindings._ntpFirstLoad) {
      UIBindings.typewriteBlocks(ntp);
    } else {
      this.animateBlocksIn(ntp);
    }
  },

  /**
   * Animate blocks in with staggered fade
   */
  animateBlocksIn(ntp) {
    const grid = ntp.querySelector('.ntp-blocks');
    if (!grid) return;
    grid.style.opacity = '0';
    setTimeout(() => {
      if (typeof Motion !== 'undefined') {
        Motion.animate(grid, { opacity: [0, 1] }, { duration: 0.3, easing: [0.22, 1, 0.36, 1] });
      } else {
        grid.style.opacity = '1';
      }
    }, 60);
  },

  /**
   * Bind click handlers on text blocks and NTP links
   */
  bindBlockClicks(ntp) {
    // Delegate clicks on .ntp-link elements within the NTP
    ntp.querySelectorAll('.ntp-link').forEach(link => {
      if (link.dataset.bound) return;
      link.dataset.bound = 'true';

      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const query = link.dataset.search;
        if (!query) return;

        // Build search URL using user's preferred engine
        const searchUrl = this.getSearchUrl(query);
        
        // Navigate using BrowserState
        if (typeof BrowserState !== 'undefined') {
          const activeTab = BrowserState.getActiveTab();
          if (activeTab) {
            BrowserState.navigateTo(activeTab.id, searchUrl);
          }
        }
      });
    });

    // Also handle clicks on the block itself (navigate to source URL)
    ntp.querySelectorAll('.ntp-block[data-url]').forEach(block => {
      if (block.dataset.bound) return;
      block.dataset.bound = 'true';

      block.addEventListener('click', (e) => {
        // Don't navigate if they clicked a link inside
        if (e.target.closest('.ntp-link')) return;
        
        const url = block.dataset.url;
        if (!url) return;

        if (typeof BrowserState !== 'undefined') {
          const activeTab = BrowserState.getActiveTab();
          if (activeTab) {
            BrowserState.navigateTo(activeTab.id, url);
          }
        }
      });
    });
  },

  /**
   * Get search URL for the selected search engine
   */
  getSearchUrl(query) {
    const engine = localStorage.getItem('search_engine') || 'google';
    const encodedQuery = encodeURIComponent(query);
    const urls = {
      'google': `https://www.google.com/search?q=${encodedQuery}`,
      'duckduckgo': `https://duckduckgo.com/?q=${encodedQuery}`,
      'bing': `https://www.bing.com/search?q=${encodedQuery}`,
      'yahoo': `https://search.yahoo.com/search?p=${encodedQuery}`
    };
    return urls[engine] || urls['google'];
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  _ntpLinkDelegationSetup: false,
  _configSynced: false,

  /**
   * Set up delegated click handler for .ntp-link elements in all NTP sections
   * Covers both greeting links and text block links
   */
  setupNtpLinkDelegation() {
    if (this._ntpLinkDelegationSetup) return;
    this._ntpLinkDelegationSetup = true;

    document.addEventListener('click', (e) => {
      const link = e.target.closest('.ntp-link');
      if (!link) return;
      // Only handle if inside an NTP section
      if (!link.closest('.ntp-sections') && !link.closest('.ntp-intro')) return;

      e.preventDefault();
      e.stopPropagation();
      const query = link.dataset.search;
      if (!query) return;

      const searchUrl = this.getSearchUrl(query);
      if (typeof BrowserState !== 'undefined') {
        const activeTab = BrowserState.getActiveTab();
        if (activeTab) {
          BrowserState.navigateTo(activeTab.id, searchUrl);
        }
      }
    });
  },

  /**
   * Send AI config to main process (only once unless forced)
   */
  async syncConfig(force = false) {
    if (this._configSynced && !force) return;
    if (!window.blocksAPI) return;

    const provider = localStorage.getItem('ai_provider') || 'openai';
    const apiKey = localStorage.getItem(`ai_api_key_${provider}`) || '';
    const model = localStorage.getItem('ai_model') || 'gpt-4o';
    const location = localStorage.getItem('user_location') || '';
    
    // Get enabled categories
    const savedCats = localStorage.getItem('card_categories');
    const categories = savedCats
      ? JSON.parse(savedCats)
      : ['tech','news','sports','music','entertainment','finance','style','food','science','design'];

    await window.blocksAPI.setAIConfig({ provider, apiKey, model, categories, location });
    this._configSynced = true;
  },

  /**
   * Initialize blocks on a new tab page
   */
  async init(ntpId = '') {
    console.log('[BlocksService] Initializing...');

    // Set up delegated click handler for all .ntp-link elements within NTP
    this.setupNtpLinkDelegation();

    // Bind refresh button
    this.bindRefreshButton(ntpId);

    // Show skeletons immediately
    this.showSkeletons(ntpId);

    // Sync AI config to main process
    await this.syncConfig();

    // Try to get blocks from pool
    if (window.blocksAPI) {
      try {
        const blocks = await window.blocksAPI.getBlocks(0);
        if (blocks && blocks.length > 0) {
          this.renderBlocks(blocks, ntpId);
          return;
        }
      } catch (err) {
        console.warn('[BlocksService] getBlocks failed:', err);
      }

      // Pool might not be ready yet — listen for blocks:ready
      window.blocksAPI.onBlocksReady(async () => {
        console.log('[BlocksService] Pool ready, fetching blocks...');
        try {
          const blocks = await window.blocksAPI.getBlocks(0);
          if (blocks && blocks.length > 0) {
            this.renderBlocks(blocks, ntpId);
          }
        } catch (err) {
          console.warn('[BlocksService] getBlocks after ready failed:', err);
        }
      });

      window.blocksAPI.onBlocksError((msg) => {
        console.warn('[BlocksService] Blocks error:', msg);
        // Fall back to the old ContentCards system if blocks fail
        this.fallbackToContentCards(ntpId);
      });
    } else {
      // No blocksAPI available — fall back to ContentCards
      this.fallbackToContentCards(ntpId);
    }
  },

  /**
   * Fall back to the old ContentCards system
   */
  fallbackToContentCards(ntpId = '') {
    if (typeof ContentCards !== 'undefined') {
      console.log('[BlocksService] Falling back to ContentCards');
      ContentCards.init(ntpId);
    }
  },

  /**
   * Bind refresh button to pull new blocks from the pool
   */
  bindRefreshButton(ntpId = '') {
    const suffix = ntpId ? `-${ntpId}` : '';
    const ntp = document.getElementById(`new-tab-page${suffix}`);
    if (!ntp) return;

    ntp.querySelectorAll('.more-stories-btn').forEach(btn => {
      btn.onclick = () => this.refresh(ntpId);
    });
  },

  /**
   * Refresh blocks — request new batch and re-render
   */
  async refresh(ntpId = '') {
    this.showSkeletons(ntpId);
    await this.syncConfig();

    if (window.blocksAPI) {
      // First try getting unused blocks from existing pool
      try {
        const blocks = await window.blocksAPI.getBlocks(0);
        if (blocks && blocks.length > 0) {
          this.renderBlocks(blocks, ntpId);
          return;
        }
      } catch (err) {
        console.warn('[BlocksService] refresh getBlocks failed:', err);
      }

      // Pool exhausted — request a full refresh
      try {
        await window.blocksAPI.refreshPool();
        // Wait for blocks:ready event
      } catch (err) {
        console.warn('[BlocksService] refreshPool failed:', err);
        this.fallbackToContentCards(ntpId);
      }
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BlocksService;
}
