# Install Motion

---

## Prompt

```
Add Motion via CDN and set up animations.

1. ADD to index.html before other scripts:
   <script src="https://cdn.jsdelivr.net/npm/motion@11.18.1/dist/motion.min.js"></script>

2. USE the global Motion object:
   const { animate } = Motion

3. STANDARD EASING for all animations:
   [0.16, 1, 0.3, 1]

4. DURATIONS:
   - fast: 0.15 (hovers, micro-interactions)
   - normal: 0.25 (panels, tabs, toggles)
   - slow: 0.4 (page transitions, modals)

5. CREATE js/motion.js with reusable animation functions:

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

6. DO NOT change any existing UI, CSS, or HTML structure.
   Only add the script tag and create the motion utilities file.
```

---

## Where to Apply Motion

```
Apply motion to ALL interactions:

SETTINGS PANE:
- motion.slideInRight() when opening
- motion.slideOutRight() when closing

TABS:
- motion.fadeIn() when switching tab content

DROPDOWNS & MENUS:
- motion.scaleIn() when opening
- motion.scaleOut() when closing

BUTTONS:
- motion.pressDown() on mousedown/touchstart
- motion.pressUp() on mouseup/touchend

CARDS (new tab page):
- motion.lift() on mouseenter
- motion.drop() on mouseleave

WEBVIEW CONTENT:
- motion.fadeIn() when page loads

SIDEBAR:
- motion.slideInRight() when expanding
- motion.slideOutRight() when collapsing

CHAT MESSAGES:
- motion.fadeIn() for new messages

No interaction should be instant. Always use motion utilities.
```
