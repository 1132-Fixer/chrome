# Agents.md

## Design System
- `design-system/` is a git submodule (`https://github.com/PrimeUpYourLife/1132-fixer-design-system.git`) and the source of truth for all design decisions.
- For any design matter — colors, typography, spacing, components, icons, visual patterns — consult `design-system/` first and follow its tokens/components.
- Do not invent new visual patterns, colors, or component styles that diverge from `design-system/`.
- If `design-system/` lacks guidance for a needed case, ask the user before improvising rather than guessing.
- Run `git submodule update --init --recursive` if `design-system/` appears empty. No newline at end of file