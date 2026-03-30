# UI Redesign Plan

> **Agent Instructions**: This document contains phased prompts to redesign the browser UI based on the updated Figma design. Execute each phase in order, always referencing the Figma MCP link before making changes.

---

## 🎨 NEW Figma Design Reference (CRITICAL)

**Figma MCP Link**: `@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev`

### Design System Changes

| Element | OLD | NEW |
|---------|-----|-----|
| **Icons** | Custom SVG icons in `/icons/` | SF Symbols |
| **Colors** | Previous token set | Updated color palette |
| **Typography** | Segoe UI Variable | New type styles from Figma |
| **Components** | Custom HTML/CSS | Redesigned components |

### Before Each Task

1. **Fetch the Figma design** using the MCP link above
2. **Extract the exact values** for the component you're implementing
3. **Document any new design tokens** discovered
4. **Compare old vs new** to understand what changed

---

## 📋 Redesign Phases Overview

| Phase | Focus | Priority |
|-------|-------|----------|
| 1 | Design Tokens & Variables | 🔴 Critical |
| 2 | SF Symbols Integration | 🔴 Critical |
| 3 | Button & Icon Button Components | 🟡 High |
| 4 | Toolbar Redesign | 🟡 High |
| 5 | Sidebar & Tab Items | 🟡 High |
| 6 | Search/Address Bar | 🟡 High |
| 7 | New Tab Page Components | 🟢 Medium |
| 8 | Chat Interface | 🟢 Medium |
| 9 | Cards & Widgets | 🟢 Medium |
| 10 | Final Polish & Validation | 🟢 Medium |

---

## Phase 1: Design Tokens & CSS Variables

### Goal
Extract and implement the new design tokens (colors, spacing, typography, radii) from the updated Figma design.

### Agent Prompt
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev

TASK: Extract and update design tokens from the new Figma design.

1. Fetch the Figma design and navigate to the Styles/Variables panel
2. Extract ALL color tokens and compare with existing CSS variables in index.html
3. Extract ALL typography styles (font family, sizes, weights, line heights)
4. Extract ALL spacing values used in the design
5. Extract ALL border radius values
6. Extract ALL shadow definitions

UPDATE the :root CSS variables in index.html with the new values:
- Keep the same variable naming convention (--color-*, --font-*, --space-*, --radius-*)
- Add any NEW tokens that don't exist yet
- Remove any tokens that are no longer used
- Add comments grouping tokens by category

OUTPUT: 
- Updated :root block in index.html
- List of changes (added/modified/removed tokens)
```

### Expected Output
```css
:root {
  /* ═══════════════════════════════════════════════════════════════
     DESIGN TOKENS - Updated from Figma [DATE]
     Figma: @https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev
     ═══════════════════════════════════════════════════════════════ */
  
  /* Colors - [extracted from Figma] */
  /* Typography - [extracted from Figma] */
  /* Spacing - [extracted from Figma] */
  /* Radius - [extracted from Figma] */
  /* Shadows - [extracted from Figma] */
}
```

### Checklist
- [ ] All color tokens extracted and updated
- [ ] Typography tokens match Figma exactly
- [ ] Spacing scale documented
- [ ] Border radius values updated
- [ ] Shadow definitions captured
- [ ] No hardcoded values remain in CSS

---

## Phase 2: SF Symbols Integration

### Goal
Replace all custom SVG icons with SF Symbols.

### Agent Prompt
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev

TASK: Replace custom SVG icons with SF Symbols throughout the UI.

1. Fetch the Figma design and identify ALL icons used
2. For each icon, note:
   - SF Symbol name (e.g., "chevron.right", "plus", "xmark")
   - Size used in context
   - Color/weight variant

3. Choose implementation approach:
   
   OPTION A - SF Symbols Web Font (if available):
   - Add SF Symbols font to project
   - Create CSS classes for each symbol
   
   OPTION B - SVG Sprites:
   - Download SF Symbol SVGs
   - Create sprite sheet
   - Reference via <use> tags
   
   OPTION C - Icon Component:
   - Create reusable Icon component
   - Map symbol names to inline SVGs

4. Update ALL icon references in index.html:
   - Toolbar icons (back, forward, add, panel, split, close)
   - Search bar icons (search, star)
   - Tab close icons
   - Chat input icons (attach, send)
   - New tab page icons

5. Remove old /icons/ folder SVGs that are no longer used

MAPPING TABLE (fill in from Figma):
| Old Icon | SF Symbol Name | Usage |
|----------|---------------|-------|
| Arrow Left.svg | ? | Back button |
| Arrow Right.svg | ? | Forward button |
| Add.svg | ? | New tab, Add favorite |
| Panel.svg | ? | Toggle sidebar |
| Search.svg | ? | Address bar |
| Star.svg | ? | Bookmark |
| Split.svg | ? | Split view |
| Dismiss.svg | ? | Close tab |
| Arrow Up.svg | ? | Send message |

OUTPUT:
- New icon implementation (font, sprites, or component)
- Updated index.html with new icon references
- List of SF Symbol names used
```

