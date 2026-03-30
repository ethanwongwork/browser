/**
 * cards-batch.js — Main-process batch content generation
 * Fetches RSS feeds + makes AI API calls to build a pool of text blocks.
 * Runs on app launch (if stale) and every 8 hours via setInterval.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const POOL_FILENAME = 'cards-pool.json';
const BATCH_INTERVAL_MS = 8 * 60 * 60 * 1000; // 8 hours
const RETRY_DELAY_MS = 5000;

// AI configuration (set from renderer via IPC)
let aiConfig = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o',
  categories: ['tech','news','sports','music','entertainment','finance','style','food','science','design'],
  location: ''
};

// Reference to mainWindow (set externally)
let _mainWindow = null;

function setMainWindow(win) {
  _mainWindow = win;
}

function getPoolPath() {
  return path.join(app.getPath('userData'), POOL_FILENAME);
}

// ═══════════════════════════════════════════════════════════════════════════════
// RSS FEEDS
// ═══════════════════════════════════════════════════════════════════════════════

const RSS_FEEDS = {
  tech: [
    { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', domain: 'theverge.com', priority: 1 },
    { url: 'https://www.wired.com/feed/rss', name: 'Wired', domain: 'wired.com', priority: 2 },
    { url: 'https://techcrunch.com/feed/', name: 'TechCrunch', domain: 'techcrunch.com', priority: 3 },
    { url: 'https://www.404media.co/rss/', name: '404 Media', domain: '404media.co', priority: 4 }
  ],
  news: [
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', name: 'The New York Times', domain: 'nytimes.com', priority: 1 },
    { url: 'https://www.newyorker.com/feed/everything', name: 'The New Yorker', domain: 'newyorker.com', priority: 2 },
    { url: 'https://www.theatlantic.com/feed/all/', name: 'The Atlantic', domain: 'theatlantic.com', priority: 3 },
    { url: 'https://www.vox.com/rss/index.xml', name: 'Vox', domain: 'vox.com', priority: 4 },
    { url: 'https://www.theguardian.com/world/rss', name: 'The Guardian', domain: 'theguardian.com', priority: 5 },
    { url: 'https://feeds.reuters.com/reuters/topNews', name: 'Reuters', domain: 'reuters.com', priority: 6 },
    { url: 'https://feeds.apnews.com/apnews/headlines', name: 'AP News', domain: 'apnews.com', priority: 7 },
    { url: 'https://feeds.bbci.co.uk/news/rss.xml', name: 'BBC', domain: 'bbc.com', priority: 8 },
    { url: 'https://api.axios.com/feed/', name: 'Axios', domain: 'axios.com', priority: 9 },
    { url: 'https://feeds.washingtonpost.com/rss/national', name: 'Washington Post', domain: 'washingtonpost.com', priority: 10 },
    { url: 'https://restofworld.org/feed/', name: 'Rest of World', domain: 'restofworld.org', priority: 11 }
  ],
  sports: [
    { url: 'https://www.theringer.com/rss/index.xml', name: 'The Ringer', domain: 'theringer.com', priority: 1 },
    { url: 'https://www.espn.com/espn/rss/news', name: 'ESPN', domain: 'espn.com', priority: 2 },
    { url: 'https://theathletic.com/feeds/rss/news/', name: 'The Athletic', domain: 'theathletic.com', priority: 3 },
    { url: 'https://defector.com/feed', name: 'Defector', domain: 'defector.com', priority: 4 },
    { url: 'https://bleacherreport.com/articles/feed', name: 'Bleacher Report', domain: 'bleacherreport.com', priority: 5 },
    { url: 'https://www.sbnation.com/rss/index.xml', name: 'SB Nation', domain: 'sbnation.com', priority: 6 }
  ],
  music: [
    { url: 'https://pitchfork.com/feed/feed-news/rss', name: 'Pitchfork', domain: 'pitchfork.com', priority: 1 },
    { url: 'https://www.stereogum.com/feed/', name: 'Stereogum', domain: 'stereogum.com', priority: 2 },
    { url: 'https://www.nme.com/feed', name: 'NME', domain: 'nme.com', priority: 4 }
  ],
  entertainment: [
    { url: 'https://www.ign.com/articles/feed', name: 'IGN', domain: 'ign.com', priority: 3 }
  ],
  finance: [
    { url: 'https://morningbrew.com/feed', name: 'Morning Brew', domain: 'morningbrew.com', priority: 2 },
    { url: 'https://sherwood.news/feed/', name: 'Sherwood', domain: 'sherwood.news', priority: 3 },
    { url: 'https://www.forbes.com/real-time/feed2/', name: 'Forbes', domain: 'forbes.com', priority: 4 },
    { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US', name: 'Yahoo Finance', domain: 'finance.yahoo.com', priority: 5 },
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk', domain: 'coindesk.com', priority: 6 },
    { url: 'https://blockworks.co/feed', name: 'Blockworks', domain: 'blockworks.co', priority: 7 },
    { url: 'https://www.fool.com/feeds/index.aspx', name: 'The Motley Fool', domain: 'fool.com', priority: 8 },
    { url: 'https://www.inc.com/rss', name: 'Inc', domain: 'inc.com', priority: 9 }
  ],
  style: [
    { url: 'https://www.highsnobiety.com/feed/', name: 'Highsnobiety', domain: 'highsnobiety.com', priority: 1 },
    { url: 'https://hypebeast.com/feed', name: 'Hypebeast', domain: 'hypebeast.com', priority: 2 },
    { url: 'https://www.gq.com/feed/rss', name: 'GQ', domain: 'gq.com', priority: 3 }
  ],
  food: [
    { url: 'https://www.eater.com/rss/index.xml', name: 'Eater', domain: 'eater.com', priority: 1 }
  ],
  science: [
    { url: 'https://www.nasa.gov/news-release/feed/', name: 'NASA', domain: 'nasa.gov', priority: 1 },
    { url: 'https://www.technologyreview.com/feed/', name: 'MIT Technology Review', domain: 'technologyreview.com', priority: 2 },
    { url: 'https://www.nature.com/nature.rss', name: 'Nature', domain: 'nature.com', priority: 3 },
    { url: 'https://www.newscientist.com/feed/home/', name: 'New Scientist', domain: 'newscientist.com', priority: 4 },
    { url: 'https://rss.sciam.com/ScientificAmerican-Global', name: 'Scientific American', domain: 'scientificamerican.com', priority: 5 }
  ],
  design: [
    { url: 'https://www.itsnicethat.com/rss', name: "It's Nice That", domain: 'itsnicethat.com', priority: 1 },
    { url: 'https://www.dezeen.com/feed/', name: 'Dezeen', domain: 'dezeen.com', priority: 2 },
    { url: 'https://www.curbed.com/rss/index.xml', name: 'Curbed', domain: 'curbed.com', priority: 4 },
    { url: 'https://www.thisiscolossal.com/feed/', name: 'Colossal', domain: 'thisiscolossal.com', priority: 5 },
    { url: 'https://eyeondesign.aiga.org/feed/', name: 'Eye on Design', domain: 'eyeondesign.aiga.org', priority: 6 },
    { url: 'https://www.creativeboom.com/feed/', name: 'Creative Boom', domain: 'creativeboom.com', priority: 7 },
    { url: 'https://www.designboom.com/feed/', name: 'Designboom', domain: 'designboom.com', priority: 8 },
    { url: 'https://dribbble.com/stories.rss', name: 'Dribbble', domain: 'dribbble.com', priority: 9 }
  ]
};

// ═══════════════════════════════════════════════════════════════════════════════
// RSS PARSING (lightweight, no rss-parser dependency)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch and parse an RSS/Atom feed into items
 */
