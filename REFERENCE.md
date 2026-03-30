# Browser — Reference

Single source of truth for the browser's design system, architecture,
content system, and functionality.

---

## Architecture

Electron v33.0.0 browser with a New Tab Page content system.

```
browser/
├── main.js              # Electron main process, IPC, 8hr batch timer
├── cards-batch.js       # RSS fetch, 2 AI calls, pool management
├── preload.js           # blocksAPI + weatherAPI IPC bridge
├── index.html           # All CSS + HTML (single file)
├── js/
│   ├── app.js           # App initialization
│   ├── blocks-service.js # NTP text block rendering (IPC only)
│   ├── ui-bindings.js   # UI event handlers, greeting builder
│   ├── cards.js         # Card/tab management
│   ├── state.js         # App state management
│   ├── ai-service.js    # AI configuration
│   └── motion.js        # Motion animation utilities
├── characters/          # Character images for greeting
├── weather/             # Weather icons
└── icons/               # App icons
```

### Layout Structure

```
┌──────────────────────────────────────┐
│ [tab strip]                          │
│ [toolbar: ← → ↻ | search | favicons | ⋯] │
│ [webview / NTP content]              │
│ [bottom search bar]                  │
└──────────────────────────────────────┘
```

- Horizontal Chrome-style tab strip (no sidebar)
- Toolbar: back, forward, refresh, URL/search bar, up to 8 bookmark favicons, settings (⋯)
- Content area: webview or single-column NTP
- Bottom bar: search input with engine selector

### IPC Bridge (preload.js)

```
blocksAPI: {
  getBlocks(count)    → ipcRenderer.invoke('blocks:get', count)
  refreshPool()       → ipcRenderer.invoke('blocks:refresh')
  getPoolStatus()     → ipcRenderer.invoke('blocks:status')
  onBlocksReady(cb)   → ipcRenderer.on('blocks:ready', () => cb())
  onBlocksError(cb)   → ipcRenderer.on('blocks:error', (_e, msg) => cb(msg))
  setAIConfig(config) → ipcRenderer.invoke('blocks:set-ai-config', config)
}
```

### Search Engines

```
google:     https://www.google.com/search?q=
duckduckgo: https://duckduckgo.com/?q=
bing:       https://www.bing.com/search?q=
brave:      https://search.brave.com/search?q=
ecosia:     https://www.ecosia.org/search?q=
```

Stored in `localStorage` key `search_engine`. Default: Google.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+T | New tab |
| Cmd+W | Close tab |
| Cmd+L | Focus URL bar |
| Cmd+K | Focus bottom search bar |
| Cmd+[ / ] | Back / forward |
| Cmd+R | Refresh |
| Cmd+1-8 | Switch to tab by index |
| Cmd+, | Open settings |

---

## Design System

### Color Themes (12 palettes)

