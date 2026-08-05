# FixButton

The primary — and only — action button. Blue is reserved for it; nothing else on a screen may be blue.

```html
<button class="btn-zoom" type="button">FIX ZOOM</button>
```

States: default (glowing blue pill), `:hover` (lift + stronger glow), `:disabled` (0.45 opacity, progress cursor), `:focus-visible` (amber outline).

Rules: one per screen, full width of its column, label UPPERCASE with 3.5px tracking, verb-first (`FIX ZOOM`). No secondary/ghost variants exist in this system — if a screen needs two actions, it's off-brand.