async function fetchFeed(feedInfo) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(feedInfo.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrowserApp/1.0)' }
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    // Simple XML item extraction
    const items = [];
    // Try <item> (RSS 2.0) then <entry> (Atom)
    const itemRegex = /<item[\s>]([\s\S]*?)<\/item>|<entry[\s>]([\s\S]*?)<\/entry>/gi;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
      const block = match[1] || match[2];
      const title = extractTag(block, 'title');
      const description = extractTag(block, 'description') || extractTag(block, 'summary') || extractTag(block, 'content');
      const link = extractLink(block);
      const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'published') || extractTag(block, 'updated');

      if (title) {
        items.push({
          title: stripHtml(title).slice(0, 200),
          description: stripHtml(description || '').slice(0, 300),
          link: link || feedInfo.url,
          pubDate: pubDate || ''
        });
      }
    }

    return { ...feedInfo, items };
  } catch (err) {
    console.warn(`[CardsBatch] RSS fetch failed for ${feedInfo.name}:`, err.message);
    return { ...feedInfo, items: [] };
  }
}

function extractTag(xml, tag) {
  // Handle CDATA
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function extractLink(xml) {
  // RSS <link>url</link>
  const linkTag = xml.match(/<link[^>]*>([^<]+)<\/link>/i);
  if (linkTag) return linkTag[1].trim();
  // Atom <link href="url" />
  const atomLink = xml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  if (atomLink) return atomLink[1].trim();
  return '';
}

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAVICON RESOLUTION — fetch real favicon URLs from sites
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Resolve the favicon URL for a domain using Google's favicon service.
 * Same source as the favorites bar favicons for visual consistency.
 */
async function resolveFavicon(domain) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * Resolve favicons for all unique domains in a block set (parallel, batched)
 */
async function resolveFavicons(blocks) {
  const domains = [...new Set(blocks.map(b => b.source.domain).filter(Boolean))];
  console.log(`[CardsBatch] Resolving favicons for ${domains.length} domains...`);
  const faviconMap = {};

  // Resolve in parallel batches of 5
  const concurrency = 5;
  for (let i = 0; i < domains.length; i += concurrency) {
    const batch = domains.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async d => ({ domain: d, url: await resolveFavicon(d) }))
    );
    for (const r of results) {
      if (r.status === 'fulfilled') {
        faviconMap[r.value.domain] = r.value.url;
        console.log(`[CardsBatch]   ${r.value.domain} → ${r.value.url.substring(0, 80)}`);
      }
    }
  }

  // Apply resolved URLs to blocks
  for (const block of blocks) {
    if (block.source.domain && faviconMap[block.source.domain]) {
      block.source.favicon = faviconMap[block.source.domain];
    }
  }

  return blocks;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI API CALLS
