# Badges

Pill chips, mirroring the Windows footer spec (12px / 600 / 0.2px / 8×14). Two kinds:

- **Static info chips** (`.badge.static`): `.version-badge` (grey, factual metadata like `v1.2.1`) and `.scope-badge` (soft-blue, a promise/constraint like `Cookies only`). Compact height; they sit in the popup TOP bar — version left, scope right.
- **Interactive link pills** (`.badge.site-link`): `Feedback & Report`, `Visit Website`. Keep the 44px minimum target; they sit in the popup footer on one row.

```html
<span class="badge static version-badge">v1.2.1</span>
<a class="badge site-link" href="https://1132-fixer.xyz/">Visit Website</a>
```

Rules: chips never carry warnings — that's the StatusPill. No uppercase transforms (title-case labels), no inset shadows, no gradients.
