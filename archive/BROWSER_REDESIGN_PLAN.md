# Browser Redesign — Phased Implementation Plan

Reference: Figma file `Cards` → node `88240-9125`

This document covers every change needed to go from the current
browser design (Image 1) to the new Figma design (Image 2).
Execute phases in order — later phases depend on earlier ones.

---

## What's Changing (Summary)

| Area | Current (Image 1) | New Figma (Image 2) |
|---|---|---|
| Tab system | Sidebar tab in top-left, single label | Horizontal tab strip, Chrome-style |
| Toolbar | Back, forward, refresh, search bar, heart icon | Back, forward, refresh, search bar, up to 8 bookmark favicons, settings (⋯) |
| Typeface | System font / SF Pro | Georgia Pro (serif) |
| NTP typography | ~17px body text | ~22-24px body text, larger greeting |
| NTP layout | Greeting + 4 text blocks, 2×2 grid | Greeting + 4 text blocks, single column stacked |
| Bottom bar | AI chat (model selector, conversation, send) | Search-only input (search engine selector, search icon) |
| Colors | Same 12-color system | Same system, component color pass needed |

---

## Phase 1 — Layout: Sidebar → Horizontal Tabs

**Priority: HIGH — affects all other phases**
**Estimated scope: Large**

The vertical sidebar is removed entirely. Tabs move to a horizontal
strip at the very top of the window, integrated with the toolbar row.

### 1.1 Remove Sidebar

DELETE all sidebar-related code:

- CSS: Remove all `.sidebar`, `.sidebar-tab`, `.sidebar-*` rules
- CSS: Remove `--sidebar-width`, `--sidebar-padding`, `--sidebar-gap`,
  `--sidebar-tab-padding`, `--sidebar-tab-radius` tokens
- HTML: Remove the entire `<aside class="sidebar">` element
- JS: Remove sidebar toggle logic, sidebar tab click handlers,
  sidebar resize/drag behavior (if any)

### 1.2 New Layout Structure

Current:
```
┌──────────────────────────────────────┐
│ [sidebar] │ [toolbar + search bar]   │
│           │ [webview / NTP content]  │
│           │ [bottom chat bar]        │
└──────────────────────────────────────┘
```

New:
```
┌──────────────────────────────────────┐
│ [tab strip]                          │
│ [toolbar: ← → ↻ | search | favicons | ⋯] │
│ [webview / NTP content]              │
│ [bottom search bar]                  │
└──────────────────────────────────────┘
```

Update the main layout container:
- Remove `display: grid` / `flex` with sidebar column
- Full-width single column: tab strip → toolbar → content → bottom bar
- Content area takes 100% width (no sidebar offset)

### 1.3 Build Horizontal Tab Strip

Based on Image 2, tabs appear as small pill-shaped items with a
favicon and close button, laid out horizontally.

HTML structure:
```html
<div class="tab-strip">
  <div class="tab active" data-tab-id="1">
    <img class="tab-favicon" src="..." alt="">
    <span class="tab-title">New tab</span>
    <button class="tab-close sf-icon sf-icon-sm">✕</button>
  </div>
  <div class="tab" data-tab-id="2">
    <img class="tab-favicon" src="..." alt="">
    <span class="tab-title">Tab</span>
    <button class="tab-close sf-icon sf-icon-sm">✕</button>
  </div>
  <button class="tab-new sf-icon">+</button>
</div>
```

CSS tokens to add:
```css
--tabstrip-height: 36px;
--tabstrip-padding: 4px;
--tabstrip-tab-padding: 6px 10px;
--tabstrip-tab-radius: 8px;
--tabstrip-tab-gap: 2px;
--tabstrip-tab-max-width: 200px;
--tabstrip-tab-min-width: 48px;
```

Behavior:
- Active tab: slightly elevated background
- Inactive tabs: transparent background, subtle text
- Tab overflow: tabs shrink to min-width, then scroll
- New tab button (+) always visible at end of strip
- Click tab → switch webview
- Middle-click tab → close
- Double-click empty area → new tab
- macOS traffic lights: account for window controls offset on left

### 1.4 Window Drag Region