// ═══════════════════════════════════════════════════════════════════════════════

async function callAI(prompt, systemMsg, options = {}) {
  const { provider, apiKey, model } = aiConfig;
  if (!apiKey) throw new Error('No API key configured');

  const maxTokens = options.maxTokens || 6000;
  const temperature = options.temperature || 0.7;

  if (provider === 'anthropic') {
    return callAnthropic(prompt, systemMsg, { maxTokens, temperature, model });
  } else {
    return callOpenAI(prompt, systemMsg, { maxTokens, temperature, model });
  }
}

async function callOpenAI(prompt, systemMsg, opts) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aiConfig.apiKey}`
    },
    body: JSON.stringify({
      model: opts.model || 'gpt-4o',
      messages: [
        { role: 'system', content: systemMsg },
        { role: 'user', content: prompt }
      ],
      max_tokens: opts.maxTokens,
      temperature: opts.temperature
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

async function callAnthropic(prompt, systemMsg, opts) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': aiConfig.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: opts.model || 'claude-sonnet-4-20250514',
      system: systemMsg,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: opts.maxTokens,
      temperature: opts.temperature
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

function categoriesHash() {
  return [...aiConfig.categories].sort().join(',');
}

function readPool() {
  try {
    const raw = fs.readFileSync(getPoolPath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writePool(pool) {
  fs.writeFileSync(getPoolPath(), JSON.stringify(pool, null, 2), 'utf8');
}

function isPoolFresh() {
  const pool = readPool();
  if (!pool) return false;
  const age = Date.now() - pool.generatedAt;
  if (age > BATCH_INTERVAL_MS) return false;
  if (pool.categoriesHash !== categoriesHash()) return false;
  return true;
}

/**
 * Step 2: Fetch all RSS feeds for enabled categories in parallel
 */
async function fetchAllRSS() {
  const enabledFeeds = [];
  for (const cat of aiConfig.categories) {
    const feeds = RSS_FEEDS[cat];
    if (feeds) enabledFeeds.push(...feeds);
  }

  console.log(`[CardsBatch] Fetching ${enabledFeeds.length} RSS feeds...`);
  const results = await Promise.allSettled(enabledFeeds.map(f => fetchFeed(f)));

  const allFeeds = [];
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.items.length > 0) {
      allFeeds.push(r.value);
    }
  }
  console.log(`[CardsBatch] Got ${allFeeds.length} feeds with items`);
  return allFeeds;
}

/**
 * Step 3: RSS Summarization — one AI call
 */
async function summarizeRSS(feeds) {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Build RSS data block
  let rssData = '';
  for (const feed of feeds) {
    for (const item of feed.items) {
      rssData += `\n[SOURCE: ${feed.name} | DOMAIN: ${feed.domain} | CATEGORY: ${getCategoryForFeed(feed)}]\n`;
      rssData += `Title: ${item.title}\n`;
      if (item.description) rssData += `Summary: ${item.description}\n`;
      rssData += `Link: ${item.link}\n`;
      if (item.pubDate) rssData += `Date: ${item.pubDate}\n`;
    }
  }

  const prompt = `You are generating content text blocks for a browser new tab page.
