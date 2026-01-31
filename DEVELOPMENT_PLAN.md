# Browser Development Plan

> **Agent Instructions**: This document serves as the master reference for developing the AI Browser application. Always reference this file at the start of each session and follow the phases in order.

---

## 🎨 Figma Design Reference (CRITICAL)

**Figma MCP Link**: `@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87743-32334&m=dev`

### Figma Parity Requirements

Before implementing ANY UI component or making visual changes:

1. **Always fetch the Figma design first** using the MCP link above
2. **Extract exact values** for:
   - Colors (use exact hex values from Figma)
   - Spacing (padding, margins, gaps in pixels)
   - Typography (font family, size, weight, line-height)
   - Border radius values
   - Shadow definitions
   - Component dimensions
3. **Match the design token naming** from `index.html` CSS variables
4. **Test visual parity** by comparing screenshots side-by-side

### Design Token Reference (from Figma)

```css
/* Colors - Neutrals */
--color-neutral-white: #ffffff;
--color-neutral-100: #fafafa;
--color-neutral-150: #f5f5f5;
--color-neutral-200: #f0f0f0;
--color-neutral-250: #e0e0e0;
--color-neutral-400: #8f8f8f;
--color-neutral-stone: #6d7176;

/* Colors - Foreground */
--color-fg-primary: #272320;
--color-fg-secondary: #6d7176;
--color-fg-tertiary: #8f8f8f;

/* Colors - Background */
--color-bg-surface: #ffffff;
--color-bg-brand: #272320;
--color-bg-hover: #fafafa;
--color-bg-active: #f0f0f0;

/* Typography */
--font-family: 'Segoe UI Variable', 'Segoe UI', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
--font-size-sm: 14px;
--font-size-base: 16px;
--font-size-md: 18px;

/* Corner Radius */
--radius-sm: 6px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--radius-2xl: 24px;
```

---

## 📋 Project Overview

### Current State
- **Working**: Vanilla JS browser UI (`index.html` + `js/`)
- **Incomplete**: React components in `src/` (all empty)
- **Limitation**: iframe-based webview (cross-origin restrictions)
- **Stub**: AI chat returns fake responses

### Target State
- Electron desktop application with real webview
- Full browser functionality (navigation, tabs, history)
- Integrated AI chat with real LLM backend
- Visual parity with Figma design

---

## 🚀 Implementation Phases

### Phase 1: Electron Foundation
**Goal**: Convert to a desktop app with real web browsing capability

#### Tasks:
- [ ] Initialize `package.json` with Electron dependencies
- [ ] Create `main.js` (Electron main process)
- [ ] Create `preload.js` for secure IPC
- [ ] Replace iframe with Electron `<webview>` or BrowserView
- [ ] Set up electron-builder for packaging
- [ ] Configure development hot-reload

#### Agent Prompt:
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87743-32334&m=dev

Set up Electron for this browser project. Requirements:
1. Initialize package.json with electron, electron-builder
2. Create main.js with BrowserWindow configuration
3. Create preload.js for secure renderer-main IPC
4. Keep the existing index.html as the renderer
5. Replace the iframe webview with Electron's <webview> tag
6. Maintain exact visual parity with the Figma design
```

#### Files to Create:
```
browser/
├── package.json          # Electron dependencies
├── main.js               # Main process
├── preload.js            # Preload script
├── electron-builder.yml  # Build configuration
└── index.html            # (modify webview section)
```

---

### Phase 2: Core Navigation
**Goal**: Implement real browser navigation

#### Tasks:
- [ ] Wire up back/forward buttons to webview
- [ ] Implement URL loading with proper error handling
- [ ] Extract page title and favicon from loaded pages
- [ ] Implement loading state indicator
- [ ] Handle navigation events (will-navigate, did-navigate)
- [ ] Implement find-in-page functionality

#### Agent Prompt:
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87743-32334&m=dev

Implement browser navigation for Electron webview:
1. Connect back/forward buttons to webview.goBack()/goForward()
2. Handle address bar URL submission -> webview.loadURL()
3. Listen to webview events: did-start-loading, did-stop-loading, did-navigate
4. Update tab title from page-title-updated event
5. Update favicon from page-favicon-updated event
6. Show loading spinner matching Figma design
7. Handle errors with user-friendly error page
```

#### Files to Modify:
```
js/ui-bindings.js   # Navigation event handlers
js/state.js         # Navigation state management
main.js             # Webview IPC handlers
```

---

### Phase 3: Tab System Enhancement
**Goal**: Full-featured tab management

#### Tasks:
- [ ] Drag-to-reorder tabs in sidebar
- [ ] Tab context menu (Close, Close Others, Duplicate, Pin)
- [ ] Tab hover preview
- [ ] Middle-click to close tab
- [ ] Pinned tabs (smaller, favicon only)
- [ ] Tab overflow handling

#### Agent Prompt:
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87743-32334&m=dev

Enhance the tab system:
1. Add drag-to-reorder using HTML5 Drag and Drop API
2. Implement right-click context menu with options:
   - Close Tab, Close Other Tabs, Close Tabs to Right
   - Duplicate Tab, Pin/Unpin Tab