With the sidebar gone, the tab strip area becomes the drag region.
Add `-webkit-app-region: drag` to the tab strip background, and
`-webkit-app-region: no-drag` on individual tabs and buttons.

### 1.5 Update CSS Token Cleanup

Remove tokens:
- `--sidebar-width`
- `--sidebar-padding`
- `--sidebar-gap`
- `--sidebar-tab-padding`
- `--sidebar-tab-radius`

Add tokens:
- All `--tabstrip-*` tokens listed above

---

## Phase 2 — Toolbar Redesign

**Priority: HIGH**
**Estimated scope: Medium**

### 2.1 Current Toolbar Elements (to remove/change)

Remove:
- Tab description label (top-left of toolbar)
- Split view / stack view buttons (□ ⊞ icons)
- Heart/favorites button (far right)
- Any AI-related toolbar buttons

### 2.2 New Toolbar Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  ← → ↻  │  [search bar ─────────────────]  │ 🔖🔖🔖🔖🔖🔖🔖🔖 │ ⋯ │
└─────────────────────────────────────────────────────────────────┘
```

Left cluster: Back, Forward, Refresh — existing buttons, keep styling
Center: Search/URL bar — existing component, stretches to fill
Right cluster: Up to 8 bookmark favicon buttons + settings button

### 2.3 Bookmark Favicon Buttons

New feature: users can pin up to 8 websites as quick-access buttons
displayed as small favicon circles in the toolbar.

HTML:
```html
<div class="toolbar-bookmarks">
  <button class="bookmark-btn" data-url="https://linkedin.com" title="LinkedIn">
    <img class="bookmark-favicon"
      src="https://www.google.com/s2/favicons?domain=linkedin.com&sz=32" alt="">
  </button>
  <!-- ...up to 8 -->
</div>
```

CSS tokens:
```css
--bookmark-btn-size: 28px;
--bookmark-favicon-size: 20px;
--bookmark-btn-radius: 8px;
--bookmark-btn-gap: 4px;
```

Behavior:
- Click → navigate active tab to that URL
- Right-click → context menu (Edit URL, Remove, Move left/right)
- Drag to reorder
- If < 8 bookmarks, show subtle "+" add button
- Storage: `localStorage` key `toolbar_bookmarks` (JSON array of {url, title})

Settings integration:
- Settings panel gets a "Bookmarks" section for add/edit/remove/reorder

### 2.4 Settings Button (⋯)

Replaces previous settings entry point.
- Icon: three horizontal dots (⋯)
- Click → opens settings panel/modal
- Position: far right of toolbar

### 2.5 Remove Old Toolbar Elements

- Remove `.tab-description` label and its JS
- Remove split/stack view buttons and their JS
- Remove heart/favorites button and its JS

---

## Phase 3 — Typography & Typeface

**Priority: HIGH**
**Estimated scope: Small-Medium**

### 3.1 Georgia Pro as Default Typeface

```css
:root {
  --font-family-body: 'Georgia Pro', 'Georgia', 'Times New Roman', serif;
  --font-family-ui: -apple-system, BlinkMacSystemFont, 'SF Pro', system-ui, sans-serif;
}
```

Where each is used:
- `--font-family-body`: NTP greeting, text blocks, search bar placeholder,
  any content-facing text
- `--font-family-ui`: Tab strip labels, toolbar buttons, settings UI,
  bottom search bar placeholder — keep sans-serif for chrome/UI elements

### 3.2 NTP Typography Scale

```css
--ntp-greeting-size: 28px;
--ntp-greeting-weight: 400;
--ntp-greeting-line-height: 1.3;

--ntp-body-size: 22px;
--ntp-body-weight: 400;
--ntp-body-line-height: 1.55;

--ntp-refresh-size: 14px;
--ntp-refresh-weight: 400;
```

Apply:
```css
.ntp-greeting-name {
  font-family: var(--font-family-body);
  font-size: var(--ntp-greeting-size);
  line-height: var(--ntp-greeting-line-height);
}