Below is real RSS feed data from today.

USER CONTEXT:
- Date: ${today}
- Location: ${aiConfig.location || 'Unknown'}
- Enabled categories: ${aiConfig.categories.join(', ')}

═══════════════════════════════════════════════════
TYPOGRAPHIC MARKUP
═══════════════════════════════════════════════════

Text renders in Georgia Pro Light (300) at 24px. Four styles layer on top.

**bold** (Regular 400) — What the eye lands on when skimming:
  Source names (always, paired with {{source}}), numbers, scores,
  prices, percentages, product names, timestamps, verdict/result words,
  colorway/spec strings.

*italic* (Light Italic) — Narrative energy:
  Action phrases, key claims, editorial voice, creative work titles.

[[search query|display text]] — Underline link on proper nouns:
  People, companies, products, places. All clickable.

{{domain|Source Name}} — Inline source with favicon:
  Renders as bold + underline + favicon automatically.

OVERRIDE RULE: Bold ALWAYS wins over italic. If a bold element
falls inside an italic phrase, break the italic around it:
  CORRECT: *hit an all-time high of* **$892.50**
  WRONG: *hit an all-time high of **$892.50***

STYLE STACKING:
  Bold + underline = OK: [[Nike Air Jordan 1|**Air Jordan 1**]]
  Italic + underline = NO
  Bold + italic = NEVER (bold wins)

═══════════════════════════════════════════════════
WHAT TO [[LINK]] — STRICT RULES
═══════════════════════════════════════════════════

ONLY link proper nouns and specific searchable subjects:
  Person names, brand/company names, product/release names,
  event names, specific technologies, named works, places.
NEVER link generic/abstract nouns: design, guide, report, market, etc.

═══════════════════════════════════════════════════
TEXT BLOCKS (20 total)
═══════════════════════════════════════════════════

Generate from the RSS data:
- 20 text blocks, 2-3 sentences each
- Apply all typographic styles precisely (**bold**, *italic*, [[links]], {{source}})
- Each block: ONE {{source}} reference woven in
- Each block: 2-4 [[links]] on key subjects
- Mix categories evenly, no same category back-to-back
- Use real source names and URLs from RSS items
- Prefer higher-priority sources

