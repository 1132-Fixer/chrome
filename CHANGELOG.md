# Changelog

Notable changes to 1132 Fixer for Chrome. Versions follow the shipped
`manifest.json` version; entries are summarized from the git history.

## Unreleased

- Public project documentation: security policy, contributing guide, code of
  conduct, support guide, trademark notice, issue and PR templates.
- Product identity strings aligned to the canonical 1132 Fixer wording.
- Report page fallback version label corrected to match the manifest.

## 1.2.5 — 2026-08-10

- In-extension Report-a-Bug page with optional screenshot attachment (#16, #17).
  The report page is the extension's only networked surface, pinned to the
  project's support service and always user-triggered.

## 1.2.4 — 2026-08-08

- Fixed the GitHub Pages build (and with it the public privacy-policy URL) by
  removing an unreachable private submodule reference (#12).
- CI workflow action versions updated (#6, #7, #8).

## 1.2.3 — 2026-08-07

- Store icon updated to the dimensional card artwork (#10).

## 1.2.2 — 2026-08-07

- New 1132 Fixer icon set, including 32 px manifest entries (#9).

## 1.2.1 — 2026-08-05

- **Cookies-only clear** (v1.2.0 work, #1): cookies are now the only data type
  the extension touches. The `browsingData` and `scripting` permissions were
  removed, the popup became a single FIX ZOOM button with no options, and the
  validator and e2e tests now enforce all of it.

## 1.1.0 — 2026-05-22

- Zoom-only restructure: host permissions narrowed to `zoom.us` / `zoom.com`,
  manual domain picker dropped. First Chrome Web Store submission.
