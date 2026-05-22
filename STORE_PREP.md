# Chrome Web Store — Submission Prep

This document is the operator's checklist for packaging and listing **1132 Fixer for Chrome** on the Chrome Web Store. It does **not** authorize a submission; that step requires separate explicit approval.

## Single-purpose statement

> 1132 Fixer clears the user's own site data — cookies, `localStorage`, `sessionStorage`, Cache API, and IndexedDB — for the active site, a chosen domain, or all sites, with a dedicated one-click shortcut for `zoom.us` to mitigate Zoom error 1132.

Every permission below maps directly to this single purpose.

## Permission justifications (Web Store form)

| Permission        | Justification (paste into store form, ≤1000 chars)                                                                                                                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cookies`         | Required to enumerate and remove cookies for the active site, the user's chosen custom domain, or zoom.us via `chrome.cookies`. Cookie **values** are never read or transmitted; the extension only deletes by name/domain/path.                                                              |
| `browsingData`    | Required for per-origin clearing of `localStorage`, `cacheStorage`, `indexedDB`, and `serviceWorkers` via `chrome.browsingData.remove({origins})`. Used only after an explicit user click.                                                                                                    |
| `activeTab`       | Required to read the active tab's URL when the popup opens (to detect zoom.us and show the **ZOOM DETECTED** banner) and to reload that tab after the user-triggered clear completes.                                                                                                         |
| `scripting`       | Required to inject `sessionStorage.clear()` into the active tab. `sessionStorage` is per-tab and cannot be cleared by `chrome.browsingData`. Injection only happens after the user clicks **FIX ZOOM** or **FIX NOW**, only on the active tab, and only runs a one-line clear with no DOM read. |
| Host: `<all_urls>`| Required because the **Custom domain** and **All sites** flows let the user clear data for any host they pick. We do not inject content scripts at install or page-load time. We do not observe or modify page content. The host permission is consumed only by `chrome.cookies` and `chrome.browsingData` for the user's chosen scope. |

## Privacy disclosure draft

- **Personally identifiable information:** none collected.
- **Health information:** none collected.
- **Financial and payment information:** none collected.
- **Authentication information:** none collected. Cookies are **deleted**, not read.
- **Personal communications:** none collected.
- **Location:** none collected.
- **Web history:** none collected.
- **User activity:** none collected.
- **Website content:** never read. The extension does not run content scripts at install or page-load time. The only injected script is `sessionStorage.clear()`, which contains no read operation.
- **Remote code use:** none. No remote scripts, styles, fonts, or images. All assets ship in the package.
- **Data transmission:** the extension makes zero network requests.

Tick *I do not collect or transmit user data* in the Privacy Practices form.

## Packaging command

Run from the repo root:

```powershell
Remove-Item -Force -ErrorAction SilentlyContinue 1132-fixer-chrome.zip
Compress-Archive -Path manifest.json,popup.html,popup.css,popup.js,icons,LICENSE,README.md -DestinationPath 1132-fixer-chrome.zip -Force
```

The zip's top level must contain `manifest.json` (not a wrapping folder).

## Store listing fields

| Field                  | Value                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Name                   | `1132 Fixer`                                                                                         |
| Short description      | `One-click Zoom 1132 cleaner: clears Zoom cookies, storage, and cache, then reloads.` *(132 chars max — currently 84)* |
| Category               | Productivity                                                                                         |
| Language               | English (United States)                                                                              |
| Primary functionality  | Cookie & site-data cleaner                                                                           |
| Single purpose         | See statement above.                                                                                 |
| Permissions            | See justification table.                                                                             |
| Privacy policy URL     | **TODO** — operator must host this URL publicly before submission. Placeholder: `https://<operator-domain>/1132-fixer-chrome/privacy`. Content can mirror **Privacy posture** in README.md. **Do not invent a URL.** |

### Long description (paste into store form, ≤16 000 chars — currently ~1.3 KB)