### Checklist
- [ ] All SF Symbol names identified from Figma
- [ ] Icon implementation approach chosen
- [ ] All toolbar icons updated
- [ ] All sidebar icons updated
- [ ] All chat icons updated
- [ ] All NTP icons updated
- [ ] Old SVG files removed (if not needed)

---

## Phase 3: Button & Icon Button Components

### Goal
Redesign button components to match new Figma styles.

### Agent Prompt
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev

TASK: Redesign button components based on new Figma design.

1. Fetch the Figma design and locate button components
2. Extract button specifications:

   ICON BUTTON (Small, Medium, Large):
   - Dimensions (width x height)
   - Border radius
   - Background color (default, hover, active, disabled)
   - Icon size within button
   - Padding/alignment
   
   TEXT BUTTON (if present):
   - Typography (font, size, weight)
   - Padding (horizontal, vertical)
   - Border radius
   - Colors for all states

3. Update CSS classes in index.html:
   - .icon-btn (base styles)
   - .icon-btn-sm (small variant)
   - .icon-btn-md (medium variant)
   - .icon-btn-lg (large variant)
   - States: :hover, :active, :disabled, :focus-visible

4. Ensure buttons use new design tokens (not hardcoded values)

5. Test all button instances in the UI

EXTRACT FROM FIGMA:
| Property | Small | Medium | Large |
|----------|-------|--------|-------|
| Height | ? | ? | ? |
| Min Width | ? | ? | ? |
| Border Radius | ? | ? | ? |
| Icon Size | ? | ? | ? |
| BG Default | ? | ? | ? |
| BG Hover | ? | ? | ? |
| BG Active | ? | ? | ? |

OUTPUT:
- Updated .icon-btn CSS classes
- Updated design token variables if needed
- Visual comparison showing old vs new
```

### Checklist
- [ ] Button dimensions match Figma exactly
- [ ] All state styles implemented (hover, active, disabled)
- [ ] Focus styles for accessibility
- [ ] Uses design tokens only
- [ ] All button sizes working

---

## Phase 4: Toolbar Redesign

### Goal
Update the main toolbar to match new Figma design.

### Agent Prompt
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev

TASK: Redesign the toolbar based on new Figma design.

1. Fetch the Figma design and locate the toolbar component
2. Extract toolbar specifications:
   - Overall height
   - Background color
   - Padding (top, right, bottom, left)
   - Gap between elements
   - Border (bottom border if any)

3. Extract toolbar sections layout:
   - LEFT: Tab indicator + Panel toggle
   - CENTER: New tab + Navigation + Address bar
   - RIGHT: Actions (split, close)

4. Measure spacing between:
   - Tab indicator and panel button
   - Navigation buttons (back/forward)
   - Address bar and surrounding elements

5. Update .toolbar CSS class
6. Update .toolbar-left, .toolbar-tab sections
7. Verify element alignment matches Figma

EXTRACT FROM FIGMA:
| Property | Value |
|----------|-------|
| Height | ? |
| Padding | ? |
| Gap | ? |
| Background | ? |
| Border Bottom | ? |

OUTPUT:
- Updated toolbar CSS
- Updated toolbar HTML structure if needed
- Screenshot comparison
```

