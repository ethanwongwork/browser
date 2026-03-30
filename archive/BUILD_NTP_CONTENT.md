# New Tab Page — Content System

Everything the user sees on the new tab page that is AI-generated:
4 text blocks (with styled inline text and clickable links).
The greeting sentence is built entirely in code.
All text block content is produced in one batch process, served
from one local pool.

---

## Prompt

```
Build the content system for the new tab page. This includes:
- GREETING SENTENCE (built in code, not AI)
- 4 TEXT BLOCKS (informational, with inline source + favicon)

All AI content is generated in the Electron main process via a batch
that runs every 8 hours. The renderer never makes API calls.

═══════════════════════════════════════════════════════════════════════════
TYPOGRAPHIC SYSTEM
═══════════════════════════════════════════════════════════════════════════

All NTP text uses Georgia Pro Light (300) at 24px / 32px line-height
as the base. Four styles layer on top to create a scannable hierarchy.

───────────────────────────────────────────────────────────────────────────
STYLE 1 — BOLD (Georgia Pro Regular 400)
What your eye lands on when skimming. Anchors and facts.
───────────────────────────────────────────────────────────────────────────

Markup: **text**

Apply bold to:

SOURCE NAMES (always, paired with inline favicon):
  **ESPN**, **The New York Times**, **Nike**, **Yahoo Finance**

NUMBERS, SCORES, PRICES, PERCENTAGES:
  **112-108**, **34 points**, **$892.50**, **+8.2%**, **7.5-inch**

PRODUCT NAMES (the specific thing being discussed):
  **iPhone SE 4**, **Air Jordan 1 Low**, **PencilWash**, **AI chip**

TIMESTAMPS (when actionable — the user might act on them):
  **10 AM EST**, **midnight**, **7:30 PM**

VERDICT / RESULT WORDS (outcomes, conclusions):
  **sold out**, **all-time high**, **delayed**, **unanimous**

COLORWAY / SPEC STRINGS (specific product details):
  **Sail/Black-Muslin-Military Blue**, **M3 chip**, **256GB**

DO NOT BOLD:
- Vague numbers in common phrases ("a 25-year-old" stays light)
- Common words (today, new, now, just)
- Adjectives or opinions

───────────────────────────────────────────────────────────────────────────
STYLE 2 — ITALIC (Georgia Pro Light Italic 300)
The narrative energy. What happened, what's being claimed.
───────────────────────────────────────────────────────────────────────────

Markup: *text*

Apply italic to:

ACTION PHRASES (verbs + their immediate objects):
  *beat the Celtics*, *dropped 34 points*, *hit the game-winner*,
  *sold out in 12 minutes*, *just went live*

KEY CLAIMS (the newsworthy assertion):
  *working on a foldable*, *could launch as early as*,
  *triples inference speed*, *planning to acquire*

EDITORIAL VOICE (the writer's characterization):
  *highly limited release*, *most vulnerable work yet*,
  *biggest jump since the ChatGPT rally*

CREATIVE WORK TITLES (albums, films, shows, songs):
  *Blue* (album), *Oppenheimer* (film), *"Rosary"* (song)

DO NOT ITALICIZE:
- Source names (those are bold)
- Numbers/data (those are bold)
- Proper nouns on their own (those are underlined)
- Connective tissue (prepositions, articles)

───────────────────────────────────────────────────────────────────────────
STYLE 3 — UNDERLINE (clickable search links)
Proper nouns. Everything underlined is clickable.
───────────────────────────────────────────────────────────────────────────

Markup: [[search query|display text]]

Apply underline to:

PEOPLE & COMPANIES:
  [[Lakers|Lakers]], [[LeBron James|LeBron James]],
  [[Apple|Apple]], [[Nvidia|Nvidia]]

PRODUCTS (also bold — stacks both styles):
  [[Nike Air Jordan 1 Low|**Air Jordan 1 Low**]],
  [[Apple iPhone|**iPhone**]], [[Nvidia AI chip|**AI chip**]]

SOURCE NAMES (also bold — stacks both styles):
  {{espn.com|ESPN}}, {{nytimes.com|The New York Times}}
  (source markers handle both bold + underline automatically)

PLACES (in greeting):
  [[Los Angeles California|Los Angeles, California]]

DATES (in greeting):
  [[what is happening today February 14|February 14th]]

WEATHER (in greeting):
  [[Los Angeles weather today|68° with light rain]]

DO NOT UNDERLINE:
- Common words or filler phrases
- Numbers on their own (bold only, not linked)
- Actions or claims (italic only, not linked)

───────────────────────────────────────────────────────────────────────────
STYLE 4 — LIGHT (Georgia Pro Light 300, no decoration)
Connective tissue. Recedes so styled words pop.
───────────────────────────────────────────────────────────────────────────

No markup — this is the default.

Everything not covered by bold, italic, or underline:
  "according to", "in overtime", "today after announcing",
  "that could", "the device is said to", "this"

This is most of the text. It flows between the styled words.

───────────────────────────────────────────────────────────────────────────
OVERRIDE RULE: BOLD ALWAYS WINS OVER ITALIC
───────────────────────────────────────────────────────────────────────────

If a bolded element (number, product name, timestamp, verdict) falls
inside an italic phrase, close the italic, insert the bold, then
reopen the italic. Bold text is NEVER also italic.

CORRECT:
  *hit the game-winner with* **2.1 seconds** *left*
  *dropped* **34 points** *and hit the game-winner*
  *could launch as early as* **2027**
  *hit an all-time high of* **$892.50**

WRONG:
  *hit the game-winner with **2.1 seconds** left*
  (do not nest bold inside italic — break the italic out)

───────────────────────────────────────────────────────────────────────────
STYLE STACKING RULES
───────────────────────────────────────────────────────────────────────────

BOLD + UNDERLINE = allowed (product names, source names)
  [[Nike Air Jordan 1 Low|**Air Jordan 1 Low**]]

ITALIC + UNDERLINE = not used
  (if something is a proper noun, it gets underline, not italic)

BOLD + ITALIC = never
  (bold always wins — see override rule above)

ALL THREE = never

───────────────────────────────────────────────────────────────────────────
CSS IMPLEMENTATION
───────────────────────────────────────────────────────────────────────────

@font-face declarations for Georgia Pro Light + Light Italic + Regular.

.ntp-summary,
.ntp-block-text {
  font-family: 'Georgia Pro', 'Georgia', 'Times New Roman', serif;
  font-size: 24px;
  font-weight: 300;           /* Light — the default */
  line-height: 32px;
  color: var(--color-fg-default);
}

.ntp-block-text strong {
  font-weight: 400;           /* Regular — bold treatment */
  font-style: normal;         /* Override rule: never italic */
}

.ntp-block-text em {
  font-weight: 300;           /* Light Italic */
  font-style: italic;
}

.ntp-link {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--color-border-default);
  text-underline-offset: 3px;
  cursor: pointer;
  transition: text-decoration-color 0.15s;
}
.ntp-link:hover {
  text-decoration-color: var(--color-fg-secondary);
}

.ntp-source-favicon {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  vertical-align: middle;
  margin-right: 2px;
  display: inline;
  position: relative;
  top: -1px;
}

═══════════════════════════════════════════════════════════════════════════
CATEGORIES & SOURCES (10 categories, priority-ranked)
═══════════════════════════════════════════════════════════════════════════

Sources are ranked by priority within each category. Higher-ranked
sources appear more frequently. (R) = RSS feed, (W) = web search.

───────────────────────────────────────────────────────────────────────────
1. TECH
───────────────────────────────────────────────────────────────────────────
 1. The Verge — theverge.com (R)
 2. Wired — wired.com (R)
 3. TechCrunch — techcrunch.com (R)
 4. 404 Media — 404media.co (R)
 5. The Information — theinformation.com (W)
 6. Every.to — every.to (W)
 7. Product Hunt — producthunt.com (W)
 8. GitHub — github.com (W)
 9. Medium — medium.com (W)

───────────────────────────────────────────────────────────────────────────
2. NEWS
───────────────────────────────────────────────────────────────────────────
 1. The New York Times — nytimes.com (R)
 2. The New Yorker — newyorker.com (R)
 3. The Atlantic — theatlantic.com (R)
 4. Vox — vox.com (R)
 5. The Guardian — theguardian.com (R)
 6. Reuters — reuters.com (R)
 7. AP News — apnews.com (R)
 8. BBC — bbc.com (R)
 9. Axios — axios.com (R)
10. Washington Post — washingtonpost.com (R)
11. Rest of World — restofworld.org (R)

───────────────────────────────────────────────────────────────────────────
3. SPORTS
───────────────────────────────────────────────────────────────────────────
 1. The Ringer — theringer.com (R)
 2. ESPN — espn.com (R)
 3. The Athletic — theathletic.com (R)
 4. Defector — defector.com (R)
 5. Bleacher Report — bleacherreport.com (R)
 6. SB Nation — sbnation.com (R)

───────────────────────────────────────────────────────────────────────────
4. MUSIC
───────────────────────────────────────────────────────────────────────────
 1. Pitchfork — pitchfork.com (R)
 2. Stereogum — stereogum.com (R)
 3. Lyrical Lemonade — lyricalemonade.com (W)
 4. NME — nme.com (R)
 5. Resident Advisor — ra.co (W)
 6. Spotify — open.spotify.com (W)
 7. Apple Music — music.apple.com (W)

───────────────────────────────────────────────────────────────────────────
5. ENTERTAINMENT
───────────────────────────────────────────────────────────────────────────
 1. A24 — a24films.com (W)
 2. Letterboxd — letterboxd.com (W)
 3. IGN — ign.com (R)
 4. Netflix — netflix.com (W)
 5. Apple TV+ — tv.apple.com (W)
 6. YouTube — youtube.com (W)
 7. Steam — store.steampowered.com (W)

───────────────────────────────────────────────────────────────────────────
6. FINANCE
───────────────────────────────────────────────────────────────────────────
 1. Bloomberg — bloomberg.com (R)
 2. Morning Brew — morningbrew.com (R)
 3. Sherwood — sherwood.news (R)
 4. Forbes — forbes.com (R)
 5. Yahoo Finance — finance.yahoo.com (R)
 6. CoinDesk — coindesk.com (R)
 7. Blockworks — blockworks.co (R)
 8. The Motley Fool — fool.com (R)
 9. Inc — inc.com (R)

───────────────────────────────────────────────────────────────────────────
7. STYLE
───────────────────────────────────────────────────────────────────────────
 1. Highsnobiety — highsnobiety.com (R)
 2. Hypebeast — hypebeast.com (R)
 3. GQ — gq.com (R)
 4. Nike — nike.com (W)
 5. SSENSE — ssense.com (W)
 6. Kith — kith.com (W)
 7. Aimé Leon Dore — aimeleondore.com (W)
 8. Dover Street Market — doverstreetmarket.com (W)
 9. END. — endclothing.com (W)
10. Stüssy — stussy.com (W)
11. Arc'teryx — arcteryx.com (W)
12. New Balance — newbalance.com (W)
13. Fear of God — fearofgod.com (W)
14. ASICS — asics.com (W)
15. Our Legacy — ourlegacy.com (W)
16. Bodega — bdgastore.com (W)
17. Grailed — grailed.com (W)

───────────────────────────────────────────────────────────────────────────
8. FOOD
───────────────────────────────────────────────────────────────────────────
 1. Eater — eater.com (R)
 2. The Infatuation — theinfatuation.com (W)
 3. Bon Appétit — bonappetit.com (W)
 4. NYT Cooking — cooking.nytimes.com (W)
 5. Taste Cooking — tastecooking.com (W)

───────────────────────────────────────────────────────────────────────────
9. SCIENCE
───────────────────────────────────────────────────────────────────────────
 1. NASA — nasa.gov (R)
 2. MIT Technology Review — technologyreview.com (R)
 3. Nature — nature.com (R)
 4. New Scientist — newscientist.com (R)
 5. Scientific American — scientificamerican.com (R)

───────────────────────────────────────────────────────────────────────────
10. DESIGN
───────────────────────────────────────────────────────────────────────────
 1. It's Nice That — itsnicethat.com (R)
 2. Dezeen — dezeen.com (R)
 3. The Brand Identity — thebrandidentity.com (W)
 4. Curbed — curbed.com (R)
 5. Colossal — thisiscolossal.com (R)
 6. Eye on Design — eyeondesign.aiga.org (R)
 7. Creative Boom — creativeboom.com (R)
 8. Designboom — designboom.com (R)
 9. Dribbble — dribbble.com (R)
10. Figma Community — figma.com/community (W)
11. Behance — behance.net (W)

Users toggle categories in Settings (localStorage 'card_categories').
Default: all 10 enabled.

═══════════════════════════════════════════════════════════════════════════
MARKUP SYNTAX (used in AI-generated text)
═══════════════════════════════════════════════════════════════════════════

The AI uses these markers. The renderer parses them into styled HTML.

BOLD (Regular 400):
  **text**

ITALIC (Light Italic 300):
  *text*

SEARCH LINKS (underline, clickable):
  [[search query|display text]]

SOURCE REFERENCES (favicon + bold + underline):
  {{domain|Source Name}}

OVERRIDE RULE:
  Bold always wins over italic. If a bold element sits inside an
  italic phrase, break the italic around it:
  *hit an all-time high of* **$892.50**

STYLE COMBINATIONS:
  Bold + underline (product names, source names):
    [[Nike Air Jordan 1 Low|**Air Jordan 1 Low**]]
  Source marker (auto bold + underline + favicon):
    {{espn.com|ESPN}}

═══════════════════════════════════════════════════════════════════════════
INLINE SOURCE REFERENCES — TEXT BLOCKS ONLY
═══════════════════════════════════════════════════════════════════════════

Every text block must reference the source publication WITHIN the
text using the {{domain|Source Name}} marker. The renderer parses
this into a favicon image + bold underlined source name.

Renderer output:
  <a class="ntp-link ntp-source" data-search="Source Name">
    <img class="ntp-source-favicon"
      src="https://www.google.com/s2/favicons?domain=domain&sz=32"
      alt="">
    <strong>Source Name</strong>
  </a>

───────────────────────────────────────────────────────────────────────────
VARYING SOURCE PLACEMENT (across text blocks)
───────────────────────────────────────────────────────────────────────────

PATTERN A — Source at the beginning:
"{{espn.com|ESPN}} *is reporting that* the [[Lakers|Lakers]] *beat*
the [[Celtics|Celtics]] **112-108** in overtime."

PATTERN B — Source in the middle:
"[[Nvidia|Nvidia]] stock is *up* **+8.2%** today after *announcing*
a new [[Nvidia AI chip|**AI chip**]], per {{finance.yahoo.com|Yahoo Finance}}."

PATTERN C — Source at the end:
"[[Billie Eilish|Billie Eilish]] *dropped a surprise EP* —
*Blue* is **5 tracks** of stripped-down acoustic songs that
{{pitchfork.com|Pitchfork}} *is calling her most vulnerable work yet*."

PATTERN D — Source as part of the action:
"The [[Travis Scott Nike AJ1|**Travis Scott x Nike AJ1 Low**]]
*just went live* on {{nike.com|Nike}} and **sold out** in
**12 minutes**."

PATTERN E — Source names the content:
"A new deep dive from {{theverge.com|The Verge}} *explores how*
[[Apple|Apple]] is *prototyping a foldable* [[Apple iPhone|**iPhone**]]."

Rules:
- Across 4 visible text blocks, use AT LEAST 3 different patterns
- Never same pattern on consecutive text blocks

═══════════════════════════════════════════════════════════════════════════
NTP GREETING — 1 SENTENCE (built in code, NOT AI)
═══════════════════════════════════════════════════════════════════════════

Built entirely in the renderer. No AI involved.

TEMPLATE:
<strong>Good morning,</strong> 🐻 <strong>Ethan.</strong> It is currently
<a>[temp]</a><strong>°</strong> with [description] in <a><strong>[location]</strong></a>,
where the time is <strong>[HH:MM:SS am/pm]</strong> on
<a><strong>[Day], [date]</strong></a>.

Note: lowercase am/pm.

STYLING RULES:
- "Good morning," and "Ethan." are BOLD (not italic)
- Temperature number is underlined link, ° is bold only (not linked)
- "with [description]" is light (not linked)
- Location is bold + underlined link
- Time is bold (not linked)
- Day + date is bold + underlined link

UNDERLINE LINKS (built in code):
- Weather temp → data-search: "[City] weather today"
- Location → data-search: "[City] [State]"
- Date → data-search: "[Day] [Month] [Day#]"

LOCATION FORMATTING:
Always spell out full state/country names. Never abbreviate.
  CORRECT: Los Angeles, California — New York, New York — Chicago, Illinois
  WRONG:   Los Angeles, CA — New York, NY — Chicago, IL

RENDERED EXAMPLE:
<strong>Good morning,</strong> 🐻 <strong>Ethan.</strong> It is currently
<a class="ntp-link" data-search="Los Angeles weather today">
<strong>68</strong></a><strong>°</strong> with light rain in
<a class="ntp-link" data-search="Los Angeles California">
<strong>Los Angeles, California</strong></a>, where the time is
<strong>8:35:15 am</strong> on <a class="ntp-link"
data-search="Wednesday February 14"><strong>Wednesday, February
14th</strong></a>.

WEATHER CODE → DESCRIPTION (Open-Meteo):
0: "clear skies"
1-3: "partly cloudy skies"
45, 48: "foggy conditions"
51, 53, 56: "light drizzle"
55, 57: "heavy drizzle"
61, 66: "light rain and cloudy skies"
63: "rain and overcast skies"
65, 67: "heavy rain"
71, 73, 77: "light snow"
75: "heavy snow"
80-82: "rain showers"
85, 86: "snow showers"
95, 96, 99: "thunderstorms"

DATE ORDINAL: 1,21,31→"st" | 2,22→"nd" | 3,23→"rd" | else→"th"

LIVE CLOCK: setInterval every second, only time portion re-renders.
Weather refreshes every ~30 min via Open-Meteo.

═══════════════════════════════════════════════════════════════════════════
TEXT BLOCKS (4, single column stacked)
═══════════════════════════════════════════════════════════════════════════

4 informational text blocks stacked vertically (no grid).
No card chrome. Just styled text with inline source favicons
and underline links. Each block is prefixed with a number in
parentheses — (1), (2), (3), (4) — styled in neutral-400.

TEXT STYLE:
- Georgia Pro Light 300, 24px / 32px line-height
- Block numbers: <span class="ntp-block-num">(1)</span> in neutral-400
- 2-3 sentences, conversational
- Apply typographic system: **bold**, *italic*, [[links]], {{source}}
- Each text block: ONE {{source}} reference in text
- Each text block: 2-4 [[links]] on key subjects
- Vary source placement (patterns A-E)
- All content must be REAL from RSS or web search
- Tone: a well-read friend catching you up

FULL STYLED EXAMPLES:

SPORTS:
"The [[Lakers|Lakers]] *beat* the [[Celtics|Celtics]] **112-108**
in overtime according to {{espn.com|ESPN}}. [[LeBron James|LeBron
James]] *dropped* **34 points** and *hit the game-winner with*
**2.1 seconds** *left*."

TECH:
"According to {{nytimes.com|The New York Times}}, [[Apple|Apple]]
is reportedly *working on a foldable* [[Apple iPhone|**iPhone**]]
prototype that *could launch as early as* **2027**. The device is
said to *feature* a **7.5-inch** display when unfolded."

STYLE:
"The [[Travis Scott Nike Air Jordan 1 Low|**Travis Scott Nike Air
Jordan 1 Low**]] *just went live* on {{nike.com|Nike}}. This
*highly limited release* features a **Sail/Black-Muslin-Military
Blue** color scheme."

FINANCE:
"[[Nvidia|Nvidia]] stock is *up* **+8.2%** today after *announcing*
a new [[Nvidia AI chip|**AI chip**]] that *triples inference speed*,
per {{finance.yahoo.com|Yahoo Finance}}. Stock *hit an all-time high*
of **$892.50**."

═══════════════════════════════════════════════════════════════════════════
TEXT BLOCK DATA STRUCTURE
═══════════════════════════════════════════════════════════════════════════

{
  "id": "block-1707900000-a1b2c3",
  "source": {
    "name": "ESPN",
    "domain": "espn.com",
    "url": "https://espn.com",
    "favicon": "https://www.google.com/s2/favicons?domain=espn.com&sz=32"
  },
  "text": "Raw text with **bold**, *italic*, [[links]], {{source}}...",
  "category": "sports",
  "timestamp": 1707900000000,
  "used": false,
  "read": false
}

═══════════════════════════════════════════════════════════════════════════
LAYER 1: MAIN PROCESS — BATCH GENERATION (main.js / cards-batch.js)
═══════════════════════════════════════════════════════════════════════════

Create: cards-batch.js (required by main.js)
Runs in Node.js with full network + filesystem access.

───────────────────────────────────────────────────────────────────────────
SCHEDULE
───────────────────────────────────────────────────────────────────────────

- On app launch: if pool > 8 hours old → regenerate
- Every 8 hours via setInterval
- Regenerate if categories changed since last batch

───────────────────────────────────────────────────────────────────────────
STEP 1 — CHECK FRESHNESS
───────────────────────────────────────────────────────────────────────────

- Pool: app.getPath('userData') + '/cards-pool.json'
- If exists AND < 8 hours AND categories unchanged → skip
- Otherwise → run batch

───────────────────────────────────────────────────────────────────────────
STEP 2 — FETCH RSS FEEDS (parallel, free)
───────────────────────────────────────────────────────────────────────────

Promise.allSettled() + rss-parser. Keep 3-5 most recent per feed.
Only fetch feeds for user's enabled categories.

TECH:
- https://www.theverge.com/rss/index.xml
- https://www.wired.com/feed/rss
- https://techcrunch.com/feed/
- https://www.404media.co/rss/

NEWS:
- https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml
- https://www.newyorker.com/feed/everything
- https://www.theatlantic.com/feed/all/
- https://www.vox.com/rss/index.xml
- https://www.theguardian.com/world/rss
- https://feeds.reuters.com/reuters/topNews
- https://feeds.apnews.com/apnews/headlines
- https://feeds.bbci.co.uk/news/rss.xml
- https://api.axios.com/feed/
- https://feeds.washingtonpost.com/rss/national
- https://restofworld.org/feed/

SPORTS:
- https://www.theringer.com/rss/index.xml
- https://www.espn.com/espn/rss/news
- https://theathletic.com/feeds/rss/news/
- https://defector.com/feed
- https://bleacherreport.com/articles/feed
- https://www.sbnation.com/rss/index.xml

MUSIC:
- https://pitchfork.com/feed/feed-news/rss
- https://www.stereogum.com/feed/
- https://www.nme.com/feed

ENTERTAINMENT:
- https://www.ign.com/articles/feed

FINANCE:
- https://www.bloomberg.com/feed/podcast/etf-iq.xml
- https://morningbrew.com/feed
- https://sherwood.news/feed/
- https://www.forbes.com/real-time/feed2/
- https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US
- https://www.coindesk.com/arc/outboundfeeds/rss/
- https://blockworks.co/feed
- https://www.fool.com/feeds/index.aspx
- https://www.inc.com/rss

STYLE:
- https://www.highsnobiety.com/feed/
- https://hypebeast.com/feed
- https://www.gq.com/feed/rss

FOOD:
- https://www.eater.com/rss/index.xml

SCIENCE:
- https://www.nasa.gov/news-release/feed/
- https://www.technologyreview.com/feed/
- https://www.nature.com/nature.rss
- https://www.newscientist.com/feed/home/
- https://rss.sciam.com/ScientificAmerican-Global

DESIGN:
- https://www.itsnicethat.com/rss
- https://www.dezeen.com/feed/
- https://www.curbed.com/rss/index.xml
- https://www.thisiscolossal.com/feed/
- https://eyeondesign.aiga.org/feed/
- https://www.creativeboom.com/feed/
- https://www.designboom.com/feed/
- https://dribbble.com/stories.rss

Skip failed feeds, continue with the rest.

───────────────────────────────────────────────────────────────────────────
STEP 3 — API CALL #1: RSS SUMMARIZATION
───────────────────────────────────────────────────────────────────────────

One AI call. No web search. Reformats real RSS data into text blocks.

PROMPT:

"""
You are generating styled text blocks for a browser new tab page.
Below is real RSS feed data from today.

USER CONTEXT:
- Date: [TODAY'S DATE]
- Location: [USER'S CITY, STATE/COUNTRY]
- Enabled categories: [ENABLED_CATEGORIES]

═══════════════════════════════════════════════════
TYPOGRAPHIC MARKUP
═══════════════════════════════════════════════════

You must apply these styles precisely. The text will be rendered
in Georgia Pro Light (300) at 24px. Styles layer on top.

**bold** (Regular 400) — source names, numbers, scores, prices,
percentages, product names, timestamps, verdict/result words,
colorway/spec strings. What the eye lands on when skimming.

*italic* (Light Italic) — action phrases, key claims, editorial
voice, creative work titles. The narrative energy.

[[search query|display text]] — underline link on proper nouns.
People, companies, products, places. All clickable.

{{domain|Source Name}} — inline source with favicon. Automatically
renders as bold + underline + favicon.

OVERRIDE RULE: Bold always wins over italic. If a bold element
falls inside an italic phrase, break the italic around it:
  CORRECT: *hit an all-time high of* **$892.50**
  WRONG: *hit an all-time high of **$892.50***

STYLE STACKING:
  Bold + underline = OK: [[Nike Air Jordan 1|**Air Jordan 1**]]
  Italic + underline = NO
  Bold + italic = NEVER (bold wins)

═══════════════════════════════════════════════════
TEXT BLOCKS (20 total)
═══════════════════════════════════════════════════

Generate from the RSS data:
- 20 text blocks, 2-3 sentences each
- Apply all typographic styles precisely
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
  "text": "styled text with **bold**, *italic*, [[links]], {{source}}",
  "category": "tech"
}

═══════════════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════════════

Return ONLY a JSON array of 20 objects. No markdown fences.

═══════════════════════════════════════════════════
RSS DATA:
═══════════════════════════════════════════════════

[SOURCE: The Verge | DOMAIN: theverge.com | CATEGORY: tech | PRIORITY: 1]
Title: {title}
Summary: {description}
Link: {link}
Date: {pubDate}

...all fetched items...
"""

API: max_tokens 6000, temperature 0.7

───────────────────────────────────────────────────────────────────────────
STEP 4 — API CALL #2: WEB SEARCH FOR NON-RSS SOURCES
───────────────────────────────────────────────────────────────────────────

AI call WITH web search enabled.

PROMPT:

"""
Search the web for the latest content from these sources.
Find REAL, CURRENT items that exist RIGHT NOW.

USER CONTEXT:
- Date: [TODAY'S DATE]
- Location: [USER'S CITY, STATE/COUNTRY]
- Enabled categories: [ENABLED_CATEGORIES]

Generate 1-2 text blocks per source. 15 total.
Apply full typographic markup: **bold**, *italic*, [[links]], {{source}}.
Bold always wins over italic (break italic around bold elements).
Each block: one {{domain|Source Name}}, 2-4 [[links]].
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
  "text": "styled text with markup...",
  "category": "style"
}

Return ONLY a JSON array of 15 objects. No markdown fences.
"""

API: web search enabled, max_tokens 4000, temperature 0.7

───────────────────────────────────────────────────────────────────────────
STEP 5 — MERGE, ENRICH, AND SAVE
───────────────────────────────────────────────────────────────────────────

1. Parse both responses
2. Merge text blocks (~35 total pool)
3. Add to each: id, favicon URL, used: false, read: false
4. Shuffle for category variety
5. Save:

{
  "generatedAt": 1739520000000,
  "categoriesHash": "tech,news,sports,...",
  "provider": "anthropic",
  "blocks": [ ...~35 text block objects... ]
}

6. Notify renderer: mainWindow.webContents.send('blocks:ready')

───────────────────────────────────────────────────────────────────────────
STEP 6 — ERROR HANDLING
───────────────────────────────────────────────────────────────────────────

- RSS partially fails → continue
- Call #1 fails → retry once after 5s
- Call #2 fails → save call #1 results
- Both fail → 'blocks:error', keep old pool
- JSON parse fails → strip fences, retry; if fails, retry API
- No API key → skip batch, renderer shows setup fallback

───────────────────────────────────────────────────────────────────────────
POOL EXHAUSTION
───────────────────────────────────────────────────────────────────────────

All blocks used → "All caught up — check back later"
Wait for next 8-hour cycle.

═══════════════════════════════════════════════════════════════════════════
LAYER 2: IPC BRIDGE (preload.js)
═══════════════════════════════════════════════════════════════════════════

blocksAPI: {
  getBlocks: (count) => ipcRenderer.invoke('blocks:get', count),
  refreshPool: () => ipcRenderer.invoke('blocks:refresh'),
  getPoolStatus: () => ipcRenderer.invoke('blocks:status'),
  onBlocksReady: (cb) => ipcRenderer.on('blocks:ready', () => cb()),
  onBlocksError: (cb) => ipcRenderer.on('blocks:error', (_e, msg) => cb(msg)),
  setAIConfig: (config) => ipcRenderer.invoke('blocks:set-ai-config', config)
}

═══════════════════════════════════════════════════════════════════════════
LAYER 3: RENDERER (js/blocks-service.js)
═══════════════════════════════════════════════════════════════════════════

Renderer NEVER makes API calls. Everything via IPC.

TEXT PARSING PIPELINE:

function parseNtpText(text) {
  // 1. Source references: {{domain|Name}} → favicon + bold + underline
  text = text.replace(
    /\{\{(.+?)\|(.+?)\}\}/g,
    (_, domain, name) =>
      `<a class="ntp-link ntp-source" data-search="${name}">` +
      `<img class="ntp-source-favicon"
        src="https://www.google.com/s2/favicons?domain=${domain}&sz=32"
        alt="">` +
      `<strong>${name}</strong></a>`
  );
  // 2. Search links: [[query|text]] → underline link
  //    (preserves **bold** inside display text)
  text = text.replace(
    /\[\[(.+?)\|(.+?)\]\]/g,
    '<a class="ntp-link" data-search="$1">$2</a>'
  );
  // 3. Bold: **text** → <strong>
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 4. Italic: *text* → <em>
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return text;
}

ON APP START:
- Read provider, apiKey, model, categories from localStorage
- Call window.blocksAPI.setAIConfig(...)

ON NEW TAB PAGE LOAD:
1. Build greeting sentence in code:
   - Fetch weather from Open-Meteo
   - Map weather code to description
   - Get time (lowercase am/pm), day, date with ordinal
   - Get location from localStorage
   - Assemble: "It is currently [weather] in [location], where the
     local time is [time] on [day], [date]."
   - Start setInterval for live seconds counter

2. Render greeting into .ntp-summary
3. getBlocks(4) → parse each with parseNtpText → render into .ntp-blocks
4. If pool not ready → skeleton loading, listen for blocks:ready

LINK CLICK HANDLER:
- Delegate on .ntp-link clicks
- Read data-search, build search URL, navigate browser
- stopPropagation()

ON REFRESH:
- getBlocks(4) → swap in next unused text blocks

ON SETTINGS CHANGE:
- setAIConfig → refreshPool → skeleton until blocks:ready

═══════════════════════════════════════════════════════════════════════════
TEXT BLOCK RENDERING
═══════════════════════════════════════════════════════════════════════════

No card chrome. Stacked single column.

<div class="ntp-block" data-block-id="{id}" data-url="{source.url}">
  <p class="ntp-block-text">{parsed text}</p>
</div>

Container:
.ntp-blocks {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

Animation: fade in, y 8→0, 0.3s, 60ms stagger (Motion)

═══════════════════════════════════════════════════════════════════════════
IMPORTANT RULES
═══════════════════════════════════════════════════════════════════════════

- Main process handles ALL network (RSS + AI API)
- Renderer NEVER calls AI APIs — only IPC
- ALL content must be REAL (RSS + web search, never fabricated)
- ALL [[links]] must have meaningful search queries
- ALL text blocks must have exactly ONE {{source}} reference
- Source placement must be varied (patterns A-E, never consecutive)
- Bold always wins over italic (override rule)
- Higher-priority sources appear more frequently
- Use Motion library for animations
- Use electron-store or fs for pool
- npm install rss-parser
```

═══════════════════════════════════════════════════════════════════════════
FILE STRUCTURE
═══════════════════════════════════════════════════════════════════════════

```
browser/
├── main.js              # require cards-batch, IPC handlers, 8hr timer
├── cards-batch.js       # RSS fetch, 2 AI calls, pool management
├── preload.js           # blocksAPI bridge
├── js/
│   └── blocks-service.js # Renderer text block display (IPC only)
├── package.json         # rss-parser dependency
└── ...
```

═══════════════════════════════════════════════════════════════════════════
COST ESTIMATE
═══════════════════════════════════════════════════════════════════════════

Per batch (every 8 hours):
- RSS fetches: FREE
- Call #1 (RSS summarization): ~$0.015
- Call #2 (web search for non-RSS): ~$0.02

Per day (2 batches): ~$0.03–0.07 depending on provider
