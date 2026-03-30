# Browser Functionality Plan

**Figma**: `@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev`

> Make every UI element functional. The design is complete - now wire it all up.

---

## ⚠️ CRITICAL: Preserve UI

**DO NOT modify any visual styles, layouts, or interaction patterns.**

### Rules:
1. **No CSS changes** - Do not modify colors, spacing, sizes, fonts, or any visual properties
2. **No HTML structure changes** - Do not add, remove, or rearrange elements
3. **No new UI elements** - Do not add buttons, icons, loaders, or any visible components
4. **Keep existing interactions** - Hover states, animations, and transitions stay exactly as they are
5. **JavaScript only** - Add functionality through JS without touching styles or markup

### If UI changes are needed:
- **STOP and ask for permission first**
- Describe what change is needed and why
- Wait for approval before proceeding

### What IS allowed:
- Adding event listeners to existing elements
- Adding/removing CSS classes that already exist (e.g., `.active`, `.hidden`, `.disabled`)
- Updating text content (e.g., tab titles, greeting text)
- Updating image sources (e.g., favicons)
- Adding data attributes for JavaScript functionality
- Using motion.js utilities for animations on interactions

---

## 🎬 Motion Requirements

**Use js/motion.js for ALL interactions. No interaction should be instant.**

| Interaction | Animation | Duration |
|-------------|-----------|----------|
| Settings pane open/close | slideInRight / slideOutRight | normal |
| Tab switch | fadeIn content | normal |
| Dropdown open/close | scaleIn / scaleOut | fast |
| Button press | scale down to 0.97 | fast |
| Card hover | lift (translateY -2px) | fast |
| New chat message | fadeIn + slideUp | normal |
| Page load in webview | fadeIn | slow |
| Sidebar expand/collapse | slideIn / slideOut | normal |
| Theme switch | crossfade | slow |

Always use the easing and duration presets from motion.js.

---

## 🎬 Motion Presets Reference

**CDN** (must be loaded in index.html):
```html
<script src="https://cdn.jsdelivr.net/npm/motion@11.18.1/dist/motion.min.js"></script>
```

**Easing:** `[0.16, 1, 0.3, 1]` — use for ALL animations

**Durations:**
- fast: `0.15` — hovers, micro-interactions
- normal: `0.25` — panels, tabs, toggles
- slow: `0.4` — page transitions, modals

**Motion utilities (from js/motion.js):**
```javascript
const { animate } = Motion
const ease = [0.16, 1, 0.3, 1]

const motion = {
  fadeIn: (el, duration = 0.25) => animate(el, { opacity: [0, 1] }, { duration, easing: ease }),
  fadeOut: (el, duration = 0.25) => animate(el, { opacity: [1, 0] }, { duration, easing: ease }),
  slideInRight: (el, duration = 0.25) => animate(el, { x: [300, 0], opacity: [0, 1] }, { duration, easing: ease }),
  slideOutRight: (el, duration = 0.25) => animate(el, { x: [0, 300], opacity: [1, 0] }, { duration, easing: ease }),
  scaleIn: (el, duration = 0.15) => animate(el, { scale: [0.95, 1], opacity: [0, 1] }, { duration, easing: ease }),
  scaleOut: (el, duration = 0.15) => animate(el, { scale: [1, 0.95], opacity: [1, 0] }, { duration, easing: ease }),
  pressDown: (el) => animate(el, { scale: 0.97 }, { duration: 0.1, easing: ease }),
  pressUp: (el) => animate(el, { scale: 1 }, { duration: 0.1, easing: ease }),
  lift: (el) => animate(el, { y: -2 }, { duration: 0.15, easing: ease }),
  drop: (el) => animate(el, { y: 0 }, { duration: 0.15, easing: ease }),
}
```

**Where to apply:**
| Interaction | Motion Function |
|-------------|-----------------|
| Settings pane open | `motion.slideInRight(el)` |
| Settings pane close | `motion.slideOutRight(el)` |
| Tab switch | `motion.fadeIn(el)` |
| Dropdown open | `motion.scaleIn(el)` |
| Dropdown close | `motion.scaleOut(el)` |
| Button press | `motion.pressDown(el)` then `motion.pressUp(el)` |
| Card hover enter | `motion.lift(el)` |
| Card hover leave | `motion.drop(el)` |
| Page load in webview | `motion.fadeIn(el, 0.4)` |
| New chat message | `motion.fadeIn(el)` |