Each theme defines a 16-stop scale (100–900) via `[data-theme-color]` CSS selectors.
White (#FFFFFF) and black (#000000) remain constant across all themes.

#### 1. Neutral (default)
```
--100: #F9F9F9    --550: #727272
--150: #F3F3F3    --600: #686868
--200: #E9E9E9    --650: #565656
--250: #DCDCDC    --700: #454545
--300: #C6C6C6    --750: #353535
--350: #AFAFAF    --800: #262626
--400: #969696    --850: #191919
--450: #808080    --900: #0E0E0E
```

#### 2. Stone (warm greige)
```
--100: #FAF9F8    --550: #6A645E
--150: #F4F2F0    --600: #5E5954
--200: #EAE6E3    --650: #514D49
--250: #DCD7D2    --700: #44413D
--300: #C4BDB6    --750: #373532
--350: #AAA299    --800: #2A2826
--400: #918880    --850: #1D1C1A
--450: #7A716A    --900: #121110
```

#### 3. Blush (dusty rose)
```
--100: #FCF9FA    --550: #8D6872
--150: #F8F2F4    --600: #7E5D66
--200: #F1E8EB    --650: #6C5058
--250: #E7DADF    --700: #59434A
--300: #D6C4CA    --750: #46363B
--350: #C2ACB4    --800: #34292D
--400: #AD949D    --850: #231C1F
--450: #997D87    --900: #151012
```

#### 4. Coral (muted peach)
```
--100: #FCF9F7    --550: #926D60
--150: #F8F2EE    --600: #836254
--200: #F1E8E2    --650: #70544A
--250: #E8DAD2    --700: #5C453D
--300: #D9C5BA    --750: #483730
--350: #C6ADA0    --800: #362924
--400: #B29586    --850: #241C18
--450: #9D7E6E    --900: #16100D
```

#### 5. Sand (warm beige)
```
--100: #FAFAF7    --550: #7D7460
--150: #F6F4EE    --600: #706855
--200: #EFEBE2    --650: #605949
--250: #E5DFD3    --700: #4F4A3D
--300: #D4CCBE    --750: #3F3B31
--350: #C0B5A4    --800: #2F2D25
--400: #AA9E8A    --850: #201F1A
--450: #958872    --900: #131210
```

#### 6. Sage (muted green)
```
--100: #F8FAF8    --550: #5A7360
--150: #F0F4F0    --600: #506753
--200: #E4EBE5    --650: #455848
--250: #D5E0D6    --700: #3A493C
--300: #BDCABF    --750: #2F3A30
--350: #A2B5A5    --800: #242C25
--400: #889D8B    --850: #1A1F1A
--450: #708673    --900: #101310
```

#### 7. Seafoam (soft teal)
```
--100: #F6FAFA    --550: #4A7274
--150: #ECF4F4    --600: #426668
--200: #DFEBEC    --650: #38585A
--250: #CFDFE0    --700: #2F494A
--300: #B2CBCD    --750: #263A3B
--350: #94B5B7    --800: #1D2C2D
--400: #769D9F    --850: #151F20
--450: #5F8789    --900: #0D1313
```

#### 8. Sky (soft blue)
```
--100: #F7F9FB    --550: #526F8E
--150: #EEF3F8    --600: #49637F
--200: #E2EAF2    --650: #3F556C
--250: #D2DEE9    --700: #354659
--300: #B6C9DA    --750: #2B3846
--350: #97B0C6    --800: #212A35
--400: #7996B0    --850: #181D24
--450: #5E7E9B    --900: #0F1216
```

#### 9. Periwinkle (soft lavender-blue)
```
--100: #F9F9FB    --550: #646A96
--150: #F1F2F8    --600: #595F88
--200: #E6E8F2    --650: #4C5174
--250: #D8DBE9    --700: #404360
--300: #C0C4DA    --750: #33364C
--350: #A6ABC8    --800: #272939
--400: #8C92B4    --850: #1B1C28
--450: #747AA2    --900: #101118
```

#### 10. Lavender (soft purple)
```
--100: #FAF9FB    --550: #746890
--150: #F4F1F8    --600: #685D82
--200: #EBE6F1    --650: #594F6E
--250: #DFD8E8    --700: #4A425B
--300: #CCC3DA    --750: #3B3548
--350: #B6AAC8    --800: #2D2836
--400: #9F91B4    --850: #1F1C25
--450: #897A9F    --900: #131017
```

#### 11. Mauve (dusty purple-pink)
```
--100: #FAF9FA    --550: #846880
--150: #F5F1F4    --600: #765D72
--200: #EDE6EB    --650: #655062
--250: #E2D8E0    --700: #534251
--300: #D0C2CE    --750: #423540
--350: #BBABB8    --800: #322830
--400: #A594A0    --850: #221C21
--450: #907D8B    --900: #141013
```

#### 12. Wisteria (soft violet)
```
--100: #F9F8FB    --550: #6E6290
--150: #F3F0F8    --600: #635882
--200: #EAE5F1    --650: #554B6E
--250: #DED7E8    --700: #463E5B
--300: #CBC1DA    --750: #383248
--350: #B5A8C9    --800: #2A2636
--400: #9E90B6    --850: #1D1A25
--450: #8779A2    --900: #120F17
```

#### Theme Swatch Preview (300 shade)

| Theme | Hex |
|-------|-----|
| Neutral | #C6C6C6 |
| Stone | #C4BDB6 |
| Blush | #D6C4CA |
| Coral | #D9C5BA |
| Sand | #D4CCBE |
| Sage | #BDCABF |
| Seafoam | #B2CBCD |
| Sky | #B6C9DA |
| Periwinkle | #C0C4DA |
| Lavender | #CCC3DA |
| Mauve | #D0C2CE |
| Wisteria | #CBC1DA |

### CSS Variable Mapping

Theme color stops are mapped to semantic `--color-neutral-*` tokens:

```css
:root {
  --color-neutral-white: #FFFFFF;
  --color-neutral-100: var(--theme-100);
  /* ... through ... */
  --color-neutral-900: var(--theme-900);
  --color-neutral-black: #000000;
}
```

### Light Mode Semantic Tokens

```css
:root {
  /* Foreground */
  --color-fg-default: #272320;
  --color-fg-primary: #272320;
  --color-fg-secondary: #525252;
  --color-fg-tertiary: #6d7176;
  --color-fg-muted: #8f8f8f;
  --color-fg-disabled: #c7c7c7;
  --color-fg-on-brand: #c7c7c7;
  --color-fg-icon: #525252;
  --color-fg-icon-muted: #8f8f8f;

  /* Background */
  --color-bg-default: var(--color-neutral-white);
  --color-bg-surface: var(--color-neutral-white);
  --color-bg-subtle: var(--color-neutral-100);
  --color-bg-muted: var(--color-neutral-150);
  --color-bg-brand: var(--color-neutral-600);
  --color-bg-brand-hover: var(--color-neutral-650);
  --color-bg-brand-active: var(--color-neutral-700);
  --color-bg-hover: var(--color-neutral-100);
  --color-bg-active: var(--color-neutral-200);
  --color-bg-overlay: var(--color-overlay-white-40);
  --color-bg-shell: var(--theme-100);
  --color-bg-secondary: var(--color-neutral-150);

  /* Border */
  --color-border-default: var(--color-neutral-200);
  --color-border-hover: var(--color-neutral-250);
  --color-border-selected: var(--color-neutral-300);
  --color-border-subtle: var(--color-alpha-black-8);
  --color-border-muted: var(--color-alpha-black-5);
  --color-border-secondary: var(--color-neutral-250);

  /* Status */
  --color-error-fg: #dc2626;
  --color-error-bg: #fef2f2;
  --color-error-bg-subtle: rgba(239, 68, 68, 0.10);
  --color-error-border: rgba(239, 68, 68, 0.20);
  --color-success-fg: #16a34a;
  --color-danger-fg: #e7615b;
  --color-danger-fg-hover: #9d1920;
  --color-danger-fg-active: #3b1715;
  --color-danger-fg-disabled: #ffb5ae;
  --color-danger-bg-hover: #fff2f0;
  --color-danger-border-hover: #fefbfa;
  --color-danger-btn-bg: #ef4444;
  --color-danger-btn-bg-hover: #dc2626;

  /* Alpha */
  --color-alpha-black-5: rgba(0, 0, 0, 0.05);
  --color-alpha-black-8: rgba(0, 0, 0, 0.08);
  --color-alpha-black-10: rgba(0, 0, 0, 0.10);
  --color-alpha-black-12: rgba(0, 0, 0, 0.12);
  --color-alpha-black-15: rgba(0, 0, 0, 0.15);
  --color-alpha-black-20: rgba(0, 0, 0, 0.20);
  --color-alpha-black-50: rgba(0, 0, 0, 0.50);
  --color-alpha-white-10: rgba(255, 255, 255, 0.10);
  --color-alpha-white-20: rgba(255, 255, 255, 0.20);
  --color-alpha-white-25: rgba(255, 255, 255, 0.25);

  /* Overlay */
  --color-overlay-white-40: rgba(255, 255, 255, 0.4);

  /* Shadows */
  --shadow-alpha-5: rgba(0, 0, 0, 0.05);
  --shadow-alpha-8: rgba(0, 0, 0, 0.08);
  --shadow-alpha-15: rgba(0, 0, 0, 0.15);
  --shadow-alpha-20: rgba(0, 0, 0, 0.20);
  --shadow-sm: 0px 1px 2px 0px var(--shadow-alpha-5);
  --shadow-md: 0px 8px 24px 0px var(--shadow-alpha-8);
  --shadow-chat: 0px 1px 2px 0px var(--shadow-alpha-5), 0px 8px 24px 0px var(--shadow-alpha-8);
  --shadow-ctrl-brand: 0px 1px 3px 0px var(--shadow-alpha-15);
  --shadow-dropdown: 0px 8px 24px var(--shadow-alpha-20);
  --shadow-modal: 0 8px 32px var(--shadow-alpha-20);
}
```

### Dark Mode (`[data-theme="dark"]`)

Inverts the neutral scale by swapping theme stops:

```css
[data-theme="dark"] {
  --color-neutral-white: var(--theme-900);
  --color-neutral-100: var(--theme-850);
  --color-neutral-150: var(--theme-800);
  --color-neutral-200: var(--theme-750);
  --color-neutral-250: var(--theme-700);
  --color-neutral-300: var(--theme-650);
  --color-neutral-350: var(--theme-600);
  --color-neutral-400: var(--theme-550);
  --color-neutral-500: var(--theme-450);
  --color-neutral-550: var(--theme-400);
  --color-neutral-600: var(--theme-350);
  --color-neutral-650: var(--theme-300);
  --color-neutral-700: var(--theme-250);
  --color-neutral-750: var(--theme-200);
  --color-neutral-800: var(--theme-150);
  --color-neutral-850: var(--theme-100);
  --color-neutral-900: #FFFFFF;
  --color-neutral-black: #FFFFFF;

  /* Foreground */
  --color-fg-default: #FFFFFF;
  --color-fg-primary: #FFFFFF;
  --color-fg-secondary: #ADADAD;
  --color-fg-tertiary: #8F8F8F;
  --color-fg-muted: #5C5C5C;
  --color-fg-disabled: #474747;
  --color-fg-on-brand: #E0E0E0;
  --color-fg-icon: #ADADAD;
  --color-fg-icon-muted: #5C5C5C;

  /* Background */
  --color-bg-shell: var(--theme-900);
  --color-bg-brand-hover: #C7C7C7;
  --color-bg-brand-active: #E0E0E0;

  /* Status */
  --color-error-fg: #fca5a5;
  --color-error-bg: rgba(220, 38, 38, 0.15);
  --color-error-bg-subtle: rgba(239, 68, 68, 0.15);
  --color-error-border: rgba(239, 68, 68, 0.3);
  --color-success-fg: #4ade80;
  --color-danger-fg: #f87171;
  --color-danger-fg-hover: #fca5a5;
  --color-danger-fg-active: #fecaca;
  --color-danger-fg-disabled: #7f1d1d;
  --color-danger-bg-hover: rgba(239, 68, 68, 0.15);
  --color-danger-border-hover: rgba(239, 68, 68, 0.2);
  --color-danger-btn-bg: #dc2626;
  --color-danger-btn-bg-hover: #b91c1c;

  /* Shadows (higher opacity on dark) */
  --shadow-alpha-5: rgba(0, 0, 0, 0.2);
  --shadow-alpha-8: rgba(0, 0, 0, 0.3);
  --shadow-alpha-15: rgba(0, 0, 0, 0.4);
  --shadow-alpha-20: rgba(0, 0, 0, 0.5);
}
```

### Theme JS

```js
const themes = ['neutral','stone','blush','coral','sand','sage',
                'seafoam','sky','periwinkle','lavender','mauve','wisteria'];

function setThemeColor(theme) {
  document.documentElement.setAttribute('data-theme-color', theme);
  localStorage.setItem('themeColor', theme);
}

function setThemeMode(mode) {
  document.documentElement.setAttribute('data-theme-mode', mode);
  localStorage.setItem('themeMode', mode);
}

function getThemeColor() {
  return localStorage.getItem('themeColor') || 'neutral';
}

function getThemeMode() {
  return localStorage.getItem('themeMode') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
```

### Typography

```css
--font-family: 'Georgia Pro', Georgia, 'Times New Roman', serif;
--font-family-ui: -apple-system, BlinkMacSystemFont, 'SF Pro', system-ui, sans-serif;
--font-family-icons: 'SF Pro Rounded', -apple-system, system-ui, sans-serif;

/* Sizes */
--font-size-xs: 12px;    --line-height-xs: 16px;
--font-size-sm: 14px;    --line-height-sm: 20px;
--font-size-base: 16px;  --line-height-base: 24px;
--font-size-md: 18px;    --line-height-md: 26px;
--font-size-lg: 20px;

/* Weights */
--font-weight-regular: 400;
--font-weight-medium: 496;
--font-weight-semibold: 550;
```

`--font-family` (Georgia Pro): NTP greeting, text blocks, search bar placeholder
`--font-family-ui` (SF Pro): Tab strip, toolbar, settings, bottom search bar

### Spacing

```css
--space-0: 0px;   --space-1: 2px;   --space-2: 4px;
--space-3: 6px;   --space-4: 8px;   --space-6: 12px;
--space-8: 16px;  --space-12: 24px; --space-16: 32px;
--space-24: 64px;
```

### Corner Radius

```css
--radius-xs: 4px;   --radius-sm: 6px;    --radius-md: 8px;
--radius-lg: 12px;  --radius-xl: 16px;   --radius-2xl: 20px;
--radius-3xl: 24px; --radius-4xl: 32px;  --radius-full: 100px;
```

### Button Tokens

```css
/* Small */
--btn-sm-height: 24px;    --btn-sm-min-width: 24px;
--btn-sm-padding: 4px;    --btn-sm-radius: 8px;
--btn-sm-icon-size: 16px;

/* Large */
--btn-lg-height: 32px;    --btn-lg-min-width: 32px;
--btn-lg-padding: 6px;    --btn-lg-radius: 12px;
--btn-lg-icon-size: 20px;
```

### Favicon Tokens

```css
--favicon-size-sm: 16px;   --favicon-radius-sm: 0;
--favicon-size-md: 20px;   --favicon-radius-lg: 0;
--favicon-size-lg: 48px;
```

All favicons use Google's service: `https://www.google.com/s2/favicons?domain={domain}&sz=32`

### Tab Strip Tokens

```css
--tabstrip-height: 36px;
--tabstrip-padding: 4px;
--tabstrip-tab-padding: 4px;
--tabstrip-tab-radius: 12px;
--tabstrip-tab-gap: 4px;
--tabstrip-tab-max-width: 200px;
--tabstrip-tab-min-width: 48px;
```

### Search Bar Tokens

```css
--search-padding: 4px;
--search-gap: 4px;
--search-radius: 12px;
--search-bg: var(--color-bg-subtle);
--search-border: var(--color-border-subtle);
```

### Content Area Tokens

```css
--content-max-width: 824px;
--content-padding-x: 32px;
--content-padding-top: 64px;
--content-section-gap: 64px;
--content-grid-gap: 16px;
```

### Card Tokens

```css
--card-min-width: 200px;
--card-height: 180px;
--card-padding: 12px;
--card-gap: 12px;
--card-radius: 16px;
```

### SF Symbol Icon System

```css
.sf-icon     { font-family: 'SF Pro Rounded', 'SF Pro', -apple-system, system-ui; }
.sf-icon-sm  { width: 16px; height: 16px; font-size: 12px; }
.sf-icon-md  { width: 20px; height: 20px; font-size: 12px; }
.sf-icon-lg  { width: 24px; height: 24px; font-size: 14px; }
```

---

## NTP Content System

### Typographic System

All NTP text uses Georgia Pro Light (300) at 24px / 32px line-height.
Four styles layer on top:

#### Style 1 — Bold (Georgia Pro Regular 400)
Markup: `**text**`

Apply to: source names, numbers/scores/prices/percentages, product names,
timestamps, verdict/result words, colorway/spec strings.

Do NOT bold: vague numbers in phrases, common words, adjectives/opinions.

#### Style 2 — Italic (Georgia Pro Light Italic 300)
Markup: `*text*`

Apply to: action phrases (verbs + objects), key claims, editorial voice,
creative work titles.

Do NOT italicize: source names, numbers, proper nouns on their own.

#### Style 3 — Underline (clickable search links)
Markup: `[[search query|display text]]`

Apply to: people & companies, products (also bold), source names (auto via
`{{}}`), places, dates, weather.

#### Style 4 — Light (default, no markup)
Everything not covered by the above. Connective tissue.

#### Override Rules

- **Bold always wins over italic.** Break italic around bold elements:
  `*hit an all-time high of* **$892.50**`
- Bold + underline = allowed (product names, source names)
- Italic + underline = not used
- Bold + italic = never
- All three = never

#### Source References
Markup: `{{domain|Source Name}}`

Renders as: favicon + bold + underlined link.

#### NTP CSS

```css
.ntp-summary, .ntp-block-text {
  font-family: 'Georgia Pro', 'Georgia', 'Times New Roman', serif;
  font-size: 24px;
  font-weight: 300;
  line-height: 32px;
  color: var(--color-neutral-600);
}

.ntp-block-text strong { font-weight: 400; font-style: normal; }
.ntp-block-text em     { font-weight: 300; font-style: italic; }

.ntp-link {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: var(--color-border-default);
  text-underline-offset: 3px;
}
.ntp-link:hover { color: var(--color-neutral-800); }

.ntp-source-favicon {
  width: 16px; height: 16px;
  vertical-align: middle;
  margin: 0 4px 0 0;
}

.ntp-block-num { color: var(--color-neutral-400); white-space: nowrap; }
```

### NTP Greeting

Built entirely in code (no AI). Template:

```
<strong>Good morning,</strong> 🐻 <strong>Ethan.</strong> It is currently
<a>[temp]</a><strong>°</strong> with [description] in
<a><strong>[location]</strong></a>, where the time is
<strong>[HH:MM:SS am/pm]</strong> on <a><strong>[Day], [date]</strong></a>.
```

Styling rules:
- "Good morning," and "Ethan." → bold (not italic)
- Temperature number → underlined link, ° bold only (not linked)
- "with [description]" → light (not linked)
- Location → bold + underlined link (full state names, never abbreviated)
- Time → bold (not linked), lowercase am/pm
- Day + date → bold + underlined link

Link data-search values:
- Weather temp → "[City] weather today"
- Location → "[City] [State]"
- Date → "[Day] [Month] [Day#]"

Live clock: `setInterval` every second, only time portion re-renders.
Weather refresh: ~30 min via Open-Meteo.

#### Weather Codes (Open-Meteo)

| Code | Description |
|------|-------------|
| 0 | clear skies |
| 1-3 | partly cloudy skies |
| 45, 48 | foggy conditions |
| 51, 53, 56 | light drizzle |
| 55, 57 | heavy drizzle |
| 61, 66 | light rain and cloudy skies |
| 63 | rain and overcast skies |
| 65, 67 | heavy rain |
| 71, 73, 77 | light snow |
| 75 | heavy snow |
| 80-82 | rain showers |
| 85, 86 | snow showers |
| 95, 96, 99 | thunderstorms |

Date ordinals: 1,21,31→"st" | 2,22→"nd" | 3,23→"rd" | else→"th"

### Text Blocks (4, single column stacked)

4 informational text blocks stacked vertically. No card chrome.
Each prefixed with `(1)`, `(2)`, etc. in neutral-400.

Rules:
- 2–3 sentences, conversational
- Each block: ONE `{{source}}` reference, 2–4 `[[links]]`
- Vary source placement (patterns A–E), never consecutive same pattern
- All content must be real (from RSS or web search)
- Tone: a well-read friend catching you up

#### Source Placement Patterns

- **A** (start): `{{espn.com|ESPN}} *is reporting that*...`
- **B** (middle): `...per {{finance.yahoo.com|Yahoo Finance}}.`
- **C** (end): `...{{pitchfork.com|Pitchfork}} *is calling it*...`
- **D** (integrated): `...*just went live* on {{nike.com|Nike}}...`
- **E** (embedded): `A new deep dive from {{theverge.com|The Verge}}...`

Across 4 visible blocks, use at least 3 different patterns.

### Block Data Structure

```json
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
```

### Text Parsing Pipeline (renderer)

```js
function parseNtpText(text) {
  // 1. {{domain|Name}} → favicon + bold + underline
  // 2. [[query|text]] → underline link
  // 3. **text** → <strong>
  // 4. *text* → <em>
  return text;
}
```

### Container CSS

```css
.ntp-blocks { display: flex; flex-direction: column; gap: 32px; }
```

Animation: fade in, y 8→0, 0.3s, 60ms stagger (Motion library).

---

## Content Categories & Sources

10 categories. Sources ranked by priority (higher = more frequent).
(R) = RSS, (W) = web search.

### 1. Tech
1. The Verge — theverge.com (R)
2. Wired — wired.com (R)
3. TechCrunch — techcrunch.com (R)
4. 404 Media — 404media.co (R)
5. The Information — theinformation.com (W)
6. Every.to — every.to (W)
7. Product Hunt — producthunt.com (W)
8. GitHub — github.com (W)
9. Medium — medium.com (W)

### 2. News
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

### 3. Sports
1. The Ringer — theringer.com (R)
2. ESPN — espn.com (R)
3. The Athletic — theathletic.com (R)
4. Defector — defector.com (R)
5. Bleacher Report — bleacherreport.com (R)
6. SB Nation — sbnation.com (R)

### 4. Music
1. Pitchfork — pitchfork.com (R)
2. Stereogum — stereogum.com (R)
3. Lyrical Lemonade — lyricalemonade.com (W)
4. NME — nme.com (R)
5. Resident Advisor — ra.co (W)
6. Spotify — open.spotify.com (W)
7. Apple Music — music.apple.com (W)

### 5. Entertainment
1. A24 — a24films.com (W)
2. Letterboxd — letterboxd.com (W)
3. IGN — ign.com (R)
4. Netflix — netflix.com (W)
5. Apple TV+ — tv.apple.com (W)
6. YouTube — youtube.com (W)
7. Steam — store.steampowered.com (W)

### 6. Finance
1. Bloomberg — bloomberg.com (R)
2. Morning Brew — morningbrew.com (R)
3. Sherwood — sherwood.news (R)
4. Forbes — forbes.com (R)
5. Yahoo Finance — finance.yahoo.com (R)
6. CoinDesk — coindesk.com (R)
7. Blockworks — blockworks.co (R)
8. The Motley Fool — fool.com (R)
9. Inc — inc.com (R)

### 7. Style
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

### 8. Food
1. Eater — eater.com (R)
2. The Infatuation — theinfatuation.com (W)
3. Bon Appétit — bonappetit.com (W)
4. NYT Cooking — cooking.nytimes.com (W)
5. Taste Cooking — tastecooking.com (W)

### 9. Science
1. NASA — nasa.gov (R)
2. MIT Technology Review — technologyreview.com (R)
3. Nature — nature.com (R)
4. New Scientist — newscientist.com (R)
5. Scientific American — scientificamerican.com (R)

### 10. Design
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

Categories toggled in Settings (`localStorage` key `card_categories`). Default: all enabled.

---

## Batch Generation Pipeline

Runs in Electron main process (`cards-batch.js`). Renderer never makes API calls.

### Schedule

- On app launch: if pool has <4 blocks → run one batch
- Pool stored at: `app.getPath('userData') + '/cards-pool.json'`

### Step 1 — Check Pool

If pool exists AND has ≥4 unused blocks → skip batch.

### Step 2 — Fetch RSS (parallel, free)

`Promise.allSettled()` + `rss-parser`. 3–5 most recent per feed.
Only fetch for user's enabled categories. Skip failed feeds.

#### RSS Feed URLs

**Tech:** theverge.com/rss/index.xml, wired.com/feed/rss, techcrunch.com/feed/, 404media.co/rss/

**News:** rss.nytimes.com/services/xml/rss/nyt/HomePage.xml, newyorker.com/feed/everything, theatlantic.com/feed/all/, vox.com/rss/index.xml, theguardian.com/world/rss, feeds.reuters.com/reuters/topNews, feeds.apnews.com/apnews/headlines, feeds.bbci.co.uk/news/rss.xml, api.axios.com/feed/, feeds.washingtonpost.com/rss/national, restofworld.org/feed/

**Sports:** theringer.com/rss/index.xml, espn.com/espn/rss/news, theathletic.com/feeds/rss/news/, defector.com/feed, bleacherreport.com/articles/feed, sbnation.com/rss/index.xml

**Music:** pitchfork.com/feed/feed-news/rss, stereogum.com/feed/, nme.com/feed

**Entertainment:** ign.com/articles/feed

**Finance:** bloomberg.com/feed/podcast/etf-iq.xml, morningbrew.com/feed, sherwood.news/feed/, forbes.com/real-time/feed2/, feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC&region=US&lang=en-US, coindesk.com/arc/outboundfeeds/rss/, blockworks.co/feed, fool.com/feeds/index.aspx, inc.com/rss

**Style:** highsnobiety.com/feed/, hypebeast.com/feed, gq.com/feed/rss

**Food:** eater.com/rss/index.xml

**Science:** nasa.gov/news-release/feed/, technologyreview.com/feed/, nature.com/nature.rss, newscientist.com/feed/home/, rss.sciam.com/ScientificAmerican-Global

**Design:** itsnicethat.com/rss, dezeen.com/feed/, curbed.com/rss/index.xml, thisiscolossal.com/feed/, eyeondesign.aiga.org/feed/, creativeboom.com/feed/, designboom.com/feed/, dribbble.com/stories.rss

### Step 3 — AI Call #1: RSS Summarization

Single AI call. Reformats RSS data into 20 styled text blocks with full
typographic markup. No web search. max_tokens 6000, temperature 0.7.

### Step 4 — AI Call #2: Web Search Sources

AI call with web search enabled. 15 text blocks from non-RSS sources.
max_tokens 4000, temperature 0.7.

### Step 5 — Merge & Save

Parse both responses, merge (~35 blocks), add id/favicon/used/read fields,
shuffle for category variety, save to pool file, notify renderer via
`mainWindow.webContents.send('blocks:ready')`.

### Step 6 — Error Handling

- RSS partially fails → continue with rest
- Call #1 fails → retry once after 5s
- Call #2 fails → save call #1 results only
- Both fail → `blocks:error`, keep old pool
- JSON parse fails → strip fences, retry parse; if fails, retry API
- No API key → skip batch, renderer shows setup fallback

### Pool Exhaustion

All blocks used → "All caught up — check back later." Wait for next batch.

### Cost Estimate

Per batch: RSS free, Call #1 ~$0.015, Call #2 ~$0.02.
Per day (~2 batches): $0.03–0.07.

---

## Settings

Entry point: ⋯ button (far right of toolbar).

### Bookmarks (toolbar)

Up to 8 bookmark favicon buttons in toolbar.
- Click → navigate to URL
- Right-click → context menu (edit, remove, reorder)
- Storage: `localStorage` key `toolbar_bookmarks` (JSON array of {url, title})

### Settings Fields

- **Provider & API Key** — AI provider configuration
- **Model** — AI model selection
- **Categories** — Toggle 10 content categories (localStorage `card_categories`)
- **Color** — 12 theme color swatches (4×3 or 6×2 grid, preview = 300 shade)
- **Appearance** — Light / Dark mode toggle
- **Search Engine** — Google, DuckDuckGo, Bing, Brave, Ecosia
- **Feed** — gap: 32px, label weight: 300, line-height: 32px

### Settings CSS

```css
.settings-feed { gap: 32px; }
.settings-field-label { font-weight: 300; line-height: 32px; }
```

---

## Animations & Interactions

### Easing System

All animations use **ease-out-quint** — a single, consistent curve across CSS and JS.

```
CSS:  cubic-bezier(0.22, 1, 0.36, 1)
JS:   [0.22, 1, 0.36, 1]
```

No scale/size transforms on any interaction. Hover, active, and selected states use only opacity, color, background, and border changes.

### Motion Library (motion.dev v11)

Loaded via CDN. Utilities in `js/motion.js`:

```js
motion.fadeIn(el, duration)      // opacity 0→1
motion.fadeOut(el, duration)     // opacity 1→0
motion.slideInRight(el, duration) // x 300→0 + fade in
motion.slideOutRight(el, duration) // x 0→300 + fade out
motion.slideInUp(el, duration)   // y 8→0 + fade in
motion.slideOutDown(el, duration) // y 0→8 + fade out
```

### CSS Transition Durations

| Speed | Duration | Usage |
|-------|----------|-------|
| Fast | 0.1s | Search suggestions, inline feedback |
| Normal | 0.15s | Hover on/off, border, background transitions |
| Medium | 0.2s | Color transitions, text color changes |
| Slow | 0.25s | Fade in/out, slide in/out |

### Content Animations (JS)

| Animation | Properties | Duration | Stagger |
|-----------|-----------|----------|---------|
| Text block load | opacity 0→1 | 0.3s | — |
| Card entrance | opacity 0→1, y 12→0 | 0.3s | — |
| More cards load | opacity 0→1, y 12→0 | 0.35s | — |
| Tab close | opacity 1→0, width→0 | 0.15s | — |
| Tab divider fade | opacity 1→0 | 0.1s | — |
| NTP ↔ webview | opacity crossfade | 0.15–0.2s | — |
| Settings panel | opacity 0→1, y 8→0 | 0.2s | — |
| Settings close | opacity 1→0, y 0→4 | 0.25s | — |

---

## All Browser Interactions

### Tab Strip

| Element | Interaction | Visual Feedback |
|---------|------------|-----------------|
| Tab | Hover | Background → neutral/150 |
| Tab | Click | Set active. Background → white, border → neutral/200 |
| Tab | Middle-click | Close tab (animated collapse) |
| Tab | Right-click | Context menu (New Tab, Duplicate, Close, Close Others) |
| Tab | Drag | Reorder tabs via drag and drop |
| Tab close button | Hover | Background → neutral/150, border → neutral/200 |
| Tab close button | Click | Close tab (animated collapse) |
| Tab divider | — | Auto-hidden adjacent to active/hovered tabs |
| New tab button | Click | Create new tab |
| Tab strip empty area | Double-click | Create new tab |
| Settings button (⋯) | Hover | Background → neutral/150, border → neutral/200 |
| Settings button (⋯) | Click | Toggle settings panel |

### Toolbar / Navigation

| Element | Interaction | Visual Feedback |
|---------|------------|-----------------|
| Back button | Hover | Background → neutral/150, border → neutral/200 |
| Back button | Click | Navigate back in history |
| Forward button | Hover | Background → neutral/150, border → neutral/200 |
| Forward button | Click | Navigate forward in history |
| Reload button | Click | Reload current page |
| Bookmark favicons | Hover | Background → neutral/150, border → neutral/200 |
| Bookmark favicons | Click | Navigate to bookmarked URL |
| Bookmark favicons | Right-click | Context menu (Edit, Remove, Reorder) |
| Bookmark favicons | Drag | Reorder bookmarks via drag and drop |
| Add bookmark button | Click | Open add favorite dialog |

### Search Bar (Toolbar)

| Element | Interaction | Visual Feedback |
|---------|------------|-----------------|
| Search bar | Hover | Background → neutral/150, border → white |
| Search bar | Focus | Background → white, border → neutral/300 |
| Search bar input | Type | Show search suggestions dropdown |
| Search bar input | Enter | Navigate to URL or search |
| Search bar input | Arrow Up/Down | Navigate suggestions |
| Search bar input | Escape | Close suggestions |
| Search bar icon button | Hover | Background highlight |
| Suggestion item | Hover | Background → muted |
| Suggestion item | Click | Navigate to suggestion |

### Bottom Search Bar (NTP)

| Element | Interaction | Visual Feedback |
|---------|------------|-----------------|
| Bottom search bar | Hover | Border → neutral/200 |
| Bottom search bar | Focus | Border → neutral/300 |
| Bottom search input | Type | Toggle submit button active state |
| Bottom search input | Enter | Search with selected engine |
| Search engine selector | Click | Cycle through engines |
| Submit button | Hover (active) | Background → neutral/700 |
| Submit button | Click (active) | Execute search |
| Submit button | Pressed (active) | Background → neutral/900 |

### New Tab Page (NTP)

| Element | Interaction | Visual Feedback |
|---------|------------|-----------------|
| NTP greeting links | Hover | Color → neutral/800 |
| NTP greeting links | Click | Search for linked topic |
| NTP text block | Hover | Text color → neutral/800 |
| NTP text block | Click | Search for block topic |
| NTP inline link | Hover | Color → neutral/800, underline darkens |
| NTP inline link | Click | Search for link text |
| NTP source reference | Hover | Color change |
| NTP source reference | Click | Navigate to source URL |
| NTP block number | Hover (parent) | Color change |
| NTP favorite button | Hover | Background → neutral/150, border → neutral/200 |
| NTP favorite button | Click | Navigate to favorite URL |
| NTP icon button | Hover | Background → neutral/150, border → neutral/200 |
| NTP icon button | Click | Execute associated action |

### Content Cards (Feed)

| Element | Interaction | Visual Feedback |
|---------|------------|-----------------|
| Feed card (chat-card) | Hover | Headline text → fg-default |
| Feed card (chat-card) | Click | Resume conversation / navigate |
| Feed card (chat-card) | Right-click | Context menu (Delete) |
| Feed card (read state) | — | Opacity → 0.55 |
| Feed card (read, hover) | Hover | Opacity → 0.8 |
| Card (bordered) | Hover | Border → border-hover |
| Card (bordered) | Active | Border → border-selected |
| More stories button | Hover | Background → neutral/200, color → neutral/600 |
| More stories button | Click | Load more feed cards |
| More stories button (active) | Active | Background → neutral/200, color → neutral/800 |

### Widget Cards

| Element | Interaction | Visual Feedback |
|---------|------------|-----------------|
| Widget card | Hover | Border → border-hover |
| Widget card | Active | Border → border-selected |
| Widget settings button | Hover (parent) | Opacity → 1 (revealed) |
| Widget settings button | Hover | Background highlight |
| Widget settings button | Click | Show widget context menu |
| Quicklink item | Hover | Background → bg-hover |
| Quicklink item | Click | Navigate to quicklink URL |
| Add widget button | Hover | Border → border-hover |
| Add widget button | Click | Open widget picker modal |
| Widget picker item | Hover | Background highlight |
| Widget picker item | Click | Add widget |

### Settings Panel

| Element | Interaction | Visual Feedback |
|---------|------------|-----------------|
| Settings tab buttons | Hover | Background → neutral/150, border → neutral/200 |
| Settings tab buttons | Click | Switch settings section |
| Settings tab buttons (active) | — | Background → shell, border → neutral/200 |
| Theme color swatches | Click | Change theme color |
| Theme color swatches (selected) | — | Border highlight |
| Character avatars | Click | Change greeting character |
| Light/Dark toggle | Click | Switch appearance mode |
| Search engine dropdown | Click | Open/change search engine |
| Settings dropdown trigger | Hover | Border → border-hover |
| Settings dropdown trigger | Click | Open dropdown |
| Settings dropdown item | Hover | Background highlight |
| Settings dropdown item | Click | Select option |
| Location trigger | Hover | Border → border-hover |
| Location trigger | Click | Open location picker |
| Location item | Hover | Background highlight |
| Location item | Click | Set location |
| New profile button | Hover | Background → neutral/150 |
| New profile button | Click | Create new profile |
| Profile dropdown trigger | Click | Toggle profile dropdown |
| Profile dropdown item | Click | Switch profile |
| Delete profile button | Click | Delete current profile |
| Toggle switches | Click | Toggle on/off, knob slides |
| Accent color options | Hover | Border → border-hover |
| Accent color options | Click | Set accent color |
| Interest tags | Click | Toggle interest on/off |
| Export data button | Click | Export user data as JSON |
| Import data button | Click | Import user data from file |
| Clear data button | Click | Clear all browsing data |
| Close button (×) | Hover | Background → bg-hover |
| Close button (×) | Click | Close settings |
| Escape key | — | Close settings |
| Overlay click | — | Close settings |

### Favorite Dialog

| Element | Interaction | Visual Feedback |
|---------|------------|-----------------|
| Name input | Hover | Border → border-hover |
| Name input | Focus | Border → neutral/300 |
| URL input | Hover | Border → border-hover |
| URL input | Focus | Border → neutral/300 |
| Favicon picker item | Hover | Border → border-hover |
| Favicon picker item | Click | Select favicon |
| Cancel button | Hover | Border → border-hover |
| Cancel button | Click | Close dialog |
| Save button | Hover | Background → brand-hover |
| Save button | Click | Save favorite |
| Overlay click | — | Close dialog |

### Context Menus

| Element | Interaction | Visual Feedback |
|---------|------------|-----------------|
| Menu item | Hover | Background → bg-hover |
| Menu item | Click | Execute action, close menu |
| Menu (outside click) | Click | Close menu |
| Escape key | — | Close menu |

### Modals

| Element | Interaction | Visual Feedback |
|---------|------------|-----------------|
| Modal close button | Hover | Background → bg-hover |
| Modal close button | Click | Close modal |
| Modal overlay | Click | Close modal |
| Escape key | — | Close modal |
| Primary button | Hover | Background → brand-hover |
| Secondary button | Hover | Background highlight |

### Webview

| Element | Interaction | Visual Feedback |
|---------|------------|-----------------|
| Webview | Load start | Loading progress bar appears |
| Webview | Load complete | Progress bar fades out |
| Webview | Navigation | URL bar updates, favicon updates |
| Webview | Title change | Tab title updates |
| Webview | Certificate error | Error page shown |
| Webview | Load failure | Error page with retry button |
| Error retry button | Hover | Background highlight |
| Error retry button | Click | Retry navigation |

### Find in Page

| Element | Interaction | Visual Feedback |
|---------|------------|-----------------|
| Find input | Type | Live search results count |
| Find input | Enter | Find next match |
| Find input | Shift+Enter | Find previous match |
| Find prev button | Hover | Background → bg-hover |
| Find prev button | Click | Navigate to previous match |
| Find next button | Hover | Background → bg-hover |
| Find next button | Click | Navigate to next match |
| Find close button | Hover | Background → bg-hover |
| Find close button | Click | Close find bar |

### Split View

| Element | Interaction | Visual Feedback |
|---------|------------|-----------------|
| Resize handle | Hover | Pill appears (opacity 0→1), bg → neutral/100 |
| Resize handle | Drag | Pill stays visible, bg → neutral/200, border → selected |
| Split pane | Click | Focus pane (updates toolbar context) |

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+T | New tab |
| Cmd+W | Close tab |
| Cmd+L | Focus URL bar |
| Cmd+K | Focus bottom search bar |
| Cmd+[ / ] | Back / Forward |
| Cmd+R | Refresh |
| Cmd+1–8 | Switch to tab by index |
| Cmd+, | Open settings |
| Cmd+F | Find in page |
| Escape | Close modals, settings, find bar |

### Scrollbar (Custom)

| Element | Interaction | Visual Feedback |
|---------|------------|-----------------|
| Scrollbar thumb | Hover | Darkened thumb color |
| Scrollbar thumb | Drag | Scroll content |