### Checklist
- [ ] Toolbar height matches Figma
- [ ] Element spacing matches Figma
- [ ] Background and borders correct
- [ ] Responsive behavior maintained

---

## Phase 5: Sidebar & Tab Items

### Goal
Redesign sidebar and tab item components.

### Agent Prompt
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev

TASK: Redesign sidebar and tab items based on new Figma design.

1. Fetch the Figma design and locate the sidebar component
2. Extract sidebar specifications:
   - Width (expanded state)
   - Background color
   - Padding
   - Border (right border if any)

3. Extract tab item specifications:
   - Height
   - Padding (horizontal, vertical)
   - Border radius
   - Favicon size and position
   - Title typography
   - Close button size and position
   - Gap between favicon and title
   
4. Extract tab item states:
   - Default
   - Hover
   - Active/Selected
   - Loading (if different)

5. Update CSS classes:
   - .sidebar
   - .sidebar-tab-item
   - .sidebar-tab-item.active
   - .sidebar-tab-item:hover
   - .tab-item-title
   - .tab-close-btn

EXTRACT FROM FIGMA:
| Property | Default | Hover | Active |
|----------|---------|-------|--------|
| Background | ? | ? | ? |
| Border Radius | ? | ? | ? |
| Text Color | ? | ? | ? |

OUTPUT:
- Updated sidebar CSS
- Updated tab item CSS
- Updated HTML structure if needed
```

### Checklist
- [ ] Sidebar width matches Figma
- [ ] Tab item dimensions correct
- [ ] All states styled correctly
- [ ] Favicon alignment correct
- [ ] Close button positioned correctly

---

## Phase 6: Search/Address Bar

### Goal
Redesign the search/address bar component.

### Agent Prompt
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev

TASK: Redesign the search/address bar based on new Figma design.

1. Fetch the Figma design and locate the search bar component
2. Extract specifications:
   - Overall dimensions (height, min-width, flex behavior)
   - Border radius
   - Background color
   - Border style and color
   - Padding (internal)
   
3. Extract internal element specs:
   - Search icon (size, color, position)
   - Input text (typography, color, placeholder color)
   - Star/bookmark icon (size, color, position)
   - Gap between elements

4. Extract states:
   - Default (unfocused, empty)
   - Focused (with cursor)
   - With URL (showing text)
   - Hover on star icon

5. Update CSS classes:
   - .search-bar
   - .search-icon
   - .search-input
   - .search-placeholder
   - .star-icon

EXTRACT FROM FIGMA:
| Property | Value |
|----------|-------|
| Height | ? |
| Border Radius | ? |
| Background | ? |
| Border | ? |
| Padding | ? |
| Icon Size | ? |
| Input Font Size | ? |
| Placeholder Color | ? |

OUTPUT:
- Updated search bar CSS
- Updated HTML if structure changed
```

### Checklist
- [ ] Search bar dimensions match Figma
- [ ] Icon sizes and positions correct
- [ ] Typography matches Figma
- [ ] Focus state styled correctly
- [ ] Placeholder styling correct

---

## Phase 7: New Tab Page Components

### Goal
Redesign NTP sections (Favorites, Chats, Widgets).

### Agent Prompt
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev

TASK: Redesign New Tab Page components based on new Figma design.

1. Fetch the Figma design and locate the NTP components
2. For each section, extract specifications:

   SECTION HEADER:
   - Typography (font, size, weight, color)
   - Margin/spacing below

   FAVORITES ROW:
   - Favorite icon size
   - Icon border radius
   - Icon border/shadow
   - Gap between icons
   - Add button style

   CHAT CARDS:
   - Card dimensions
   - Border radius
   - Background
   - Padding
   - Header layout (favicon + name)
   - Description typography
   - Gap between cards

   WIDGET CARDS:
   - Card dimensions
   - Border radius
   - Background
   - Padding
   - Header layout
   - Content area