VARY source placement (patterns A-E):
A (start): "{{espn.com|ESPN}} *is reporting that*..."
B (middle): "...per {{finance.yahoo.com|Yahoo Finance}}."
C (end): "...{{pitchfork.com|Pitchfork}} *is calling it*..."
D (integrated): "...*just went live* on {{nike.com|Nike}}..."
E (embedded): "A new deep dive from {{theverge.com|The Verge}}..."

Use all 5 roughly evenly. Never same pattern consecutively.

JSON per text block:
{
  "source_name": "The Verge",
  "source_domain": "theverge.com",
  "source_url": "https://theverge.com/article-link",
  "text": "A new deep dive from {{theverge.com|The Verge}} *explores how* [[Apple|Apple]] is *prototyping a foldable* [[Apple iPhone|**iPhone**]].",
  "category": "tech"
}

═══════════════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════════════

Return ONLY a JSON array of 20 objects. No markdown fences.

═══════════════════════════════════════════════════
RSS DATA:
═══════════════════════════════════════════════════
${rssData}`;

  const systemMsg = 'You are a content curator. Return only valid JSON arrays. No markdown fences.';
  return callAI(prompt, systemMsg, { maxTokens: 6000, temperature: 0.7 });
}

/**
 * Step 4: Web search for non-RSS sources
 */
async function searchWebSources() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const prompt = `Search the web for the latest content from these sources.
Find REAL, CURRENT items that exist RIGHT NOW.

USER CONTEXT:
- Date: ${today}
- Location: ${aiConfig.location || 'Unknown'}
- Enabled categories: ${aiConfig.categories.join(', ')}

Generate 1-2 text blocks per source. 15 total.
2-3 sentences per block.
Apply full typographic markup: **bold**, *italic*, [[links]], {{source}}.
Bold always wins over italic (break italic around bold elements):
  CORRECT: *hit an all-time high of* **$892.50**
  WRONG: *hit an all-time high of **$892.50***
Each block: one {{domain|Source Name}}, 2-4 [[links]].
ONLY [[link]] proper nouns and specific searchable subjects.
ALL content must be real. Vary source placement (A-E), never consecutive.

SOURCES TO SEARCH (by category):

TECH: theinformation.com, every.to, producthunt.com, github.com, medium.com
MUSIC: lyricalemonade.com, ra.co, open.spotify.com, music.apple.com
ENTERTAINMENT: a24films.com, letterboxd.com, netflix.com, tv.apple.com, youtube.com, store.steampowered.com
STYLE: nike.com, ssense.com, kith.com, aimeleondore.com, doverstreetmarket.com, endclothing.com, stussy.com, arcteryx.com, newbalance.com, fearofgod.com, asics.com, ourlegacy.com, bdgastore.com, grailed.com
FOOD: theinfatuation.com, bonappetit.com, cooking.nytimes.com, tastecooking.com
DESIGN: thebrandidentity.com, figma.com/community, behance.net

JSON per text block:
{
  "source_name": "Nike",
  "source_domain": "nike.com",
  "source_url": "https://nike.com/launch/t/actual-product",
  "text": "The [[product|product]] just went live on {{nike.com|Nike}}...",
  "category": "style"
}

Return ONLY a JSON array of 15 objects. No markdown fences.`;

  const systemMsg = 'You are a content curator. Return only valid JSON arrays. No markdown fences.';
  return callAI(prompt, systemMsg, { maxTokens: 4000, temperature: 0.7 });
}

function getCategoryForFeed(feed) {
  for (const [cat, feeds] of Object.entries(RSS_FEEDS)) {
    if (feeds.some(f => f.domain === feed.domain)) return cat;
  }
  return 'news';
}

function parseAIJSON(raw) {
  let cleaned = raw.trim();
  // Strip markdown fences
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
  }
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('Expected JSON array');
  return parsed;
}

function enrichBlocks(rawBlocks) {
  const blocks = rawBlocks.map((raw, idx) => ({
    id: `block-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
    source: {
      name: raw.source_name || 'Unknown',
      domain: raw.source_domain || '',
      url: raw.source_url || '',
      favicon: '' // resolved later by resolveFavicons()
    },
    text: raw.text || '',
    category: raw.category || 'news',
    timestamp: Date.now(),
    used: false,
    read: false
  }));

  // Enforce character limit: drop blocks over 200 rendered characters
  const filtered = blocks.filter(b => {
    const rendered = b.text
      .replace(/\{\{.+?\|(.+?)\}\}/g, '$1')
      .replace(/\[\[.+?\|(.+?)\]\]/g, '$1')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1');
    if (rendered.length > 200) {
      console.log(`[CardsBatch] Dropping block (${rendered.length} chars): ${rendered.substring(0, 60)}...`);
      return false;
    }
    return true;
  });
  console.log(`[CardsBatch] Kept ${filtered.length}/${blocks.length} blocks within 200-char limit`);
  return filtered;
}

