# Setup Dark Mode

---

## Prompt

```
Add dark mode support using CSS custom properties.

1. UPDATE :root with full neutral color scale:

/* Light Mode (default) */
:root {
  --color-neutral-white: #FFFFFF;
  --color-neutral-100: #FAFAFA;
  --color-neutral-150: #F5F5F5;
  --color-neutral-200: #F0F0F0;
  --color-neutral-250: #E0E0E0;
  --color-neutral-300: #C7C7C7;
  --color-neutral-350: #ADADAD;
  --color-neutral-400: #8F8F8F;
  --color-neutral-450: #757575;
  --color-neutral-550: #5C5C5C;
  --color-neutral-600: #525252;
  --color-neutral-650: #474747;
  --color-neutral-700: #3D3D3D;
  --color-neutral-750: #333333;
  --color-neutral-800: #242424;
  --color-neutral-850: #1A1A1A;
  --color-neutral-900: #0F0F0F;
  --color-neutral-black: #000000;
}

2. ADD dark mode tokens (inverted scale):

/* Dark Mode */
[data-theme="dark"] {
  --color-neutral-white: #0F0F0F;
  --color-neutral-100: #1A1A1A;
  --color-neutral-150: #242424;
  --color-neutral-200: #333333;
  --color-neutral-250: #3D3D3D;
  --color-neutral-300: #474747;
  --color-neutral-350: #525252;
  --color-neutral-400: #5C5C5C;
  --color-neutral-450: #757575;
  --color-neutral-550: #8F8F8F;
  --color-neutral-600: #ADADAD;
  --color-neutral-650: #C7C7C7;
  --color-neutral-700: #E0E0E0;
  --color-neutral-750: #F0F0F0;
  --color-neutral-800: #F5F5F5;
  --color-neutral-850: #FAFAFA;
  --color-neutral-900: #FFFFFF;
  --color-neutral-black: #FFFFFF;
}

3. ADD theme toggle JavaScript:

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}

function getTheme() {
  return localStorage.getItem('theme') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

// Apply saved theme on load
document.documentElement.setAttribute('data-theme', getTheme());

// Listen for system preference changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    setTheme(e.matches ? 'dark' : 'light');
  }
});

4. WIRE UP settings pane theme toggle:
   - When user selects Light → setTheme('light')
   - When user selects Dark → setTheme('dark')
   - Highlight current selection based on getTheme()

5. ENSURE all existing CSS uses the token variables, not hardcoded hex values.

DO NOT change any layouts, spacing, or UI structure.
Only update color values to use tokens and add theme switching.
```

---

## Color Mapping Reference

| Token | Light | Dark | Typical Usage |
|-------|-------|------|---------------|
| white | #FFFFFF | #0F0F0F | Main background |
| 100 | #FAFAFA | #1A1A1A | Subtle background |
| 150 | #F5F5F5 | #242424 | Card background |
| 200 | #F0F0F0 | #333333 | Borders |
| 250 | #E0E0E0 | #3D3D3D | Stronger borders |
| 300 | #C7C7C7 | #474747 | Disabled |
| 350 | #ADADAD | #525252 | Muted |
| 400 | #8F8F8F | #5C5C5C | Placeholder |
| 450 | #757575 | #757575 | Midpoint |
| 550 | #5C5C5C | #8F8F8F | Secondary text |
| 600 | #525252 | #ADADAD | Secondary text |
| 650 | #474747 | #C7C7C7 | Body text |
| 700 | #3D3D3D | #E0E0E0 | Body text |
| 750 | #333333 | #F0F0F0 | Strong text |
| 800 | #242424 | #F5F5F5 | Headings |
| 850 | #1A1A1A | #FAFAFA | Primary text |
| 900 | #0F0F0F | #FFFFFF | High contrast |
| black | #000000 | #FFFFFF | Maximum contrast |