3. Update CSS classes:
   - .section, .section-header, .section-title
   - .favorites-row, .favorite-icon
   - .chat-card, .chat-card-header, .chat-card-description
   - .widget-card, .widget-card-header, .widget-card-content

4. Update responsive breakpoints if changed

OUTPUT:
- Updated NTP section CSS
- Updated card component CSS
- Updated HTML structure if needed
```

### Checklist
- [ ] Section headers match Figma
- [ ] Favorite icons sized correctly
- [ ] Chat cards match Figma exactly
- [ ] Widget cards match Figma exactly
- [ ] Grid layout and gaps correct
- [ ] Responsive behavior works

---

## Phase 8: Chat Interface

### Goal
Redesign the chat input and overlay.

### Agent Prompt
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev

TASK: Redesign chat interface based on new Figma design.

1. Fetch the Figma design and locate the chat input component
2. Extract specifications:

   CHAT INPUT CONTAINER:
   - Position and layout
   - Background
   - Border radius
   - Shadow
   - Padding
   - Max width

   INPUT ROW:
   - Input field height
   - Typography
   - Placeholder style
   - Border/focus state

   ACTIONS ROW:
   - Attach button style
   - Model selector style
   - Send button style
   - Gap between elements

   MODEL SELECTOR:
   - Typography
   - Chevron icon
   - Background on hover

   SEND BUTTON:
   - Size
   - Background color
   - Icon color
   - Border radius

3. Update CSS classes:
   - .chat-overlay-container
   - .chat-input-wrapper
   - .chat-input-container
   - .chat-input-row
   - .chat-text-input
   - .chat-input-actions
   - .model-selector
   - .send-btn

OUTPUT:
- Updated chat interface CSS
- Updated HTML structure if needed
```

### Checklist
- [ ] Chat container styling matches Figma
- [ ] Input field styling correct
- [ ] Model selector matches Figma
- [ ] Send button matches Figma
- [ ] Fade gradient correct

---

## Phase 9: Cards & Widgets

### Goal
Refine card components and widget system.

### Agent Prompt
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev

TASK: Refine card and widget components.

1. Fetch the Figma design and examine all card variants
2. Create a unified card system:

   BASE CARD:
   - Border radius
   - Background
   - Border
   - Shadow (if any)
   - Padding

   CARD HEADER:
   - Favicon size
   - Title typography
   - Gap between favicon and title
   - Optional subtitle

   CARD CONTENT:
   - Typography for body text
   - Padding
   - Content layout

3. Implement card variants:
   - Chat card (with description)
   - Widget card (with content area)
   - Compact card (smaller)

4. Update widget rendering to use new card styles

OUTPUT:
- Unified card CSS system
- Card variant modifiers
- Updated widget rendering
```

### Checklist
- [ ] Base card styles consistent
- [ ] All card variants match Figma
- [ ] Widget content areas styled
- [ ] Hover states implemented

---

## Phase 10: Final Polish & Validation

### Goal
Validate complete UI against Figma, fix any discrepancies.

### Agent Prompt
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev

TASK: Final validation and polish of the redesigned UI.

1. Take screenshots of completed implementation
2. Compare side-by-side with Figma design
3. Create a discrepancy list:
   - Component name
   - What's different
   - Figma value vs Implementation value

4. Fix all discrepancies found

5. Validate:
   - All design tokens used (no hardcoded values)
   - All states work (hover, active, focus, disabled)
   - Responsive behavior at different widths
   - Keyboard navigation functional
   - No console errors

6. Clean up:
   - Remove unused CSS
   - Remove unused files (old icons, etc.)
   - Add comments documenting Figma reference
   - Format and organize CSS logically

7. Create before/after documentation

OUTPUT:
- Discrepancy report (if any issues found)
- Cleaned up index.html
- Before/after screenshots
- List of removed files
```