**Always use motion utilities. No interaction should be instant.**

### Example - Correct approach:
```javascript
// ✅ DO: Add click handler to existing button
document.querySelector('.send-btn').addEventListener('click', handleSend);

// ✅ DO: Toggle existing class
element.classList.add('active');

// ✅ DO: Update text content
document.querySelector('.greeting').textContent = 'Good morning, Ethan';
```

### Example - Incorrect approach:
```javascript
// ❌ DON'T: Add inline styles
element.style.backgroundColor = 'blue';

// ❌ DON'T: Create new elements
const loader = document.createElement('div');
loader.className = 'new-loader';

// ❌ DON'T: Modify CSS
element.style.padding = '20px';
```

---

## Phase 1: Settings Pane

### Prompt
```
Make the Settings pane fully functional.

SETTINGS TO WIRE UP:

1. NAME
   - Save to localStorage on blur/change
   - Load saved name on startup
   - Use name in greeting on new tab page ("Good morning, [Name]")

2. LOCATION
   - Save to localStorage
   - Use for weather display on new tab page
   - Optional: Use browser geolocation API to auto-detect

3. APPEARANCE (Light/Dark)
   - Toggle between light and dark CSS variables
   - Save preference to localStorage
   - Apply immediately on change
   - Respect system preference if no saved preference

4. TYPEFACE
   - Change --font-family CSS variable
   - Save to localStorage
   - Apply immediately on change

5. SEARCH ENGINE
   - Save selected engine to localStorage
   - Use when submitting searches from address bar
   - URL templates:
     - Google: https://www.google.com/search?q=
     - DuckDuckGo: https://duckduckgo.com/?q=
     - Bing: https://www.bing.com/search?q=

6. AI PROVIDER & MODEL
   - Save provider and model selection to localStorage
   - Show appropriate models based on provider
   - Use selection when making AI requests

7. API KEY
   - Save to localStorage (or more secure storage)
   - Mask input by default, toggle to show
   - Validate key format on save
   - Use key for AI API requests

All settings should persist across browser restarts.
```

---

## Phase 2: Chat/AI Functionality

### Prompt
```
Make the chat input fully functional with real AI responses.

REQUIREMENTS:

1. CHAT INPUT
   - Submit on Enter key
   - Submit on clicking send button
   - Clear input after sending
   - Disable send while waiting for response
   - Show loading state while AI is responding

2. AI API INTEGRATION
   - Read provider, model, and API key from settings
   - Build API request based on provider:
   
   ANTHROPIC:
   - Endpoint: https://api.anthropic.com/v1/messages
   - Headers: x-api-key, anthropic-version, content-type
   - Body: model, max_tokens, messages array
   
   OPENAI:
   - Endpoint: https://api.openai.com/v1/chat/completions
   - Headers: Authorization Bearer, content-type
   - Body: model, messages array

3. CONTEXT
   - Include current page content if on a webpage (extract text from webview)
   - Include page URL and title
   - Send as system message or user context

4. RESPONSE HANDLING
   - Stream responses if possible
   - Display response in chat area
   - Handle errors gracefully (show error message, don't crash)
   - If no API key set, prompt user to add one in settings

5. CONVERSATION HISTORY
   - Store messages in memory for current session
   - Display previous messages in chat area
   - Clear conversation option
   - Save conversations to localStorage (optional)

6. MODEL SELECTOR (in chat input)
   - Dropdown to quickly switch models
   - Sync with settings pane selection
```

---

## Phase 3: New Tab Page Cards

### Prompt
```
Make the new tab page cards functional.

1. GREETING
   - Show "Good morning/afternoon/evening, [Name]"
   - Use name from settings
   - Update greeting based on time of day

2. WEATHER
   - Fetch weather from API using location from settings
   - Display temperature and conditions
   - Update periodically or on page load
   - Use free API: OpenWeatherMap or WeatherAPI

3. SOURCE CARDS (Recent tabs/pages)
   - Display recently visited pages
   - Show favicon, source/domain, description/title
   - Click to open in current tab
   - Pull from browsing history stored in localStorage

4. START HERE CARDS (Suggestions/Favorites)
   - Display saved favorites or suggested sites
   - Click to navigate
   - Right-click to remove from favorites
   - Drag to reorder (optional)

5. CARD INTERACTIONS
   - Hover state (subtle highlight)
   - Click to navigate
   - Show full title on hover if truncated
```

