/**
 * Content Cards — AI-powered card generation for new tab page
 * Generates Feed (2×2 grid) and Start Here (horizontal row) cards
 */

const ContentCards = {
  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  CACHE_KEY: 'content_cards_cache',
  CACHE_MAX_AGE: 15 * 60 * 1000, // 15 minutes

  // Track topics already shown to avoid duplicates when loading more
  shownTopics: [],

  // ═══════════════════════════════════════════════════════════════════════════
  // AI PROMPT
  // ═══════════════════════════════════════════════════════════════════════════

  buildPrompt(existingTopics = []) {
    const avoidClause = existingTopics.length
      ? `\n\nDo NOT repeat these topics: ${existingTopics.join(', ')}`
      : '';

    // Get user interests to personalize content
    const interests = JSON.parse(localStorage.getItem('user_interests') || '[]');
    const interestClause = interests.length
      ? `\n\nThe user is especially interested in: ${interests.join(', ')}. Prioritize these categories when generating cards.`
      : '';

    return `Generate content cards for a browser new tab page. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

CATEGORIES (use exactly these): tech, news, sports, music, entertainment, finance, style, food, science, design

FEED (4 cards):
Informational. News, scores, data, announcements, culture.
2-3 sentences each. Use **bold** for key names, numbers, scores, prices.
Conversational but specific — include real data points.
Mix: at least 3 different categories.
DO NOT start the text with "According to" or the source name — the UI prepends "According to [Source]," automatically.

For each card return JSON with these exact fields:
{
  "section": "feed",
  "source_name": "Name of the source (e.g. ESPN, Nike, Netflix)",
  "source_url": "Full URL to the source website",
  "text": "Card text with **bold** markdown for key details",
  "category": "one of: tech, news, sports, music, entertainment, finance, style, food, science, design"
}

SOURCES TO USE:
TECH: The Verge (theverge.com), TechCrunch (techcrunch.com), Wired (wired.com), Product Hunt (producthunt.com), GitHub (github.com), Hacker News (news.ycombinator.com)
NEWS: AP News (apnews.com), Reuters (reuters.com), BBC (bbc.com)
SPORTS: ESPN (espn.com), Bleacher Report (bleacherreport.com), The Athletic (theathletic.com)
MUSIC: Spotify (open.spotify.com), Pitchfork (pitchfork.com), Apple Music (music.apple.com)
ENTERTAINMENT: YouTube (youtube.com), Netflix (netflix.com), Apple TV+ (tv.apple.com), IGN (ign.com), Polygon (polygon.com), Steam (store.steampowered.com), Spotify Podcasts (open.spotify.com), Apple Podcasts (podcasts.apple.com)
FINANCE: Yahoo Finance (finance.yahoo.com), CNBC (cnbc.com), CoinDesk (coindesk.com)
STYLE: Nike (nike.com), SSENSE (ssense.com), Kith (kith.com), END. (endclothing.com), Stüssy (stussy.com), Aimé Leon Dore (aimeleondore.com), Arc'teryx (arcteryx.com), New Balance (newbalance.com), Fear of God (fearofgod.com), SNKRS (nike.com/launch), ASICS (asics.com)
FOOD: Eater (eater.com), Bon Appétit (bonappetit.com)
SCIENCE: NASA (nasa.gov), Nature (nature.com)
DESIGN: Dribbble (dribbble.com), Figma Community (figma.com/community), Behance (behance.net)
${avoidClause}${interestClause}

Return ONLY a JSON array of 4 feed cards. No markdown fences, no extra text.`;
  },

  buildMoreFeedPrompt(existingTopics) {
    // Get user interests to personalize content
    const interests = JSON.parse(localStorage.getItem('user_interests') || '[]');
    const interestClause = interests.length
      ? `\nThe user is especially interested in: ${interests.join(', ')}. Prioritize these categories.`
      : '';

    return `Generate 4 more FEED cards for a browser new tab page. Today is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

CATEGORIES (use exactly these): tech, news, sports, music, entertainment, finance, style, food, science, design

These are informational cards — news, scores, data, announcements, culture.
2-3 sentences each. Use **bold** for key names, numbers, scores, prices.
Conversational but specific.
Mix: at least 3 different categories.
DO NOT start the text with "According to" or the source name — the UI prepends it automatically.

Do NOT repeat these topics: ${existingTopics.join(', ')}${interestClause}

For each card return JSON:
{
  "section": "feed",
  "source_name": "Source name",
  "source_url": "https://...",
  "text": "Card text with **bold**",
  "category": "one of: tech, news, sports, music, entertainment, finance, style, food, science, design"
}

Return ONLY a JSON array of 4 cards. No markdown fences, no extra text.`;
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE
  // ═══════════════════════════════════════════════════════════════════════════

  getCache() {
    try {
      const raw = localStorage.getItem(this.CACHE_KEY);
      if (!raw) return null;
      const cache = JSON.parse(raw);
      if (Date.now() - cache.timestamp > this.CACHE_MAX_AGE) return null;
      return cache;
    } catch {
      return null;
    }
  },

  setCache(cards) {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify({
        cards,
        timestamp: Date.now()
      }));
    } catch (e) {
      console.warn('[Cards] Cache write failed:', e);
    }
  },

  clearCache() {
    localStorage.removeItem(this.CACHE_KEY);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Convert markdown bold (**text**) to <strong> tags
   */
  renderBold(text) {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  },

  /**
   * Build a single card's HTML (cardless headline format)
   */
  buildCardHTML(card) {
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(card.source.url).hostname}&sz=32`;
    const readClass = card.read ? ' card-read' : '';
    return `<div class="chat-card${readClass}" data-card-id="${card.id}" data-url="${card.source.url}" tabindex="0" role="link" aria-label="${card.source.name}: ${card.text.replace(/\*\*/g, '')}">
      <p class="headline-text">According to <img class="favicon-inline" src="${faviconUrl}" alt="" width="18" height="18"> <strong>${card.source.name}</strong>, ${this.renderBold(card.text)}</p>
    </div>`;
  },

  /**
   * Build skeleton loader headline HTML (cardless)
   */
  buildSkeletonHTML() {
    return `<div class="chat-card skeleton-card">
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div class="skeleton-pulse" style="width:100%;height:20px;border-radius:4px;"></div>
        <div class="skeleton-pulse" style="width:90%;height:20px;border-radius:4px;"></div>
        <div class="skeleton-pulse" style="width:60%;height:20px;border-radius:4px;"></div>
      </div>
    </div>`;
  },

  /**
   * Show skeleton loading state in card containers
   */
  showSkeletons(ntpId = '') {
    const suffix = ntpId ? `-${ntpId}` : '';
    const ntp = document.getElementById(`new-tab-page${suffix}`);
    if (!ntp) return;

    const feedGrid = ntp.querySelector('.ntp-blocks');

    // Show 4 skeleton cards in the grid
    if (feedGrid) feedGrid.innerHTML = Array(4).fill(this.buildSkeletonHTML()).join('');
  },

  /**
   * Render cards into the DOM
   */
  renderCards(cards, ntpId = '') {
    const suffix = ntpId ? `-${ntpId}` : '';
    const ntp = document.getElementById(`new-tab-page${suffix}`);
    if (!ntp) return;

    const feedCards = cards.filter(c => c.section === 'feed');

    const feedGrid = ntp.querySelector('.ntp-blocks');

    // Remove any dynamically-added rows from previous renders
    ntp.querySelectorAll('.cards-row').forEach(el => el.remove());

    // All 4 feed cards go into the single grid (2×2 layout)
    if (feedGrid) feedGrid.innerHTML = feedCards.slice(0, 4).map(c => this.buildCardHTML(c)).join('');

    // Ensure "More stories" button exists for feed
    this.ensureMoreButton(ntp);

    // Bind click handlers
    this.bindCardClicks(ntp);

    // Animate cards in
    this.animateCardsIn(ntp);
  },

  /**
   * Append additional feed cards (for "More stories")
   */
  appendFeedCards(newCards, ntpId = '') {
    const suffix = ntpId ? `-${ntpId}` : '';
    const ntp = document.getElementById(`new-tab-page${suffix}`);
    if (!ntp) return;

    // Find the ntp-sections container
    const feedSection = ntp.querySelector('.ntp-sections');
    if (!feedSection) return;

    // Append additional headline cards individually
    const row = document.createElement('div');
    row.className = 'cards-row';
    row.innerHTML = newCards.map(c => this.buildCardHTML(c)).join('');
    feedSection.insertBefore(row, feedSection.querySelector('.more-stories-btn'));

    // Animate new cards
    row.querySelectorAll('.chat-card').forEach((card, idx) => {
      card.style.opacity = '0';
      setTimeout(() => {
        if (typeof Motion !== 'undefined') {
          Motion.animate(card, { opacity: [0, 1], y: [12, 0] }, { duration: 0.3, easing: [0.22, 1, 0.36, 1] });
        } else {
          card.style.opacity = '1';
        }
      }, idx * 60);
    });

    this.bindCardClicks(ntp);
  },

  /**
   * Bind Refresh buttons to regenerate all cards fresh
   */
  ensureMoreButton(ntp) {
    const ntpId = ntp.id === 'new-tab-page-2' ? '2' : '';
    const buttons = ntp.querySelectorAll('.more-stories-btn');
    buttons.forEach(btn => {
      btn.onclick = () => {
        if (typeof BlocksService !== 'undefined') {
          BlocksService.refresh(ntpId);
        } else {
          this.refresh(ntpId);
        }
      };
    });
  },

  /**
   * Animate cards in with staggered fade
   */
  animateCardsIn(ntp) {
    const allCards = ntp.querySelectorAll('.chat-card:not(.skeleton-card)');
    allCards.forEach((card, idx) => {
      card.style.opacity = '0';
      setTimeout(() => {
        if (typeof Motion !== 'undefined') {
          Motion.animate(card, { opacity: [0, 1], y: [12, 0] }, { duration: 0.35, easing: [0.22, 1, 0.36, 1] });
        } else {
          card.style.opacity = '1';
        }
      }, idx * 50);
    });
  },

  /**
   * Bind click events on cards
   */
  bindCardClicks(ntp) {
    ntp.querySelectorAll('.chat-card[data-url]').forEach(card => {
      // Remove existing listeners by cloning (simple dedup)
      if (card.dataset.bound) return;
      card.dataset.bound = 'true';

      const openCard = () => {
        const url = card.dataset.url;
        const cardId = card.dataset.cardId;
        if (!url) return;

        // Mark as read
        card.classList.add('card-read');
        this.markRead(cardId);

        // Navigate using BrowserState if available
        if (typeof BrowserState !== 'undefined') {
          const activeTab = BrowserState.getActiveTab();
          if (activeTab) {
            BrowserState.navigateTo(activeTab.id, url);
          }
        }
      };

      card.addEventListener('click', openCard);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCard();
        }
      });
    });
  },

  /**
   * Mark a card as read in the cache
   */
  markRead(cardId) {
    const cache = this.getCache();
    if (!cache) return;
    const card = cache.cards.find(c => c.id === cardId);
    if (card) {
      card.read = true;
      this.setCache(cache.cards);
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AI GENERATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Parse AI response JSON (handles markdown fences, etc.)
   */
  parseAIResponse(response) {
    let cleaned = response.trim();
    // Strip markdown code fences
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    }
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) throw new Error('Expected JSON array');
    return parsed;
  },

  /**
   * Transform raw AI card data into our card format
   */
  transformCards(rawCards) {
    return rawCards.map((raw, idx) => ({
      id: `card-${Date.now()}-${idx}`,
      section: raw.section,
      source: {
        name: raw.source_name,
        url: raw.source_url,
        favicon: `https://www.google.com/s2/favicons?domain=${this.extractDomain(raw.source_url)}&sz=32`
      },
      text: raw.text,
      category: raw.category,
      timestamp: new Date(),
      read: false
    }));
  },

  extractDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  },

  /**
   * Generate fallback cards when AI is unavailable
   */
  getFallbackCards() {
    const fallback = [
      { section: 'feed', source_name: 'The Verge', source_url: 'https://theverge.com', text: '**Apple** is reportedly working on a foldable iPhone prototype that could launch as early as **2027**. The device is said to feature a **7.5-inch** display when unfolded.', category: 'tech' },
      { section: 'feed', source_name: 'ESPN', source_url: 'https://espn.com', text: 'The **NBA All-Star Game** is set for this weekend. **LeBron James** and **Giannis Antetokounmpo** will captain the two teams in the new draft format.', category: 'sports' },
      { section: 'feed', source_name: 'CNBC', source_url: 'https://cnbc.com', text: '**Bitcoin** surged past **$98,000** today amid growing institutional adoption. **BlackRock\'s** Bitcoin ETF saw record inflows of **$1.2 billion** this week.', category: 'finance' },
      { section: 'feed', source_name: 'Pitchfork', source_url: 'https://pitchfork.com', text: '**Kendrick Lamar** just dropped a surprise deluxe edition of his latest album with **5 new tracks**. Critics are already calling it one of the best hip-hop releases of the year.', category: 'music' }
    ];
    return this.transformCards(fallback);
  },

  /**
   * Generate all cards via AI
   */
  async generate() {
    if (!AIService.isConfigured()) {
      console.warn('[Cards] AI not configured — using fallback cards');
      return this.getFallbackCards();
    }

    const messages = [
      { role: 'system', content: 'You are a content curator for a browser new tab page. Return only valid JSON arrays.' },
      { role: 'user', content: this.buildPrompt(this.shownTopics) }
    ];

    try {
      console.log('[Cards] Generating content cards via AI...');
      const response = await AIService.chat(messages);
      const rawCards = this.parseAIResponse(response);
      const cards = this.transformCards(rawCards);

      // Track shown topics
      cards.forEach(c => {
        const topicWords = c.text.replace(/\*\*/g, '').split(' ').slice(0, 5).join(' ');
        this.shownTopics.push(topicWords);
      });

      return cards;
    } catch (err) {
      console.error('[Cards] Generation failed:', err);
      return null;
    }
  },

  /**
   * Generate more feed cards
   */
  async generateMore() {
    if (!AIService.isConfigured()) return null;

    const messages = [
      { role: 'system', content: 'You are a content curator for a browser new tab page. Return only valid JSON arrays.' },
      { role: 'user', content: this.buildMoreFeedPrompt(this.shownTopics) }
    ];

    try {
      console.log('[Cards] Generating more feed cards...');
      const response = await AIService.chat(messages);
      const rawCards = this.parseAIResponse(response);
      const cards = this.transformCards(rawCards);

      cards.forEach(c => {
        const topicWords = c.text.replace(/\*\*/g, '').split(' ').slice(0, 5).join(' ');
        this.shownTopics.push(topicWords);
      });

      return cards;
    } catch (err) {
      console.error('[Cards] More generation failed:', err);
      return null;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOAD MORE
  // ═══════════════════════════════════════════════════════════════════════════

  async loadMore(ntp) {
    const buttons = ntp.querySelectorAll('.more-stories-btn');
    buttons.forEach(btn => {
      btn.disabled = true;
      btn.textContent = 'Loading...';
    });

    const newCards = await this.generateMore();
    if (newCards && newCards.length > 0) {
      // Add to cache
      const cache = this.getCache();
      if (cache) {
        cache.cards.push(...newCards);
        this.setCache(cache.cards);
      }

      // figure out which NTP suffix
      const ntpId = ntp.id === 'new-tab-page-2' ? '2' : '';
      this.appendFeedCards(newCards, ntpId);
    }

    buttons.forEach(btn => {
      btn.disabled = false;
      btn.textContent = 'Refresh';
    });
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Initialize content cards on a new tab page
   * Always generates fresh content for each new tab.
   * @param {string} [ntpId] - '' for pane 1, '2' for pane 2
   */
  async init(ntpId = '') {
    console.log('[Cards] Initializing content cards...');

    // Show skeletons immediately
    this.showSkeletons(ntpId);

    // Always generate fresh cards for each new tab
    this.clearCache();
    this.shownTopics = [];

    const cards = await this.generate();
    if (cards && cards.length > 0) {
      this.setCache(cards);
      this.renderCards(cards, ntpId);
    } else {
      // Fallback cards if AI is unavailable
      console.log('[Cards] No cards generated, showing fallback');
      const fallback = this.getFallbackCards();
      this.renderCards(fallback, ntpId);
    }
  },

  /**
   * Refresh cards in background
   */
  async refreshInBackground(ntpId = '') {
    console.log('[Cards] Background refresh...');
    const cards = await this.generate();
    if (cards && cards.length > 0) {
      this.setCache(cards);
      this.renderCards(cards, ntpId);
    }
  },

  /**
   * Full refresh — clear cache and regenerate
   */
  async refresh(ntpId = '') {
    this.clearCache();
    this.shownTopics = [];
    this.showSkeletons(ntpId);
    const cards = await this.generate();
    if (cards && cards.length > 0) {
      this.setCache(cards);
      this.renderCards(cards, ntpId);
    } else {
      this.clearSkeletons(ntpId);
    }
  },

  /**
   * Clear skeleton state (show empty cards or nothing)
   */
  clearSkeletons(ntpId = '') {
    const suffix = ntpId ? `-${ntpId}` : '';
    const ntp = document.getElementById(`new-tab-page${suffix}`);
    if (!ntp) return;

    ntp.querySelectorAll('.skeleton-card').forEach(el => el.remove());
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ContentCards;
}
