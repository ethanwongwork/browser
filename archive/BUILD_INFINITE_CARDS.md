# Infinite Content Cards

---

## Prompt

```
Build a system that generates content cards for the new tab page. There are TWO distinct card sections:

═══════════════════════════════════════════════════════════════════════════
CATEGORIES (10 total)
═══════════════════════════════════════════════════════════════════════════

These are the unified content categories used across both card sections.
Users can enable/disable categories in Settings to control their feed.

1. Tech — gadgets, apps, AI, product launches, developer tools
2. News — world events, politics, breaking stories, current affairs
3. Sports — scores, trades, highlights, schedules
4. Music — new releases, concerts, artist news, playlists
5. Entertainment — TV, movies, streaming, YouTube, gaming, podcasts
6. Finance — stocks, crypto, markets, earnings, economic data
7. Style — fashion, sneakers, drops, sales, streetwear
8. Food — recipes, restaurant openings, food culture, cooking tips
9. Science — space, research, discoveries, health, environment
10. Design — visual design, tools, creative community, architecture

Each card must have exactly ONE category from the list above.

═══════════════════════════════════════════════════════════════════════════
SECTION 1: "FEED" (top 4 cards, 2x2 grid)
═══════════════════════════════════════════════════════════════════════════

These are informational cards — news, scores, market data, announcements, culture.
Feel like a smart morning briefing.

TEXT STYLE:
- 2-3 sentences, conversational
- **Bold** key names, numbers, scores, prices
- Specific and data-rich (include actual numbers, names, stats)
- Tone: a well-read friend catching you up

EXAMPLE TEXTS:

"**Nvidia** is up **+8.2%** today after announcing a new AI chip that triples inference speed. Stock hit an all-time high of **$892.50** — analysts are calling it the biggest jump since the ChatGPT rally."

"The **Lakers** beat the Celtics **112-108** in overtime last night. **LeBron** dropped **34 points** and hit the game-winning three with 2.1 seconds left."

"**Billie Eilish** dropped a surprise EP at midnight — *'Blue'* is 5 tracks of stripped-down acoustic songs. Fans are saying it's her most vulnerable work yet."

"**Apple** just sent out invites for a March event with the tagline 'One more satisfying thing.' Leakers are predicting the **iPhone SE 4** and a new **iPad Air**."

═══════════════════════════════════════════════════════════════════════════
SECTION 2: "START HERE" (4 cards, single horizontal row)
═══════════════════════════════════════════════════════════════════════════

These are actionable suggestion cards. Each card should start with a verb
and feel like a direct recommendation. Keep text SHORT — the card only
shows ~5 lines before clipping, so aim for 1-2 short sentences max.

TEXT STYLE:
- Start with an action verb: Watch, Shop, Listen, Try, Read, Play, Cook, Browse, Check out, Stream, Explore
- **Bold** the key item (product name, show title, artist, etc.)
- 1-2 short sentences. Prioritize brevity to avoid ellipses.
- No filler — every word should earn its place

EXAMPLE TEXTS:

"Watch the newest episode of **Severance** on Apple TV+."

"Shop the new **Air Max Dn** in the Volt colorway on Nike."

"Try this 20-minute **miso salmon** bowl — one pan, five ingredients."

"Listen to **Kendrick Lamar**'s new track on Spotify."

"Read Dribbble's **2026 Design Trends** report."

"Play **Hollow Knight: Silksong** — out now on Steam."

"Cook **Bon Appétit**'s viral crispy chili oil noodles."

"Shop the **Arc'teryx Beta LT** at 30% off on END."

"Stream the new season of **The Bear** on Hulu."

"Browse this week's top launches on **Product Hunt**."

BAD EXAMPLES (too long, will get clipped):
✗ "The Arc'teryx Beta LT is 30% off at END. — it rarely goes on sale and this is the lowest price we've seen since last winter's clearance."
✗ "Kendrick Lamar just released a surprise new single featuring SZA that samples a classic Marvin Gaye track. Available now on Spotify."

═══════════════════════════════════════════════════════════════════════════
CARD DATA STRUCTURE
═══════════════════════════════════════════════════════════════════════════

{
  id: string,
  section: "feed" | "start-here",
  source: {
    name: "Nike",
    url: "https://nike.com",
    favicon: "https://www.google.com/s2/favicons?domain=nike.com&sz=32"
  },
  text: "Formatted text with **bold** details...",
  category: "tech" | "news" | "sports" | "music" | "entertainment" | "finance" | "style" | "food" | "science" | "design",
  timestamp: Date,
  read: boolean
}

═══════════════════════════════════════════════════════════════════════════
CONTENT SOURCES (mapped to categories)
═══════════════════════════════════════════════════════════════════════════

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

═══════════════════════════════════════════════════════════════════════════
SETTINGS INTEGRATION
═══════════════════════════════════════════════════════════════════════════

Users can toggle categories on/off in Settings. Store as an array in localStorage:

Key: 'card_categories'
Default: all 10 enabled
Value: ["tech", "news", "sports", "music", "entertainment", "finance", "style", "food", "science", "design"]

When generating cards, pass only the enabled categories to the AI prompt:
"Only generate cards from these categories: tech, sports, music, style"

The Settings UI should display the 10 categories as pill-shaped toggles
that the user can tap to enable/disable. Show them in a wrapping row.
Active pills have a filled background; inactive pills have an outline style.
Store the selection immediately on change.

When the user changes their category selection, clear the card cache
so the next new tab load generates fresh cards matching the new preferences.

═══════════════════════════════════════════════════════════════════════════
GENERATION LOGIC
═══════════════════════════════════════════════════════════════════════════

1. ON NEW TAB PAGE LOAD:
   - Check cache age (refresh if > 15 minutes)
   - Read enabled categories from localStorage
   - Call AI to generate cards for BOTH sections in one request

2. AI PROMPT FOR GENERATION:
   "Generate content cards for a browser new tab page.
   Only use these categories: [enabled categories list]

   SECTION 1 — FEED (4 cards):
   Informational. News, scores, data, announcements, culture.
   2-3 sentences each. Bold key details. Conversational but specific.
   Mix: at least 3 different categories.

   SECTION 2 — START HERE (4 cards):
   Actionable suggestions. Each card MUST start with a verb
   (Watch, Shop, Listen, Try, Read, Play, Cook, Stream, Browse, Explore).
   1-2 short sentences MAX. Bold the key item name. Keep it brief.
   Mix: at least 3 different categories.

   For each card return JSON:
   {
     section: 'feed' | 'start-here',
     source_name, source_url, text, category
   }

   Return a JSON array of 8 cards total. No markdown fences."

3. CACHE RESPONSE:
   - Store cards in localStorage with timestamp
   - Serve cached cards immediately, refresh in background if stale
   - Clear cache when user changes category preferences

4. LOAD MORE (feed section only):
   - "More stories" button below the feed grid
   - Generates 4 more FEED cards, appended
   - Prompt includes existing topics to avoid
   - Respects enabled categories

5. REFRESH:
   - Clear cache, regenerate all cards

═══════════════════════════════════════════════════════════════════════════
DISPLAY RULES
═══════════════════════════════════════════════════════════════════════════

FEED SECTION:
- 4 cards in 2x2 grid (2 per row)
- Uses existing .cards-grid layout
- Newest/most relevant first
- Mix categories (don't show same category back-to-back)

START HERE SECTION:
- 4 cards in a single horizontal row
- Uses existing .cards-single-row layout
- Section header: "Start here"
- Cards should feel varied (don't show same category back-to-back)

BOTH SECTIONS:
- Click card → opens source URL in browser
- Mark cards as read when clicked (subtle opacity)
- Subtle fade-in animation when cards load
- Skeleton loading state while generating

═══════════════════════════════════════════════════════════════════════════
IMPORTANT RULES
═══════════════════════════════════════════════════════════════════════════

- DO NOT change existing card CSS (colors, spacing, sizes, border-radius)
- DO NOT change the HTML structure of .chat-card
- Only add JavaScript to generate and populate cards with content
- Use existing AI integration (AIService — provider/model/API key from settings)
- Use existing .chat-card markup for rendered cards
- Use Motion library for animations
- Render markdown bold (**text**) as <strong> tags in card text
- Render markdown italic (*text*) as <em> tags in card text
```