function shuffleForVariety(blocks) {
  // Shuffle so no same category back-to-back
  const shuffled = [];
  const remaining = [...blocks];
  let lastCat = '';

  while (remaining.length > 0) {
    const candidates = remaining.filter(b => b.category !== lastCat);
    const pick = candidates.length > 0 ? candidates : remaining;
    const idx = Math.floor(Math.random() * pick.length);
    const chosen = pick[idx];
    shuffled.push(chosen);
    remaining.splice(remaining.indexOf(chosen), 1);
    lastCat = chosen.category;
  }
  return shuffled;
}

/**
 * Main batch generation function
 */
async function runBatch(force = false) {
  if (!force && isPoolFresh()) {
    console.log('[CardsBatch] Pool is fresh, skipping batch');
    return;
  }

  if (!aiConfig.apiKey) {
    console.warn('[CardsBatch] No API key configured, skipping batch');
    if (_mainWindow && !_mainWindow.isDestroyed()) {
      _mainWindow.webContents.send('blocks:error', 'No API key configured');
    }
    return;
  }

  console.log('[CardsBatch] Starting batch generation...');
  let rssBlocks = [];
  let webBlocks = [];

  try {
    // Step 2: Fetch RSS
    const feeds = await fetchAllRSS();

    // Step 3: RSS Summarization
    if (feeds.length > 0) {
      try {
        const rssResponse = await summarizeRSS(feeds);
        const rssRaw = parseAIJSON(rssResponse);
        rssBlocks = enrichBlocks(rssRaw);
        console.log(`[CardsBatch] RSS call produced ${rssBlocks.length} blocks`);
      } catch (err) {
        console.error('[CardsBatch] RSS summarization failed, retrying...', err.message);
        // Retry once
        try {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          const rssResponse2 = await summarizeRSS(feeds);
          const rssRaw2 = parseAIJSON(rssResponse2);
          rssBlocks = enrichBlocks(rssRaw2);
        } catch (err2) {
          console.error('[CardsBatch] RSS summarization retry failed:', err2.message);
        }
      }
    }

    // Step 4: Web search sources
    try {
      const webResponse = await searchWebSources();
      const webRaw = parseAIJSON(webResponse);
      webBlocks = enrichBlocks(webRaw);
      console.log(`[CardsBatch] Web search call produced ${webBlocks.length} blocks`);
    } catch (err) {
      console.warn('[CardsBatch] Web search call failed (continuing with RSS blocks):', err.message);
    }

  } catch (err) {
    console.error('[CardsBatch] Batch failed:', err.message);
    if (_mainWindow && !_mainWindow.isDestroyed()) {
      _mainWindow.webContents.send('blocks:error', err.message);
    }
    return;
  }

  // Step 5: Merge, enrich, resolve favicons, and save
  const allBlocks = [...rssBlocks, ...webBlocks];

  if (allBlocks.length === 0) {
    console.error('[CardsBatch] No blocks generated');
    if (_mainWindow && !_mainWindow.isDestroyed()) {
      _mainWindow.webContents.send('blocks:error', 'No content generated');
    }
    return;
  }

  // Resolve real favicons from each source's website
  await resolveFavicons(allBlocks);

  const shuffled = shuffleForVariety(allBlocks);

  const pool = {
    generatedAt: Date.now(),
    categoriesHash: categoriesHash(),
    provider: aiConfig.provider,
    blocks: shuffled
  };

  writePool(pool);
  console.log(`[CardsBatch] Pool saved with ${shuffled.length} blocks`);

  if (_mainWindow && !_mainWindow.isDestroyed()) {
    _mainWindow.webContents.send('blocks:ready');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IPC HANDLERS (called from main.js)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get N unused blocks from the pool
 */
function getBlocks(count = 0) {
  const pool = readPool();
  if (!pool || !pool.blocks) return [];

  // Filter to enabled categories
  const enabled = new Set(aiConfig.categories);
  const all = pool.blocks.filter(b => enabled.has(b.category));

  // Always return all blocks — cycle through the whole pool
  if (count === 0) return all;

  // For specific count, rotate through using a cursor
  let available = all.filter(b => !b.used);
  if (available.length < count) {
    console.log('[CardsBatch] Pool exhausted, recycling blocks');
    for (const block of pool.blocks) block.used = false;
    available = all;
  }

  const selected = available.slice(0, count);
  for (const sel of selected) {
    const block = pool.blocks.find(b => b.id === sel.id);
    if (block) block.used = true;
  }
  writePool(pool);
  return selected;
}

/**
 * Get pool status info
 */
function getPoolStatus() {
  const pool = readPool();
  if (!pool) return { exists: false, count: 0, unused: 0, age: null };
  const enabled = new Set(aiConfig.categories);
  const unused = pool.blocks.filter(b => !b.used && enabled.has(b.category)).length;
  return {
    exists: true,
    count: pool.blocks.length,
    unused,
    age: Date.now() - pool.generatedAt,
    provider: pool.provider
  };
}

/**
 * Update AI configuration from renderer
 */
function setAIConfig(config) {
  if (config.provider) aiConfig.provider = config.provider;
  if (config.apiKey) aiConfig.apiKey = config.apiKey;
  if (config.model) {
    // Migrate deprecated model names
    const modelMap = {
      'claude-3-5-sonnet-20241022': 'claude-sonnet-4-20250514',
      'claude-3-opus-20240229': 'claude-opus-4-20250514',
      'claude-3-haiku-20240307': 'claude-3-5-haiku-20241022'
    };
    aiConfig.model = modelMap[config.model] || config.model;
  }
  if (config.categories) aiConfig.categories = config.categories;
  if (config.location) aiConfig.location = config.location;
  console.log('[CardsBatch] Config updated:', aiConfig.provider, aiConfig.model, aiConfig.categories.length, 'categories');
  
  // If this is the first config with an API key, run initial batch
  maybeRunInitialBatch();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULER
// ═══════════════════════════════════════════════════════════════════════════════

let batchTimer = null;
let _initialBatchPending = true;

function startScheduler() {
  // ⛔ SCHEDULER PAUSED — no recurring batches.
  // One-shot batch will fire via maybeRunInitialBatch() when config arrives,
  // but ONLY if no fresh pool exists yet.
  console.log('[CardsBatch] Scheduler PAUSED — will pull ONE batch if pool is empty/stale');
  _initialBatchPending = true;
}

/**
 * Called when config is set — runs ONE initial batch if pool is missing/stale
 */
function maybeRunInitialBatch() {
  if (_initialBatchPending && aiConfig.apiKey) {
    _initialBatchPending = false;
    const pool = readPool();
    if (pool && pool.blocks && pool.blocks.length >= 4) {
      console.log('[CardsBatch] Pool already has blocks, skipping initial batch');
      return;
    }
    console.log('[CardsBatch] Pool empty/insufficient — pulling ONE batch...');
    setTimeout(() => runBatch(true), 500);
  }
}

function stopScheduler() {
  if (batchTimer) {
    clearInterval(batchTimer);
    batchTimer = null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  setMainWindow,
  setAIConfig,
  getBlocks,
  getPoolStatus,
  runBatch,
  startScheduler,
  stopScheduler
};