3. Add tab preview tooltip on hover (show page screenshot)
4. Support middle-click on tab to close
5. Implement pinned tab state (show favicon only, fixed width)
6. Handle tab overflow with scroll or dropdown
7. Match all visual styles to Figma design exactly
```

---

### Phase 4: AI Integration
**Goal**: Connect real AI backend to chat interface

#### Tasks:
- [ ] Create AI service abstraction layer
- [ ] Implement OpenAI/Claude API integration
- [ ] Extract page content from webview for context
- [ ] Implement streaming responses
- [ ] Add conversation UI (message history display)
- [ ] Markdown rendering for AI responses

#### Agent Prompt:
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87743-32334&m=dev

Implement AI chat integration:
1. Create js/ai-service.js with provider abstraction:
   - Support OpenAI (gpt-4) and Anthropic (claude-3)
   - Environment variable for API key
   - Streaming response support
2. Modify submitChat() in state.js to call real API
3. Extract page content using webview.executeJavaScript()
4. Build conversation UI component showing message history
5. Add markdown rendering with syntax highlighting
6. Show typing indicator during AI response
7. Match chat UI exactly to Figma design
```

#### Files to Create/Modify:
```
js/ai-service.js    # New: AI provider abstraction
js/state.js         # Modify: Real AI calls
js/ui-bindings.js   # Modify: Message rendering
index.html          # Modify: Conversation display area
```

---

### Phase 5: New Tab Page ✅
**Goal**: Fully functional new tab page with dynamic content

#### Tasks:
- [x] Real favorites management (add, remove, reorder)
- [x] Recent conversations with actual data
- [x] Widget system (weather, notes, etc.)
- [ ] Search suggestions in address bar
- [ ] Quick actions

#### Completed:
- Favorites drag-and-drop reordering
- Favorites context menu (open, edit, remove)
- Add/edit favorite dialog with icon picker
- Real conversations from state with metadata
- Chat card click to resume conversation
- Chat context menu with delete option
- Widget registry with Notes, Weather, Clock, Quick Links
- Widget picker modal to add/remove widgets
- Widget settings menu

#### Agent Prompt:
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87743-32334&m=dev

Complete the New Tab Page:
1. Favorites section:
   - Click favorite icon to navigate
   - Drag to reorder
   - Right-click to edit/remove
   - Add favorite dialog with custom icon
2. Chats section:
   - Display real recent conversations from state
   - Click to resume conversation
   - Show conversation summary
3. Widgets section:
   - Implement widget registry system
   - Create sample widgets (clock, notes, quick links)
   - Widget settings/customization
4. All visual elements must match Figma exactly
```

---

### Phase 6: Settings & Preferences ✅
**Goal**: User configuration panel

#### Tasks:
- [x] Settings page/modal UI
- [x] Theme selection (light/dark)
- [x] Default search engine
- [x] AI provider selection
- [x] Privacy settings
- [x] Import/export data

#### Completed:
- Full settings modal with tabbed navigation
- Appearance: Theme (light/dark/system), accent color
- Search: Default engine (Google, Bing, DuckDuckGo, Brave), suggestions toggle
- AI: Provider, model, API key (integrated with AIService)
- Privacy: Clear on exit, block trackers, DNT
- Data: Export/import JSON, clear data with checkboxes
- Dark theme CSS variables
- Settings button in toolbar
- System theme listener

#### Agent Prompt:
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87743-32334&m=dev

Implement Settings:
1. Create settings modal/page matching Figma design
2. Sections:
   - Appearance: Theme (light/dark/system), accent color
   - Search: Default search engine, suggestions toggle
   - AI: Provider selection, API key input, model preference
   - Privacy: Clear data, cookie preferences
   - Data: Export/import bookmarks and settings
3. Persist settings to localStorage and electron-store
4. Apply settings changes immediately
```

---

### Phase 7: Polish & Performance ✅
**Goal**: Production-ready application

#### Tasks:
- [x] Keyboard shortcut help overlay
- [x] Accessibility audit (ARIA labels, focus management)
- [x] Performance optimization (lazy loading, caching)
- [x] Error boundaries and crash recovery
- [x] Auto-update mechanism
- [x] Installer/DMG creation

#### Completed:
- Keyboard shortcuts help modal (Cmd/Ctrl + / or ?)
- ARIA labels on toolbar, sidebar, main content, webview
- Skip link for keyboard navigation
- Focus-visible styles for all interactive elements
- Reduced motion media query support
- High contrast mode support
- Global error handler with crash recovery UI
- Auto-updater setup with electron-updater
- Update download progress and install prompts
- package.json release/package scripts
- macOS entitlements for hardened runtime

---

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Run in development
npm run dev

# Build for production
npm run build

# Package for distribution
npm run package
```

---

## 📁 Project Structure (Target)

```
browser/
├── package.json
├── electron-builder.yml
├── main.js                 # Electron main process
├── preload.js              # Secure IPC bridge
├── index.html              # Main renderer
├── js/
│   ├── app.js              # Application entry
│   ├── state.js            # State management
│   ├── ui-bindings.js      # DOM bindings
│   ├── ai-service.js       # AI provider abstraction
│   └── settings.js         # Settings management
├── icons/                  # UI icons (SVG)
├── assets/                 # Favicon images
└── styles/                 # CSS (if extracted)
```

---

## ✅ Checklist Before Each PR

- [ ] Figma design consulted for visual changes
- [ ] Design tokens used (no hardcoded values)
- [ ] Screenshots compared for parity
- [ ] Keyboard navigation works
- [ ] No console errors
- [ ] State persists correctly
- [ ] Works on macOS and Windows

---

## 🐛 Known Issues

1. **Iframe limitations** - Current webview can't access cross-origin content
2. **AI is stubbed** - Returns fake responses
3. **React migration incomplete** - `src/` components are empty
4. **No build system** - `package.json` is empty

---

## 📚 Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [Electron Webview Tag](https://www.electronjs.org/docs/latest/api/webview-tag)
- [Figma Dev Mode](https://www.figma.com/dev-mode/)
- [OpenAI API](https://platform.openai.com/docs/api-reference)
- [Anthropic API](https://docs.anthropic.com/claude/reference)

---

*Last updated: January 2025*