---

## Phase 4: Tab Management

### Prompt
```
Make tab management fully functional.

1. TAB CREATION
   - New tab button creates tab and shows new tab page
   - Cmd/Ctrl+T shortcut
   - Middle-click on link opens in new tab (if possible in webview)

2. TAB SWITCHING
   - Click tab in sidebar to switch
   - Cmd/Ctrl+1-9 to switch to tab by position
   - Cmd/Ctrl+Tab to cycle tabs

3. TAB CLOSING
   - X button on tab closes it
   - Cmd/Ctrl+W closes current tab
   - Middle-click on tab closes it
   - If last tab closed, create new empty tab

4. TAB STATE
   - Each tab has its own:
     - URL
     - Title
     - Favicon
     - Scroll position
     - Navigation history (back/forward)
   - Switching tabs restores full state

5. TAB PERSISTENCE
   - Save open tabs to localStorage
   - Restore tabs on browser restart (based on settings)

6. TAB DRAGGING (optional)
   - Drag tabs to reorder in sidebar
   - Visual feedback during drag
```

---

## Phase 5: Navigation

### Prompt
```
Make browser navigation fully functional.

1. ADDRESS BAR
   - Type URL and press Enter to navigate
   - Type search query and press Enter to search (use selected search engine)
   - Detect if input is URL or search query
   - Show current page URL when not focused
   - Select all text on focus

2. BACK/FORWARD BUTTONS
   - Back button goes to previous page in tab history
   - Forward button goes to next page in tab history
   - Disable buttons when no history in that direction
   - Update button states after navigation

3. REFRESH BUTTON
   - Reload current page
   - Cmd/Ctrl+R shortcut

4. BOOKMARK BUTTON (star icon)
   - Click to add/remove current page from favorites
   - Filled star if page is bookmarked
   - Empty star if not bookmarked

5. WEBVIEW NAVIGATION EVENTS
   - Listen for navigation events from webview
   - Update URL in address bar
   - Update tab title and favicon
   - Update back/forward button states
```

---

## Phase 6: Sidebar

### Prompt
```
Make the sidebar fully functional.

1. TAB LIST
   - Display all open tabs
   - Show favicon and title for each
   - Highlight active tab
   - Click to switch tabs
   - X button to close tab

2. SEARCH TABS
   - Filter tabs by title or URL as user types
   - Show/hide tabs based on search
   - Clear search to show all

3. FAVORITES SECTION
   - Display saved favorites
   - Click to open in current tab
   - Right-click for options (open in new tab, remove)

4. NEW TAB BUTTON
   - Creates new tab
   - Shows new tab page

5. COLLAPSE/EXPAND
   - Toggle sidebar visibility
   - Remember state in localStorage
   - Keyboard shortcut to toggle
```

---

## Phase 7: Data Persistence

### Prompt
```
Implement data persistence across sessions.

SAVE TO LOCALSTORAGE:

1. SETTINGS
   - name
   - location
   - theme (light/dark)
   - typeface
   - searchEngine
   - aiProvider
   - aiModel
   - apiKey (consider encryption)

2. TABS
   - Array of open tabs
   - Each tab: id, url, title, favicon
   - Active tab id
   - Save on every tab change

3. FAVORITES
   - Array of favorites
   - Each: id, url, title, favicon, position

4. HISTORY
   - Array of visited pages
   - Each: url, title, favicon, timestamp
   - Limit to last 100 entries
   - Used for new tab page cards

5. CONVERSATIONS (optional)
   - Chat history
   - Each conversation: id, messages, timestamp

LOAD ON STARTUP:
- Load all saved data
- Apply settings (theme, typeface)
- Restore tabs or show new tab based on settings
- Populate favorites and history
```

---

## Implementation Order

| Order | Phase | Priority | Complexity |
|-------|-------|----------|------------|
| 1 | Settings Pane | High | Low |
| 2 | Navigation | High | Medium |
| 3 | Tab Management | High | Medium |
| 4 | Sidebar | Medium | Low |
| 5 | New Tab Page Cards | Medium | Medium |
| 6 | Data Persistence | High | Low |
| 7 | Chat/AI | Medium | High |

---

## Quick Start

Start with Phase 1:
```
Read FUNCTIONALITY_PLAN.md and implement Phase 1: Settings Pane.
Make all settings save to localStorage and apply immediately.
```
