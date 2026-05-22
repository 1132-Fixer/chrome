# 1132 Fixer for Chrome

Chrome sibling of [1132 Fixer for Windows](https://github.com/PrimeUpYourLife/1132-Fixer-Windows). A Manifest V3 popup extension with a single, narrow purpose: clear Zoom site data and reload the active Zoom tab, so Zoom error 1132 and other stale-cookie sign-in loops go away.

## What it does

- **On `zoom.us` / `*.zoom.us` / `zoom.com` / `*.zoom.com`:** the popup shows a **ZOOM DETECTED** banner and a one-tap **FIX ZOOM** button. Clicking it clears Zoom-only cookies, `localStorage`, `sessionStorage`, Cache API, IndexedDB, and service worker registrations for `zoom.us` and `zoom.com`, then reloads the active Zoom tab.
- **On any non-Zoom site:** the popup shows a small "Not a Zoom tab" card and offers no action. The extension cannot — and will not — clear data for non-Zoom hosts.
- **No auto-clearing.** Every clear is user-triggered. Opening the popup never deletes anything by itself; nothing runs on install, startup, page-load, or a timer.
- **No telemetry. No remote code. No external network calls.** Everything runs locally inside the popup.

## What FIX ZOOM clears

| Data type                       | Scope                                                |
| ------------------------------- | ---------------------------------------------------- |
| Cookies                         | `zoom.us`, `zoom.com`, and their subdomains          |
| `localStorage`                  | Per-origin, `zoom.us` + `zoom.com`                   |
| Cache API (`cacheStorage`)      | Per-origin, `zoom.us` + `zoom.com`                   |
| IndexedDB                       | Per-origin, `zoom.us` + `zoom.com`                   |
| Service worker registrations    | Per-origin, `zoom.us` + `zoom.com`                   |
| `sessionStorage`                | Active tab only, when that tab is a Zoom tab        |
| **Global HTTP cache**           | **Never** — only per-origin `cacheStorage` is cleared |

The extension reads no values. The popup log surfaces counts only (for example, `Cookies removed for zoom.us: 17`).

## Permissions

| Permission                          | Why                                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `cookies`                           | Enumerate and remove cookies for `zoom.us` / `zoom.com` via `chrome.cookies`.                                                    |
| `browsingData`                      | Per-origin clear of `localStorage`, `cacheStorage`, `indexedDB`, and `serviceWorkers` via `chrome.browsingData.remove({origins})`.|
| `activeTab`                         | Read the active tab's URL when the popup opens (to detect Zoom) and reload it after clearing.                                    |
| `scripting`                         | Inject a single `sessionStorage.clear()` line into the active tab, only after the user clicks **FIX ZOOM**.                      |
| Host: `https://*.zoom.us/*`, `https://*.zoom.com/*` | Required by `chrome.cookies` and `chrome.browsingData` to operate on Zoom domains. No other hosts are requested.       |

## Install (unpacked, for development)

1. Clone this repo.
2. Open `chrome://extensions` and enable **Developer mode** (top right).
3. **Load unpacked** → select this folder.
4. Pin the extension and click the icon to open the popup.

### Windows quick install helper

Double-click `install.bat` in the repo root. It opens `chrome://extensions` and the extension folder in Explorer so you can click **Load unpacked** without typing paths. It does **not** silently install — Chrome blocks that for normal users without enterprise policy — and it does **not** require admin, change the registry, or download anything.

If you replace `icons/icon.png`, regenerate the 16 / 48 / 128 sizes:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1
```

## Manual test checklist

| # | Step                                                                                | Expected                                                                                |
| - | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1 | Load unpacked, no errors in `chrome://extensions` for this extension.               | Extension card is green.                                                                |
| 2 | Visit `https://zoom.us`, open popup.                                                | **ZOOM DETECTED** banner shows host. **FIX ZOOM** button visible.                       |
| 3 | Visit `https://www.zoom.us`, open popup.                                            | Banner shows.                                                                           |
| 4 | Visit `https://us02web.zoom.us`, open popup.                                        | Banner shows.                                                                           |
| 5 | Visit a non-Zoom site (e.g. `https://example.com`), open popup.                     | Banner **hidden**. Polished "Not a Zoom tab" card visible. No FIX action available.     |
| 6 | On `https://zoom.us`, click **FIX ZOOM**.                                           | Log shows per-domain clears, success state `ZOOM CLEARED`, Zoom tab reloads.            |
| 7 | Open DevTools on the popup before clicking. Click **FIX ZOOM**.                     | No JS errors. No external network requests.                                             |
| 8 | Open popup on a `chrome://` page.                                                   | "Not a Zoom tab" card visible. No FIX action available.                                  |
| 9 | Confirm only popup HTML/CSS/JS + chrome.* API calls — no `fetch`/`XHR`/`WebSocket`. | Static scan and DevTools network tab confirm zero external requests.                    |

## Source-level validation

```bash
node scripts/validate-extension.js
```

Checks manifest JSON/MV3, narrow zoom-only host permissions (no `<all_urls>`), referenced files exist, no telemetry/remote-code tokens, no runtime URLs, and runs unit tests for the domain matcher (`isZoomHost`, `normalizeHost`, `hostMatchesBase`) including deceptive hosts like `zoom.us.evil.com`, `evilzoom.us`, `notzoom.us`. Additional safety guards assert no manual / Custom domain / All sites scope code or UI remains, no install/startup auto-clear hooks exist, and the per-origin clear path never sets the global HTTP `cache` key.

## Privacy posture

- No data collection.
- No analytics.
- No remote servers contacted at any time.
- No account required.
- No user-content read or logged. Cookie/storage **values** are never read into JS or shown in the UI — only counts are displayed.
- All clears are explicit and user-triggered.
- Independent project. Not affiliated with Zoom Video Communications, Inc.

## Files

| File                            | Purpose                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `manifest.json`                 | MV3 manifest. Zoom-only host permissions.                                        |
| `popup.html`                    | Popup markup. ZOOM DETECTED banner + FIX ZOOM button + non-Zoom card.            |
| `popup.css`                     | Styles (1132 Fixer dark/amber palette + Zoom blue accent).                       |
| `popup.js`                      | Zoom-only detection, clear logic, and reload.                                    |
| `icons/`                        | Source `icon.png` + generated 16/48/128.                                         |
| `scripts/make-icons.ps1`        | Regenerate `icon16/48/128.png`.                                                  |
| `scripts/validate-extension.js` | Source-level validator + domain matcher unit tests.                              |
| `STORE_PREP.md`                 | Chrome Web Store packaging checklist + justifications.                            |
| `install.bat`                   | Windows quick-install helper; opens Chrome extensions page and the repo folder.   |
| `PRIVACY_POLICY.md`             | Canonical privacy policy text.                                                   |

## License

MIT.