> 1132 Fixer is the one-click cleaner for Zoom error 1132 and other "stale-cookie" sign-in loops in Chrome.
>
> When you're on `zoom.us`, the popup shows a **ZOOM DETECTED** banner with a single **FIX ZOOM** button. One click clears your Zoom cookies, `localStorage`, `sessionStorage`, Cache API, and IndexedDB for `zoom.us` and `zoom.com`, then reloads the active Zoom tab. That's it.
>
> Need finer control on another site? The same popup includes a manual picker: **Current site / Custom domain / All sites**, with checkboxes for the data types you want to clear. The active tab reloads only if it matches the scope you picked.
>
> **What it does not do**
>
> - No data collection. No analytics. No telemetry.
> - No remote code. Every script ships in the package.
> - No external network requests at any point.
> - No auto-clearing. Opening the popup never deletes anything by itself — every clear requires an explicit click.
> - No reading of your cookies or storage. The extension only **deletes**; it never reads or transmits values.
> - The global HTTP cache is never touched by per-domain operations — only by the explicit **All sites** scope.
>
> **Permissions, in plain English**
>
> - `cookies` — delete Zoom (or your chosen) cookies.
> - `browsingData` — delete the matching per-origin `localStorage`, Cache API, IndexedDB, and service workers.
> - `activeTab` — read the active tab's URL so the popup can show the Zoom banner, and reload that tab after a successful clear.
> - `scripting` — run a single `sessionStorage.clear()` line in the active tab after you click. No DOM is read.
> - Host access — required by Chrome's `cookies`/`browsingData` APIs to operate on the domain you select.
>
> **Open source**
>
> Built as the Chrome sibling of [1132 Fixer for Windows](https://github.com/PrimeUpYourLife/1132-Fixer-Windows). MIT licensed. Source: <https://github.com/PrimeUpYourLife/1132-Fixer-Chrome>.

## Assets required by the store

Put generated files in a local `store-assets/` directory (already covered by `.gitignore` via `*.zip` only — add `store-assets/` to `.gitignore` if you'd rather keep them out of version control entirely).

### Promo / icon assets

| Asset                  | Spec                          | Target filename                       | Status   |
| ---------------------- | ----------------------------- | ------------------------------------- | -------- |
| Icon 128×128           | PNG, opaque or transparent    | `icons/icon128.png`                   | present  |
| Small promo tile       | 440×280 PNG                   | `store-assets/promo-440x280.png`      | **TODO** |
| Marquee promo (opt.)   | 1400×560 PNG                  | `store-assets/promo-1400x560.png`     | **TODO** |

### Screenshots checklist

Capture at 1280×800 (preferred) or 640×400. Suggested filenames make it obvious which row of the manual test produced each shot:

| # | Subject                                                              | Required? | Target filename                                  | Status   |
| - | -------------------------------------------------------------------- | --------- | ------------------------------------------------ | -------- |
| 1 | Popup open on `https://zoom.us` showing **ZOOM DETECTED** banner     | yes       | `store-assets/screenshot-1-zoom-detected.png`    | **TODO** |
| 2 | Popup right after a successful **FIX ZOOM** (status badge `ZOOM CLEARED`, log entries visible) | yes | `store-assets/screenshot-2-zoom-cleared.png` | **TODO** |
| 3 | Popup open on a non-Zoom site (e.g. `https://example.com`) — Zoom banner absent, scope picker visible | yes | `store-assets/screenshot-3-non-zoom.png` | **TODO** |
| 4 | Popup with **Custom domain** picked and a domain typed, ready for **FIX NOW** | yes | `store-assets/screenshot-4-custom-domain.png`    | **TODO** |
| 5 | `chrome://extensions` details page showing minimal permissions (`cookies`, `browsingData`, `activeTab`, `scripting`, host access) | optional but persuasive | `store-assets/screenshot-5-permissions.png` | **TODO** |

## Manual test checklist before submitting

Run every row of the **Manual test checklist** in [README.md](README.md). Capture the screenshots above while you walk it. Do not edit screenshots in a way that hides real UI state (status badge, version, log lines).

## Package zip — verified contents

Running the packaging command above produces a 113 KB zip with exactly these entries (no `.git`, no `scripts/`, no `STORE_PREP.md`, no `.gitignore`, no `store-assets/`):

```
icons/icon.png         (source 144×144 — safe to ship as the brand asset)
icons/icon16.png
icons/icon48.png
icons/icon128.png
manifest.json
popup.html
popup.css
popup.js
LICENSE
README.md
```

`manifest.json` is at the top level of the zip (Chrome Web Store requirement).

## Known limitations to disclose

- **HTTP cache** is browser-global and is never wiped from per-domain operations. The **All sites** scope is the only path that touches it.
- **`sessionStorage`** can only be cleared in the active tab — closed Zoom tabs in other windows are not reached.
- **IndexedDB enumeration** depends on `indexedDB.databases()` availability inside `chrome.browsingData` and varies by Chrome version. The extension reports per-domain clear status truthfully; it does not claim success when the platform reports failure.

## Source-level validation gate before packaging

```bash
node scripts/validate-extension.js
```

Must exit 0. If any check fails, fix and re-run before zipping.

## Browser-executed validation status

| Method                                              | Status                                                                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Source-level validator (`scripts/validate-extension.js`) | **PASS** — 51/51, run before every push.                                                                            |
| `chrome://extensions` → Load unpacked → walk manual checklist | **PENDING — operator** (Claude harness Chrome tier is `read`-only and cannot drive the install flow).         |
| Playwright/Chromium extension harness                | **Not built.** Would require `playwright` + a `--load-extension=$PWD` Chromium launch and would still need a real signed-in Zoom session to fully exercise the cookie clear. Track as future work; not a blocker for source review or store packaging. |

The operator must execute the **Manual test checklist** rows 1–9 in [README.md](README.md), capture the screenshots above, and confirm no popup or service-worker console errors before any submission.

## Remaining submission blockers

| Blocker                                | Owner    | Approval phrase to unblock                                                              |
| -------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| Public privacy policy URL              | operator | `APPROVE_1132_CHROME_PRIVACY_URL=<https://...>`                                         |
| 440×280 promo tile                     | operator | `APPROVE_1132_CHROME_PROMO_TILE_DELIVERED`                                              |
| 5 store screenshots (above)            | operator | `APPROVE_1132_CHROME_STORE_SCREENSHOTS_DELIVERED`                                       |
| Real browser/manual proof walk         | operator | `APPROVE_1132_CHROME_MANUAL_BROWSER_PROOF_COMPLETE`                                     |
| Chrome Web Store submission            | operator | `APPROVE_1132_CHROME_WEB_STORE_SUBMIT` (only after the four above are satisfied)        |

## Submission step (requires separate approval)

Do **not** upload to <https://chrome.google.com/webstore/devconsole> until the operator explicitly authorizes the submission with `APPROVE_1132_CHROME_WEB_STORE_SUBMIT`. Submission is irreversible in terms of public visibility once approved.
