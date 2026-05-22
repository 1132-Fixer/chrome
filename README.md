# 1132 Fixer for Chrome

Chrome sibling of [1132 Fixer for Windows](https://github.com/PrimeUpYourLife/1132-Fixer-Windows). A Manifest V3 popup extension that gives you a deliberate, user-triggered cleaner for cookies and site data — with a dedicated **ZOOM DETECTED → FIX ZOOM** flow for the most common 1132-style problem.

## What it does

- **On `zoom.us` / `zoom.com`:** the popup shows a **ZOOM DETECTED** banner and a one-tap **FIX ZOOM** button. Clicking it clears Zoom-only cookies, `localStorage`, `sessionStorage`, Cache API, and IndexedDB, then reloads the active Zoom tab.
- **Manual picker:** pick **Current site / Custom domain / All sites**, pick the data types you want, then **FIX NOW**. The active tab reloads if its host matches.
- **No auto-clearing.** Every clear is user-triggered. Opening the popup never deletes anything by itself.
- **No telemetry. No remote code. No external network calls.** Everything runs locally inside the popup.

## What data each control clears

| Surface           | Cookies        | `localStorage` | `sessionStorage`         | Cache API (per-origin) | IndexedDB     | HTTP Cache (global) |
| ----------------- | -------------- | -------------- | ------------------------ | ---------------------- | ------------- | ------------------- |
| **FIX ZOOM**      | `zoom.us` + `zoom.com` | same           | active tab only          | same                   | same          | — *(never)*         |
| **Current site**  | active host    | active host    | active tab only          | active host            | active host   | — *(never)*         |
| **Custom domain** | entered host   | entered host   | active tab if it matches | entered host           | entered host  | — *(never)*         |
| **All sites**     | all            | all            | active tab only          | all                    | all           | yes                 |

Per-origin clears use `chrome.browsingData.remove({origins})`, which only supports per-origin scoping for `cookies`, `cacheStorage`, `indexedDB`, `localStorage`, and `serviceWorkers`. The global HTTP cache is **never** wiped from per-domain operations — it is only touched if you explicitly select **All sites**.

`sessionStorage` is per-tab and not addressable by `chrome.browsingData`. The extension clears it via `chrome.scripting.executeScript` in the active tab only, when that tab matches the selected scope.

## Permissions

| Permission       | Why we need it                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| `cookies`        | Enumerate and remove cookies for the selected domain via `chrome.cookies`.                              |
| `browsingData`   | Per-origin clear of `localStorage`, `cacheStorage`, `indexedDB`, `serviceWorkers`, and cookies.         |
| `activeTab`      | Read the active tab's URL when the popup opens; reload it after clearing.                               |
| `scripting`      | Inject `sessionStorage.clear()` into the active tab (only after the user clicks FIX ZOOM / FIX NOW).    |
| `<all_urls>`     | Required by `chrome.cookies` and `chrome.browsingData` for the **Custom domain** and **All sites** flows. The extension does **not** inject content scripts at install time and does **not** read page content. |

## Install (unpacked, for development)

1. Clone this repo.
2. Open `chrome://extensions` and enable **Developer mode** (top right).
3. **Load unpacked** → select this folder.
4. Pin the extension and click the icon to open the popup.

If you replace `icons/icon.png`, regenerate the 16 / 48 / 128 sizes:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1
```

## Manual test checklist

| # | Step                                                                                | Expected                                                          |
| - | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1 | Load unpacked, no errors in `chrome://extensions` for this extension.               | Extension card is green.                                          |
| 2 | Visit `https://zoom.us`, open popup.                                                | **ZOOM DETECTED** banner shows host. **FIX ZOOM** button visible. |
| 3 | Visit `https://www.zoom.us`, open popup.                                            | Banner shows.                                                     |
| 4 | Visit `https://us02web.zoom.us`, open popup.                                        | Banner shows.                                                     |
| 5 | Visit a non-Zoom site (e.g. `https://example.com`), open popup.                     | Banner **hidden**. Scope picker still works.                      |
| 6 | On `https://zoom.us`, click **FIX ZOOM**.                                           | Log shows per-domain clears, success state, Zoom tab reloads.     |
| 7 | Open DevTools on the popup before clicking. Click **FIX ZOOM**.                     | No JS errors. No external network requests.                       |
| 8 | On any site, pick **Custom domain**, enter `example.com`, click **FIX NOW**.        | Per-origin clear runs against `example.com`. No reload of other tabs. |
| 9 | Open popup on a `chrome://` page.                                                   | "No web origin in active tab" message. Picker still usable.       |

## Source-level validation

```bash
node scripts/validate-extension.js
```

Checks manifest JSON/MV3, referenced files exist, no telemetry/remote-code tokens, no runtime URLs, and runs unit tests for the domain matcher (`isZoomHost`, `parseDomainInput`, `normalizeHost`) including deceptive hosts like `zoom.us.evil.com`, `evilzoom.us`, `notzoom.us`.

## Privacy posture

- No data collection.
- No analytics.
- No remote servers contacted at any time.
- No account required.
- No user-content read or logged. Cookie/storage **values** are never read into JS or shown in the UI — only counts are displayed.
- All clears are explicit and user-triggered.

## Files

| File                            | Purpose                                              |
| ------------------------------- | ---------------------------------------------------- |
| `manifest.json`                 | MV3 manifest.                                        |
| `popup.html`                    | Popup markup.                                        |
| `popup.css`                     | Styles (1132 Fixer dark/amber palette + Zoom blue).  |
| `popup.js`                      | Scope/type detection, clear logic, Zoom shortcut.    |
| `icons/`                        | Source `icon.png` + generated 16/48/128.             |
| `scripts/make-icons.ps1`        | Regenerate `icon16/48/128.png`.                      |
| `scripts/validate-extension.js` | Source-level validator + domain matcher unit tests.  |
| `STORE_PREP.md`                 | Chrome Web Store packaging checklist + justifications. |

## License

MIT.
