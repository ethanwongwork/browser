# Setup Color Themes

---

## Prompt

```
Add a theme system with 12 muted, calm color palettes.

THEME STRUCTURE:
- Each theme replaces the neutral scale with a soft, muted tinted scale
- White (#FFFFFF) and Black (#000000) remain constant
- Each theme has light and dark mode variants
- Colors are perceptually uniform with the neutral scale

AVAILABLE THEMES (12 total):

1. NEUTRAL (soft gray)
   --100: #FAFAFA    --550: #6B6B6B
   --150: #F5F5F5    --600: #5F5F5F
   --200: #EEEEEE    --650: #525252
   --250: #E2E2E2    --700: #454545
   --300: #CACACA    --750: #383838
   --350: #B0B0B0    --800: #2A2A2A
   --400: #969696    --850: #1E1E1E
   --450: #7E7E7E    --900: #121212

2. STONE (warm greige)
   --100: #FAF9F8    --550: #6A645E
   --150: #F4F2F0    --600: #5E5954
   --200: #EAE6E3    --650: #514D49
   --250: #DCD7D2    --700: #44413D
   --300: #C4BDB6    --750: #373532
   --350: #AAA299    --800: #2A2826
   --400: #918880    --850: #1D1C1A
   --450: #7A716A    --900: #121110

3. BLUSH (dusty rose)
   --100: #FCF9FA    --550: #8D6872
   --150: #F8F2F4    --600: #7E5D66
   --200: #F1E8EB    --650: #6C5058
   --250: #E7DADF    --700: #59434A
   --300: #D6C4CA    --750: #46363B
   --350: #C2ACB4    --800: #34292D
   --400: #AD949D    --850: #231C1F
   --450: #997D87    --900: #151012

4. CORAL (muted peach)
   --100: #FCF9F7    --550: #926D60
   --150: #F8F2EE    --600: #836254
   --200: #F1E8E2    --650: #70544A
   --250: #E8DAD2    --700: #5C453D
   --300: #D9C5BA    --750: #483730
   --350: #C6ADA0    --800: #362924
   --400: #B29586    --850: #241C18
   --450: #9D7E6E    --900: #16100D

5. SAND (warm beige)
   --100: #FAFAF7    --550: #7D7460
   --150: #F6F4EE    --600: #706855
   --200: #EFEBE2    --650: #605949
   --250: #E5DFD3    --700: #4F4A3D
   --300: #D4CCBE    --750: #3F3B31
   --350: #C0B5A4    --800: #2F2D25
   --400: #AA9E8A    --850: #201F1A
   --450: #958872    --900: #131210

6. SAGE (muted green)
   --100: #F8FAF8    --550: #5A7360
   --150: #F0F4F0    --600: #506753
   --200: #E4EBE5    --650: #455848
   --250: #D5E0D6    --700: #3A493C
   --300: #BDCABF    --750: #2F3A30
   --350: #A2B5A5    --800: #242C25
   --400: #889D8B    --850: #1A1F1A
   --450: #708673    --900: #101310

7. SEAFOAM (soft teal)
   --100: #F6FAFA    --550: #4A7274
   --150: #ECF4F4    --600: #426668
   --200: #DFEBEC    --650: #38585A
   --250: #CFDFE0    --700: #2F494A
   --300: #B2CBCD    --750: #263A3B
   --350: #94B5B7    --800: #1D2C2D
   --400: #769D9F    --850: #151F20
   --450: #5F8789    --900: #0D1313

8. SKY (soft blue)
   --100: #F7F9FB    --550: #526F8E
   --150: #EEF3F8    --600: #49637F
   --200: #E2EAF2    --650: #3F556C
   --250: #D2DEE9    --700: #354659
   --300: #B6C9DA    --750: #2B3846
   --350: #97B0C6    --800: #212A35
   --400: #7996B0    --850: #181D24
   --450: #5E7E9B    --900: #0F1216

9. PERIWINKLE (soft lavender-blue)
   --100: #F9F9FB    --550: #646A96
   --150: #F1F2F8    --600: #595F88
   --200: #E6E8F2    --650: #4C5174
   --250: #D8DBE9    --700: #404360
   --300: #C0C4DA    --750: #33364C
   --350: #A6ABC8    --800: #272939
   --400: #8C92B4    --850: #1B1C28
   --450: #747AA2    --900: #101118

10. LAVENDER (soft purple)
    --100: #FAF9FB    --550: #746890
    --150: #F4F1F8    --600: #685D82
    --200: #EBE6F1    --650: #594F6E
    --250: #DFD8E8    --700: #4A425B
    --300: #CCC3DA    --750: #3B3548
    --350: #B6AAC8    --800: #2D2836
    --400: #9F91B4    --850: #1F1C25
    --450: #897A9F    --900: #131017

11. MAUVE (dusty purple-pink)
    --100: #FAF9FA    --550: #846880
    --150: #F5F1F4    --600: #765D72
    --200: #EDE6EB    --650: #655062
    --250: #E2D8E0    --700: #534251
    --300: #D0C2CE    --750: #423540
    --350: #BBABB8    --800: #322830
    --400: #A594A0    --850: #221C21
    --450: #907D8B    --900: #141013

12. WISTERIA (soft violet)
    --100: #F9F8FB    --550: #6E6290
    --150: #F3F0F8    --600: #635882
    --200: #EAE5F1    --650: #554B6E
    --250: #DED7E8    --700: #463E5B
    --300: #CBC1DA    --750: #383248
    --350: #B5A8C9    --800: #2A2636
    --400: #9E90B6    --850: #1D1A25
    --450: #8779A2    --900: #120F17

---

CSS IMPLEMENTATION:

:root {
  --color-white: #FFFFFF;
  --color-black: #000000;
  
  --color-100: var(--theme-100);
  --color-150: var(--theme-150);
  --color-200: var(--theme-200);
  --color-250: var(--theme-250);
  --color-300: var(--theme-300);
  --color-350: var(--theme-350);
  --color-400: var(--theme-400);
  --color-450: var(--theme-450);
  --color-550: var(--theme-550);
  --color-600: var(--theme-600);
  --color-650: var(--theme-650);
  --color-700: var(--theme-700);
  --color-750: var(--theme-750);
  --color-800: var(--theme-800);
  --color-850: var(--theme-850);
  --color-900: var(--theme-900);
}

/* NEUTRAL (default) */
[data-theme-color="neutral"], :root {
  --theme-100: #FAFAFA; --theme-150: #F5F5F5; --theme-200: #EEEEEE; --theme-250: #E2E2E2;
  --theme-300: #CACACA; --theme-350: #B0B0B0; --theme-400: #969696; --theme-450: #7E7E7E;
  --theme-550: #6B6B6B; --theme-600: #5F5F5F; --theme-650: #525252; --theme-700: #454545;
  --theme-750: #383838; --theme-800: #2A2A2A; --theme-850: #1E1E1E; --theme-900: #121212;
}

/* STONE */
[data-theme-color="stone"] {
  --theme-100: #FAF9F8; --theme-150: #F4F2F0; --theme-200: #EAE6E3; --theme-250: #DCD7D2;
  --theme-300: #C4BDB6; --theme-350: #AAA299; --theme-400: #918880; --theme-450: #7A716A;
  --theme-550: #6A645E; --theme-600: #5E5954; --theme-650: #514D49; --theme-700: #44413D;
  --theme-750: #373532; --theme-800: #2A2826; --theme-850: #1D1C1A; --theme-900: #121110;
}

/* BLUSH */
[data-theme-color="blush"] {
  --theme-100: #FCF9FA; --theme-150: #F8F2F4; --theme-200: #F1E8EB; --theme-250: #E7DADF;
  --theme-300: #D6C4CA; --theme-350: #C2ACB4; --theme-400: #AD949D; --theme-450: #997D87;
  --theme-550: #8D6872; --theme-600: #7E5D66; --theme-650: #6C5058; --theme-700: #59434A;
  --theme-750: #46363B; --theme-800: #34292D; --theme-850: #231C1F; --theme-900: #151012;
}

/* CORAL */
[data-theme-color="coral"] {
  --theme-100: #FCF9F7; --theme-150: #F8F2EE; --theme-200: #F1E8E2; --theme-250: #E8DAD2;
  --theme-300: #D9C5BA; --theme-350: #C6ADA0; --theme-400: #B29586; --theme-450: #9D7E6E;
  --theme-550: #926D60; --theme-600: #836254; --theme-650: #70544A; --theme-700: #5C453D;
  --theme-750: #483730; --theme-800: #362924; --theme-850: #241C18; --theme-900: #16100D;
}

/* SAND */
[data-theme-color="sand"] {
  --theme-100: #FAFAF7; --theme-150: #F6F4EE; --theme-200: #EFEBE2; --theme-250: #E5DFD3;
  --theme-300: #D4CCBE; --theme-350: #C0B5A4; --theme-400: #AA9E8A; --theme-450: #958872;
  --theme-550: #7D7460; --theme-600: #706855; --theme-650: #605949; --theme-700: #4F4A3D;
  --theme-750: #3F3B31; --theme-800: #2F2D25; --theme-850: #201F1A; --theme-900: #131210;
}

/* SAGE */
[data-theme-color="sage"] {
  --theme-100: #F8FAF8; --theme-150: #F0F4F0; --theme-200: #E4EBE5; --theme-250: #D5E0D6;
  --theme-300: #BDCABF; --theme-350: #A2B5A5; --theme-400: #889D8B; --theme-450: #708673;
  --theme-550: #5A7360; --theme-600: #506753; --theme-650: #455848; --theme-700: #3A493C;
  --theme-750: #2F3A30; --theme-800: #242C25; --theme-850: #1A1F1A; --theme-900: #101310;
}

/* SEAFOAM */
[data-theme-color="seafoam"] {
  --theme-100: #F6FAFA; --theme-150: #ECF4F4; --theme-200: #DFEBEC; --theme-250: #CFDFE0;
  --theme-300: #B2CBCD; --theme-350: #94B5B7; --theme-400: #769D9F; --theme-450: #5F8789;
  --theme-550: #4A7274; --theme-600: #426668; --theme-650: #38585A; --theme-700: #2F494A;
  --theme-750: #263A3B; --theme-800: #1D2C2D; --theme-850: #151F20; --theme-900: #0D1313;
}

/* SKY */
[data-theme-color="sky"] {
  --theme-100: #F7F9FB; --theme-150: #EEF3F8; --theme-200: #E2EAF2; --theme-250: #D2DEE9;
  --theme-300: #B6C9DA; --theme-350: #97B0C6; --theme-400: #7996B0; --theme-450: #5E7E9B;
  --theme-550: #526F8E; --theme-600: #49637F; --theme-650: #3F556C; --theme-700: #354659;
  --theme-750: #2B3846; --theme-800: #212A35; --theme-850: #181D24; --theme-900: #0F1216;
}

/* PERIWINKLE */
[data-theme-color="periwinkle"] {
  --theme-100: #F9F9FB; --theme-150: #F1F2F8; --theme-200: #E6E8F2; --theme-250: #D8DBE9;
  --theme-300: #C0C4DA; --theme-350: #A6ABC8; --theme-400: #8C92B4; --theme-450: #747AA2;
  --theme-550: #646A96; --theme-600: #595F88; --theme-650: #4C5174; --theme-700: #404360;
  --theme-750: #33364C; --theme-800: #272939; --theme-850: #1B1C28; --theme-900: #101118;
}

/* LAVENDER */
[data-theme-color="lavender"] {
  --theme-100: #FAF9FB; --theme-150: #F4F1F8; --theme-200: #EBE6F1; --theme-250: #DFD8E8;
  --theme-300: #CCC3DA; --theme-350: #B6AAC8; --theme-400: #9F91B4; --theme-450: #897A9F;
  --theme-550: #746890; --theme-600: #685D82; --theme-650: #594F6E; --theme-700: #4A425B;
  --theme-750: #3B3548; --theme-800: #2D2836; --theme-850: #1F1C25; --theme-900: #131017;
}

/* MAUVE */
[data-theme-color="mauve"] {
  --theme-100: #FAF9FA; --theme-150: #F5F1F4; --theme-200: #EDE6EB; --theme-250: #E2D8E0;
  --theme-300: #D0C2CE; --theme-350: #BBABB8; --theme-400: #A594A0; --theme-450: #907D8B;
  --theme-550: #846880; --theme-600: #765D72; --theme-650: #655062; --theme-700: #534251;
  --theme-750: #423540; --theme-800: #322830; --theme-850: #221C21; --theme-900: #141013;
}

/* WISTERIA */
[data-theme-color="wisteria"] {
  --theme-100: #F9F8FB; --theme-150: #F3F0F8; --theme-200: #EAE5F1; --theme-250: #DED7E8;
  --theme-300: #CBC1DA; --theme-350: #B5A8C9; --theme-400: #9E90B6; --theme-450: #8779A2;
  --theme-550: #6E6290; --theme-600: #635882; --theme-650: #554B6E; --theme-700: #463E5B;
  --theme-750: #383248; --theme-800: #2A2636; --theme-850: #1D1A25; --theme-900: #120F17;
}

/* LIGHT MODE */
:root, [data-theme-mode="light"] {
  --color-bg-primary: var(--color-white);
  --color-bg-secondary: var(--color-100);
  --color-bg-tertiary: var(--color-150);
  --color-bg-hover: var(--color-200);
  --color-bg-active: var(--color-250);
  --color-border: var(--color-200);
  --color-border-strong: var(--color-300);
  --color-text-primary: var(--color-900);
  --color-text-secondary: var(--color-700);
  --color-text-tertiary: var(--color-550);
  --color-text-muted: var(--color-400);
}

/* DARK MODE */
[data-theme-mode="dark"] {
  --color-bg-primary: var(--color-900);
  --color-bg-secondary: var(--color-850);
  --color-bg-tertiary: var(--color-800);
  --color-bg-hover: var(--color-750);
  --color-bg-active: var(--color-700);
  --color-border: var(--color-800);
  --color-border-strong: var(--color-700);
  --color-text-primary: var(--color-white);
  --color-text-secondary: var(--color-200);
  --color-text-tertiary: var(--color-350);
  --color-text-muted: var(--color-450);
}

---

JAVASCRIPT:

const themes = ['neutral', 'stone', 'blush', 'coral', 'sand', 'sage', 'seafoam', 'sky', 'periwinkle', 'lavender', 'mauve', 'wisteria'];

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

// Apply on load
document.documentElement.setAttribute('data-theme-color', getThemeColor());
document.documentElement.setAttribute('data-theme-mode', getThemeMode());

---

SETTINGS UI:
- 12 color swatches in a 4x3 or 6x2 grid
- Show 300 shade as preview
- Selected theme has checkmark or subtle border
- Instant apply on selection

DO NOT change existing UI structure.
Only add CSS theme variables and JavaScript switching.
```

---

## Theme Swatches (preview color 300)

| Theme | Swatch | Hex |
|-------|--------|-----|
| Neutral | ○ | #CACACA |
| Stone | ○ | #C4BDB6 |
| Blush | ○ | #D6C4CA |
| Coral | ○ | #D9C5BA |
| Sand | ○ | #D4CCBE |
| Sage | ○ | #BDCABF |
| Seafoam | ○ | #B2CBCD |
| Sky | ○ | #B6C9DA |
| Periwinkle | ○ | #C0C4DA |
| Lavender | ○ | #CCC3DA |
| Mauve | ○ | #D0C2CE |
| Wisteria | ○ | #CBC1DA |
