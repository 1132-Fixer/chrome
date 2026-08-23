<!-- This notice supplements the repository's LICENSE file (MIT). It does not modify the MIT text. LICENSE governs the code and documentation; this file records which names and asset files the MIT grant does not cover, prospectively from this notice forward. -->

# Asset license notice — brand and mark boundary

Added 2026-08-09. **This notice applies prospectively from the date it is added to the
repository. It does not state, and must not be read to imply, that any rights previously
granted are cancelled or retracted.**

This file is the per-file annex to [TRADEMARKS.md](TRADEMARKS.md). TRADEMARKS.md states
the boundary and the permitted uses; this file lists the exact asset files the boundary
covers and records their provenance. Where the two differ on the description of a mark,
TRADEMARKS.md governs. [NOTICE.md](NOTICE.md) carries attribution and non-affiliation.

## What the MIT license covers

The [MIT license](LICENSE) covers the code, the documentation, and the eligible design
tokens in this repository. That includes, without limitation:

- the extension source: `manifest.json`, `popup.html`, `popup.css`, `popup.js`,
  `report.html`, `report.css`, `report.js`
- the build, packaging, validation, and test scripts in `scripts/`
- the design-token vocabulary in `ds-bundle/` (CSS custom properties: colors, gradients,
  spacing, radii, typography variables) and the component markup, styles, and layout in
  `ds-bundle/components/`
- the website source (`index.md`, `_layouts/`, `assets/site.css`) and all written
  documentation and copy

## What is not licensed under MIT — prospectively from this notice forward

The product names, logos, icons, and brand artwork identified below are **not** licensed
under the MIT license, prospectively from this notice forward.

**Names and marks**

- the product name **"1132 Fixer"** and **"1132 Fixer for Chrome"**
- the **1132 Fixer gear logo** (the blue gear device with orange "1132" and silver
  "Fixer" lettering, in all raster and vector renditions)

**Files (exact list)**

- `icons/icon.png`
- `icons/icon16.png`
- `icons/icon32.png`
- `icons/icon48.png`
- `icons/icon128.png`
- `icons/popup-logo.png`
- `assets/1132-fixer-logo-transparent.png`
- `assets/logo-mark.svg` (a vector wrapper that embeds
  `1132-fixer-logo-transparent.png`; the wrapper markup itself is trivial — the embedded
  artwork is what this notice covers)
- `assets/social-preview.png`

The `ds-bundle/components/Brand/LogoLockup/` component contains no image files; its HTML
and CSS remain MIT. The gear mark it displays (`icons/popup-logo.png`) and the "1132
FIXER" wordmark it renders are covered by this notice.

## Scope of the reservation — honesty clause

Rights in the names and files above are reserved **only to the extent actually controlled
by the project**. This notice claims no exclusive ownership of any asset whose provenance
has not been established. For every asset marked "under review" in the table below:
**provenance under review — status will be corrected when established.**

## Provenance records

Status legend:

- **controlled** — created in this repository with its source of authorship in the repo
  history; no external provenance identified.
- **under review (CR-10)** — provenance under review — status will be corrected when
  established. The current artwork traces to the 2026-08-07 brand-refresh directives,
  whose asset provenance is being verified under review item CR-10.

| File | What it depicts | First appeared (commit) | Current artwork since (commit) | Provenance status |
|---|---|---|---|---|
| `icons/icon.png` | gear mark on dimensional card (store icon) | `426f1e3` (2026-05-22, initial commit) | `8444139` (2026-08-07, PR #10) | under review (CR-10) |
| `icons/icon16.png` | gear mark, 16 px toolbar icon | `426f1e3` (2026-05-22, initial commit) | `8444139` (2026-08-07, PR #10) | under review (CR-10) |
| `icons/icon32.png` | gear mark, 32 px icon | `4302033` (2026-08-07, PR #9) | `8444139` (2026-08-07, PR #10) | under review (CR-10) |
| `icons/icon48.png` | gear mark, 48 px icon | `426f1e3` (2026-05-22, initial commit) | `8444139` (2026-08-07, PR #10) | under review (CR-10) |
| `icons/icon128.png` | gear mark, 128 px icon | `426f1e3` (2026-05-22, initial commit) | `8444139` (2026-08-07, PR #10) | under review (CR-10) |
| `icons/popup-logo.png` | transparent gear mark (popup header) | `4302033` (2026-08-07, PR #9) | `4302033` (2026-08-07, PR #9) | under review (CR-10) |
| `assets/1132-fixer-logo-transparent.png` | blue gear with orange "1132" and silver "Fixer" lettering, transparent background | `4302033` (2026-08-07, PR #9) | `4302033` (2026-08-07, PR #9) | under review (CR-10) |
| `assets/logo-mark.svg` | vector wrapper embedding `1132-fixer-logo-transparent.png` | `4302033` (2026-08-07, PR #9) | `4302033` (2026-08-07, PR #9) | under review (CR-10) |
| `assets/social-preview.png` | social/preview banner with gear mark and wordmark | `4302033` (2026-08-07, PR #9) | `8444139` (2026-08-07, PR #10) | under review (CR-10) |

Commits are cited from this repository's history (`git log --follow`).

## Future public design-system package

If the design system in `ds-bundle/` is ever published as a public package, the same
boundary applies to that package: the design tokens, CSS, and component markup carry the
MIT license; the product names, logos, icons, and brand artwork identified in this notice
(and any successor brand artwork designated at publication time) are not licensed under
MIT by that package.
