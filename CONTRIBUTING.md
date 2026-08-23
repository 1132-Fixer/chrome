# Contributing

Thanks for helping improve 1132 Fixer for Chrome.

## Ground rules

This extension is deliberately small, and the checks enforce that:

- **Zoom only** — host access is limited to `zoom.us` and `zoom.com`.
- **Zoom-origin only** — cookies plus the active Zoom tab's localStorage,
  sessionStorage, Cache API, and IndexedDB. Nothing runs until FIX ZOOM.
- **One button** — the popup has a single action and no options.
- **No telemetry, no remote code** — nothing is fetched or reported at runtime;
  the Report-a-Bug page is the only networked surface and it is user-triggered.

Changes that widen any of these need discussion in an issue first. The
validator (`scripts/validate-extension.js`) fails on violations, and that is by
design.

## Developing

1. Clone the repo and load it unpacked: `chrome://extensions` → Developer mode →
   **Load unpacked** → this folder.
2. Make your change. Keep it as small as the problem allows.
3. Run the checks:

   ```bash
   npm test
   ```

   This runs `scripts/validate-extension.js` (source and safety checks),
   `scripts/test-popup-e2e.js` (browser behavior checks), and
   `scripts/test-packages.js` (Chrome / Edge / Brave / Firefox zips exist;
   Chrome-only claims stay on the Chrome package).

## Pull requests

- Keep PRs focused — one change per PR.
- Use conventional commit style (`fix:`, `feat:`, `docs:` …), matching the
  existing history.
- Do not hand-edit version numbers; `scripts/bump-version.js` updates
  `manifest.json`, `package.json`, and the popup version badge together.
- CI must be green.

## Reporting bugs

See [SUPPORT.md](SUPPORT.md). For security issues, use
[SECURITY.md](SECURITY.md) — never a public issue.
