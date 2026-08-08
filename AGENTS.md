# Agents.md

## Design System
- `ds-bundle/` is the in-repo design reference (tokens, components, screen specs). Its `tokens/tokens.css` mirrors `popup.css` `:root` — **popup.css is the canonical token source**.
- For any design matter — colors, typography, spacing, components, icons, visual patterns — consult `ds-bundle/` first and follow its tokens/components.
- Do not invent new visual patterns, colors, or component styles that diverge from `ds-bundle/`.
- If `ds-bundle/` lacks guidance for a needed case, ask the user before improvising rather than guessing.
- History note: a `design-system/` git submodule (PrimeUpYourLife/1132-fixer-design-system) was referenced briefly on 2026-08-08 and removed the same day — the submodule repo is PRIVATE, and a private submodule inside this PUBLIC repo broke GitHub Pages builds (which serve the Chrome Web Store privacy-policy URL) and recursive clones. If that repo is ever made public (pending provenance ruling CR-10), the submodule may be restored deliberately.