### Final Checklist
- [x] All components match Figma exactly
- [x] No hardcoded values in CSS
- [x] All interactive states work
- [x] Keyboard navigation works
- [x] No console errors
- [x] Unused code removed
- [x] CSS organized and commented
- [x] Screenshots documented

---

## 🔄 Quick Reference Commands

### Start a Phase
```
Read UI_REDESIGN_PLAN.md and execute Phase [N].
Always fetch the Figma design first:
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev
```

### Continue Work
```
Continue with UI_REDESIGN_PLAN.md Phase [N].
Reference Figma: @https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev
Last completed: [describe what was done]
```

### Validate a Component
```
@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev

Compare the [COMPONENT NAME] in my implementation against the Figma design.
List any discrepancies with exact values (Figma vs Current).
```

---

## 📝 Change Log

| Date | Phase | Changes |
|------|-------|---------|
| Feb 1, 2026 | Phase 1 | Design tokens updated from Figma - colors, typography, spacing, radius, shadows |
| Feb 1, 2026 | Phase 2 | SF Symbols integrated - replaced all SVG icons with SF Pro font characters |
| Feb 1, 2026 | Phase 3 | Button components redesigned - icon-btn-sm (4px padding, 8px radius, 16px icon), icon-btn-lg (6px padding, 12px radius, 20px icon), brand variant with neutral-600 bg |
| Feb 1, 2026 | Phase 4 | Toolbar redesigned - flat layout (tab + panel toggle + nav group + search bar), removed toolbar-left wrapper, removed right buttons (split, share, more), border-radius: 16px on browser-main, no border-bottom, toolbar gap: 4px, search bar with #fafafa background and 12px radius |
| Feb 1, 2026 | Phase 5 | Sidebar & Tab Items redesigned - removed border, gap: 4px, padding: 4px; Added sidebar search (transparent bg); Tab items: gap-4px outer, inner tab-area with gap-8px; New tab button with 􀅼 icon; Favorites section with 􀊵 icon header; Tab title font: New York 12px, color #525252 |
| Feb 1, 2026 | Phase 6 | Search/Address Bar finalized - font: New York 14px/20px; bg: #fafafa, border: rgba(0,0,0,0.08); focus state: bg #fff, border rgba(0,0,0,0.12); search icon: 16x16, 12px font, #8f8f8f; bookmark icon: 16x16, #525252; input shows when focused or has value |
| Feb 1, 2026 | Phase 7 | New Tab Page redesigned - sections: "For you" (8 cards) & "Recommended" (4 cards); Section header: New York Medium 14px/20px #272320, padding 0 8px; Cards: flex wrap grid with 16px gap, min-width 200px, height 180px fixed, border-radius 32px, padding 16px; Card header: gap 8px, padding 4px; Description: New York 16px/24px #525252 at bottom |
| Feb 1, 2026 | Phase 8 | Chat Interface redesigned - container: white bg, border-radius 24px, padding 12px, gap 12px, shadow 0px 1px 2px + 0px 8px 24px; Input row: New York 14px/20px, placeholder #6d7176; Model selector: gap 6px, New York 14px, chevron 10px #242424; Send btn: bg #525252, icon #c7c7c7; Gradient fade on wrapper: 0% transparent, 10% 50% white, 100% white |
| Feb 1, 2026 | Phase 9 | Cards & Widgets unified - Created base .card system with .card-header, .card-content, .card-title, .card-description; Size variants: .card-fixed (180px height), .card-auto; Unified typography: New York font throughout; Widget content updated: notes textarea, weather (32px temp), clock (32px time), quicklinks; All hover states use transition: border-color 0.15s ease |
| Feb 1, 2026 | Phase 10 | Final Polish & Validation - Added top bar with window controls (close #ff736a, minimize #febc2e, zoom #19c332) + action buttons (split 􀧈, share 􀉭, more 􀍠); Removed unused CSS: .favorites-row, .recents-row, .thumbnail-* classes; Validated all components match Figma; Phase complete ✅ |

---

*Figma Design: `@https://www.figma.com/design/OjCGZd7Ct7w42kI74xEAuH/Cards?node-id=87840-6478&m=dev`*
