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

- Ink stage: `--ink-900` `#050a14`, `--ink-800` `#081018`, `--ink-700` `#0a1020`
- Brand amber: `--amber-400` `#f5a623`, `--amber-500` `#ff8c00`, `--amber-glow`
- Action blue (primary CTA only): `--blue-300` `#4aa3ff`, `--blue-400` `#2d8cff`, `--blue-600` `#1a6fb5`
- Semantic: `--green-500` `#22c55e` (success), `--red-500` `#ef4444` (error), amber doubles as warning
- Text: `--text` `#f0f0f0`, `--text-dim` `#8ca4c0`
- Hazard stripe: `--hazard-yellow` `#f5c518` on `--hazard-black` `#1a1a1a`, always a repeating -45° 8px/16px stripe
- Type: `--font` (Segoe UI stack); display text is weight 900 with wide letter-spacing (3px)
- Radii: `--radius-pill` 50px for pills/badges, `--radius-mark` 14px for the logo mark

## Idiom

- One screen, one primary action: a single `.btn-zoom`-style blue pill button. Never two primary buttons.
- State is a `.status-badge` pill (`.scanning` amber, `.done` green, `.error` red, `.neutral` grey) with an 8px `.status-dot`.
- Amber is brand/identity and warning; blue is exclusively the action button; green/red are outcomes only.
- The hazard bar (`.hazard-bar`) is the signature footer motif — 6px tall, 0.7 opacity.
- Labels are UPPERCASE, small (10–11px), wide-tracked.

## Truth

Read `styles.css` (it imports `tokens/tokens.css` and `_ds_bundle.css`) before styling. Component markup patterns live in each component's `.prompt.md`.

## Snippet

```html
<span class="status-badge done"><span class="status-dot"></span>CLEARED</span>
<button class="btn-zoom" type="button">FIX ZOOM</button>
```

---

# 1132 Fixer Design System

Hand-authored from the shipped extension (popup.css is the canonical token source; `PrimeUpYourLife/1132-Fixer-Chrome`).

## Components

- Brand/LogoLockup — gold wordmark + separator + descriptor
- Brand/HazardBar — signature -45° stripe divider
- Components/StatusPill — ready / scanning / done / error / neutral
- Components/FixButton — the single blue action pill
- Components/Badges — version + scope chips
- Screens/Popup — full 360px popup (Zoom + non-Zoom states)
