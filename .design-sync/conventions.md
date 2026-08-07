# 1132 Fixer — brand conventions

This is a **vanilla HTML/CSS system** (no framework, no build). Style with CSS custom properties from `styles.css` — never invent new color literals.

## Setup

Link `styles.css`. Set the page/container background to the ink gradient and default text color:

```html
<link rel="stylesheet" href="styles.css">
<body class="fixer-surface"> … </body>
```

`.fixer-surface` provides the dark ink gradient stage; every component assumes it sits on ink, not white.

## Token vocabulary (the only colors that exist)

- Navy stage: `#17243a` → `#203857` gradient grounds; panel inks per popup.css
- Action blue (primary CTA only): `--accent` `#3a82f7`
- Semantic: `--green-500` `#22c55e` (success), `--red-500` `#ef4444` (error), amber `#f5a623` is WARNING ONLY — never brand/identity
- Text: `--text` `#f4f7fb`, `--text-dim` `#9ca8bd`
- RETIRED (branding correction 2026-08-07, do not reintroduce): the amber brand
  identity, `--amber-glow`, the hazard stripe motif, weight-900 glow display
  text, and every holder behind the logo (circle, plate, radius stage, shadow
  disk, radial-glow placeholder). The bare transparent gear
  (`icons/popup-logo.png`) is the only in-app mark.
- Type: `--font` (Segoe UI stack); display weight 600–700, no glow
- Radii: `--radius-pill` 50px for pills/badges; the logo mark has NO radius

## Idiom

- One screen, one primary action: a single `.btn-zoom`-style blue button. Never two primary buttons.
- State is a `.status-badge` pill (`.scanning` amber, `.done` green, `.error` red, `.neutral` grey) with an 8px `.status-dot`.
- Amber is WARNING only; blue is exclusively the action button; green/red are outcomes only.
- The footer is a plain one-row bar: `Feedback & Report` + `Visit Website`. The hazard bar is retired.
- The product descriptor line is the locked tagline: `One-click fix for Zoom Error 1132`.
- Labels are UPPERCASE, small (10–11px), wide-tracked.

## Truth

Read `styles.css` (it imports `tokens/tokens.css` and `_ds_bundle.css`) before styling. Component markup patterns live in each component's `.prompt.md`.

## Snippet

```html
<span class="status-badge done"><span class="status-dot"></span>CLEARED</span>
<button class="btn-zoom" type="button">FIX ZOOM</button>
```