.ntp-summary,
.ntp-block-text {
  font-family: var(--font-family-body);
  font-size: var(--ntp-body-size);
  line-height: var(--ntp-body-line-height);
}
```

### 3.3 NTP Content Width

Text column narrows to ~680-720px for better readability at larger sizes.

```css
--content-max-width: 720px;   /* was 860px */
```

### 3.4 Font Loading

Option A (preferred): Bundle Georgia Pro in the Electron app
- Place in `assets/fonts/`
- Register with `@font-face`

Option B (fallback): Rely on system Georgia
- Ships with macOS and Windows
- Acceptable fallback

---

## Phase 4 — NTP Layout: Grid → Single Column

**Priority: MEDIUM**
**Estimated scope: Small**

### 4.1 Current Layout
```
[Greeting]
[Block 1] [Block 2]
[Block 3] [Block 4]
[Refresh]
```

### 4.2 New Layout (from Figma)
```
Good morning, 🐻 Ethan

It is currently 68° with light rain in Los Angeles,
California, where the local time is 8:35:15 am on
Wednesday, February 14th.

[Text block 1 — full width paragraph]

[Text block 2 — full width paragraph]

[Text block 3 — full width paragraph]

[Text block 4 — full width paragraph]
```

2×2 grid is gone. Text blocks stack vertically as full-width
paragraphs. Matches the editorial feel of Georgia Pro.

### 4.3 CSS Changes

Remove:
```css
.ntp-blocks {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
```

Replace with:
```css
.ntp-blocks {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.ntp-block {
  width: 100%;
}
```

### 4.4 Greeting Sentence Structure Update

Current: "It is currently [weather] at [time] on [day], [date] in [location]."
New: "It is currently [weather] in [location], where the local time is [time] on [day], [date]."

Note: lowercase am/pm (was uppercase AM/PM).

Update renderer sentence builder + BUILD_NTP_CONTENT.md.

---

## Phase 5 — Bottom Bar: AI Chat → Search Input

**Priority: HIGH**
**Estimated scope: Medium**

### 5.1 Remove AI Chat

Delete:
- Model selector dropdown
- Conversation history / message rendering
- AI send button / streaming handler
- File attachment button (+)
- All AI API connection logic from renderer
- AI-related IPC channels (keep `blocksAPI` for NTP content)

### 5.2 New Search Bar

```html
<div class="search-bar-container">
  <div class="search-bar">
    <input class="search-input" type="text"
      placeholder="Ask me anything" autocomplete="off">
    <div class="search-bar-actions">
      <button class="search-engine-selector">
        <img class="search-engine-icon" src="..." alt="">
        <span class="sf-icon sf-icon-sm">▾</span>
      </button>
      <button class="search-submit sf-icon">🔍</button>
    </div>
  </div>
</div>
```

### 5.3 Search Engine Selector

Dropdown options:
- Google (default)
- DuckDuckGo
- Bing
- Brave Search
- Ecosia

Store in `localStorage` key `search_engine`.

```javascript
const SEARCH_ENGINES = {
  google:     'https://www.google.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  bing:       'https://www.bing.com/search?q=',
  brave:      'https://search.brave.com/search?q=',
  ecosia:     'https://www.ecosia.org/search?q=',
};
```

### 5.4 Search Behavior

- Enter / click search icon → navigate active tab to search results
- If input looks like a URL (has `.` and no spaces) → navigate directly
- Escape → clear and blur
- Cmd/Ctrl+K → focus search bar (global shortcut)

### 5.5 CSS Token Updates

```css
--search-bar-max-width: 600px;
--search-bar-padding: 12px;
--search-bar-radius: 24px;
```

Remove all `--chat-*` tokens and `.chat-*` CSS rules.

### 5.6 JS Cleanup

Remove:
- AI API call logic in renderer
- Conversation state management
- Message bubble rendering
- Model switching logic
- AI streaming response handlers

Keep:
- `blocksAPI` IPC bridge (NTP text blocks)
- `cards-batch.js` main process (batch generation)

---

## Phase 6 — Color Pass

**Priority: LOW**
**Estimated scope: Small**

The 12-color theme system stays. Audit every new/updated component
to ensure correct token usage.

### 6.1 Audit Checklist

**Tab strip:**
- [ ] Active tab bg → `--color-bg-surface` or `--color-100`
- [ ] Inactive tab text → `--color-fg-secondary`
- [ ] Active tab text → `--color-fg-default`
- [ ] Tab strip bg → `--color-bg-default`
- [ ] Tab close button → `--color-fg-tertiary`

**Toolbar:**
- [ ] Background → `--color-bg-default`
- [ ] Bottom border → `--color-border-subtle`
- [ ] Nav buttons → `--color-fg-secondary`
- [ ] Search bar bg → `--color-bg-subtle`
- [ ] Search bar border → `--color-border-subtle`
- [ ] Bookmark buttons → transparent bg

**NTP:**
- [ ] Page background → `--color-bg-default`
- [ ] Greeting text → `--color-fg-default`
- [ ] Body text → `--color-fg-secondary`
- [ ] Links → `color: inherit`, underline `--color-border-default`
- [ ] Refresh text → `--color-fg-tertiary`

**Bottom search bar:**
- [ ] Container bg → `--color-bg-surface`
- [ ] Container shadow → `--shadow-chat`
- [ ] Input text → `--color-fg-default`
- [ ] Placeholder → `--color-fg-tertiary`

### 6.2 White Shift

If `--color-100` now maps to pure white (was tinted gray), update
any component backgrounds that should be white:
```css
--color-bg-default: var(--color-100);
```

---

## Phase 7 — Cleanup & Polish

**Priority: LOW**
**Estimated scope: Small**

### 7.1 Remove Dead Code
- [ ] Unused CSS (sidebar, old cards, chat messages)
- [ ] Unused JS modules (AI chat, sidebar toggle)
- [ ] Unused HTML elements
- [ ] Unused CSS tokens
- [ ] Debug console.log statements

### 7.2 Animations (Motion library)
- Tab switching: crossfade
- Text block load: fade in + y 8→0, 0.3s, 60ms stagger
- Search bar focus: subtle shadow transition
- Bookmark reorder: spring animation

### 7.3 Keyboard Shortcuts (verify still work)
- Cmd+T → new tab
- Cmd+W → close tab
- Cmd+L → focus URL bar (toolbar)
- Cmd+K → focus bottom search bar
- Cmd+[ / ] → back / forward
- Cmd+R → refresh
- Cmd+1-8 → switch to tab by index
- Cmd+, → open settings

### 7.4 Responsive Behavior
- Narrow window: tabs shrink, bookmarks overflow hidden
- Very narrow: hide tab titles, show favicons only
- Min window width: ~480px

---

## Execution Order

```
Phase 1 (Layout)          ████████████████  ← First, biggest
Phase 2 (Toolbar)         ████████████      ← Depends on Phase 1
Phase 3 (Typography)      ████████          ← Can parallel Phase 2
Phase 4 (NTP Layout)      ██████            ← After Phase 3
Phase 5 (Bottom Bar)      ████████████      ← Can parallel Phase 2
Phase 6 (Color Pass)      ████              ← After everything built
Phase 7 (Cleanup)         ████              ← Last
```

---

## Files Affected

| File | Phases |
|---|---|
| `index.html` | 1, 2, 4, 5 |
| CSS (`<style>` or `.css`) | 1, 2, 3, 4, 5, 6 |
| `js/sidebar.js` | 1 (DELETE) |
| `js/tabs.js` | 1 (REWRITE) |
| `js/toolbar.js` | 2 |
| `js/bookmarks.js` | 2 (NEW) |
| `js/blocks-service.js` | 4 |
| `js/chat.js` | 5 (DELETE) |
| `js/search-bar.js` | 5 (NEW) |
| `preload.js` | 5 (remove AI bridge) |
| `main.js` | 5 (remove AI chat IPC) |
| `BUILD_NTP_CONTENT.md` | 4 (update greeting template) |

---

## What Does NOT Change

- NTP text block content system (batch generation, RSS, web search)
- `blocksAPI` IPC bridge
- `cards-batch.js` main process logic
- 12-color theme system (structure stays, just color pass)
- Settings panel content (entry point moves to ⋯ button)
- Inline link / source favicon behavior
- `parseNtpText()` function
- Pool file structure
- Category system
