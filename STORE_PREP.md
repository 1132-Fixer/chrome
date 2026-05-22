# Chrome Web Store — Submission Prep

This document is the operator's checklist for packaging and listing **1132 Fixer for Chrome** on the Chrome Web Store. It does **not** authorize a submission; that step requires separate explicit approval.

## Single-purpose statement

> 1132 Fixer clears Zoom-only site data — cookies, `localStorage`, `sessionStorage`, Cache API, IndexedDB, and service worker registrations — for `zoom.us` and `zoom.com` (and their subdomains), then reloads the active Zoom tab, to mitigate Zoom error 1132 and similar stale-cookie sign-in loops.

Every permission below maps directly to this single purpose. The extension does not request access to non-Zoom domains.

## Permission justifications (Web Store form)

| Permission                                          | Justification (paste into store form, ≤1000 chars)                                                                                                                                                                                                                                |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cookies`                                           | Required to enumerate and remove cookies for zoom.us and zoom.com via chrome.cookies. Cookie values are never read or transmitted; the extension only deletes by name/domain/path.                                                                                                |
| `browsingData`                                      | Required for per-origin clearing of localStorage, cacheStorage, indexedDB, and serviceWorkers for zoom.us and zoom.com via chrome.browsingData.remove({origins}). Used only after an explicit user click on FIX ZOOM.                                                              |
| `activeTab`                                         | Read the active tab's URL when the popup opens so the popup can detect zoom.us and show the ZOOM DETECTED banner, and reload that tab after the user-triggered clear completes. No content scripts are injected at install or page-load time.                                     |
| `scripting`                                         | Required to inject a single line, sessionStorage.clear(), into the active tab. sessionStorage is per-tab and cannot be cleared by chrome.browsingData. Injection only happens after the user clicks FIX ZOOM, only on the active Zoom tab, and runs no DOM read.                  |
| Host: `https://*.zoom.us/*`, `https://*.zoom.com/*` | Required by chrome.cookies and chrome.browsingData to operate on Zoom domains. The extension does not inject content scripts at install or page-load time and does not read page content. Host access is scoped to Zoom only — no broader access is requested.                    |

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
Compress-Archive -Path manifest.json,popup.html,popup.css,popup.js,icons,LICENSE,README.md,PRIVACY_POLICY.md -DestinationPath 1132-fixer-chrome.zip -Force
```

The zip's top level must contain `manifest.json` (not a wrapping folder).

### Intentional exclusions from the zip

| Excluded                         | Reason                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------- |
| `.git/`                          | Source-control metadata; not addressable from the path list.                        |
| `scripts/`                       | Dev tooling (validator, icon builder); not runtime code.                            |
| `.gitignore`                     | Dev hygiene; irrelevant to the shipped extension.                                   |
| `store-assets/`                  | Operator-produced promo + screenshots; only used during store submission, not at runtime. |
| `STORE_PREP.md`                  | Internal submission checklist; reviewers don't need it and shipping it leaks process notes. |
| `install.bat`                    | Windows-only local install helper; not extension runtime. Shipping it would confuse Web Store reviewers. |
| `1132-fixer-chrome.zip`          | The zip itself; gitignored.                                                         |
| `MEMORY.md` (if present)         | Local agent memory, never to be shipped.                                            |

### Intentional inclusions in the zip

| Included            | Reason                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `manifest.json`     | Required at zip root.                                                                             |
| `popup.html/css/js` | Extension runtime.                                                                                |
| `icons/`            | All four sizes (source + 16/48/128); ships the brand asset.                                        |
| `LICENSE`           | MIT license, helpful for reviewers.                                                               |
| `README.md`         | Reviewer-readable description of behavior and manual test steps.                                  |
| `PRIVACY_POLICY.md` | Ships the canonical privacy text alongside the runtime so the public hosted URL can be audited against it. |

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
| Privacy policy URL     | **VERIFIED** — `https://primeupyourlife.github.io/1132-Fixer-Chrome/privacy.html` (HTTPS, public, GitHub Pages, content matches [PRIVACY_POLICY.md](PRIVACY_POLICY.md); fetch returned `200 OK` and page text contains "Privacy Policy", "1132 Fixer", "No telemetry", "user-triggered"). |

### Long description (paste into store form, ≤16 000 chars)

> 1132 Fixer is a one-click cleaner for Zoom error 1132 and other stale-cookie sign-in loops in Chrome. Narrow purpose. Zoom-only host access.
>
> When you're on `zoom.us`, `zoom.com`, or any of their subdomains, the popup shows a **ZOOM DETECTED** banner with a single **FIX ZOOM** button. One click clears your Zoom cookies, `localStorage`, `sessionStorage`, Cache API, IndexedDB, and service worker registrations for `zoom.us` and `zoom.com`, then reloads the active Zoom tab. That's it.
>
> On any non-Zoom site (or `chrome://` / `about:` pages) the popup shows a small "Not a Zoom tab" card and offers no action. The extension does not request access to non-Zoom domains and cannot clear data for them.
>
> **What it does not do**
>
> - No data collection. No analytics. No telemetry.
> - No remote code. Every script ships in the package.
> - No external network requests at any point.
> - No auto-clearing. Opening the popup never deletes anything by itself — every clear requires an explicit click on FIX ZOOM.
> - No reading of your cookies or storage. The extension only deletes; it never reads or transmits values.
> - No access to non-Zoom domains. Host permissions are scoped to `https://*.zoom.us/*` and `https://*.zoom.com/*` only.
> - The global HTTP cache is never wiped.
>
> **Permissions, in plain English**
>
> - `cookies` — delete Zoom cookies.
> - `browsingData` — delete per-origin `localStorage`, Cache API, IndexedDB, and service workers for Zoom domains.
> - `activeTab` — read the active tab's URL so the popup can show the Zoom banner, and reload that Zoom tab after a successful clear.
> - `scripting` — run a single `sessionStorage.clear()` line in the active Zoom tab after you click. No DOM is read.
> - Host access — `https://*.zoom.us/*` and `https://*.zoom.com/*` only.
>
> **Open source**
>
> Built as the Chrome sibling of [1132 Fixer for Windows](https://github.com/PrimeUpYourLife/1132-Fixer-Windows). MIT licensed. Source: <https://github.com/PrimeUpYourLife/1132-Fixer-Chrome>.
>
> Independent project. Not affiliated with Zoom Video Communications, Inc.

## Assets required by the store

Put generated files in a local `store-assets/` directory (already covered by `.gitignore` via `*.zip` only — add `store-assets/` to `.gitignore` if you'd rather keep them out of version control entirely).

### Promo / icon assets

| Asset                  | Spec                          | Target filename                       | Status   |
| ---------------------- | ----------------------------- | ------------------------------------- | -------- |
| Icon 128×128           | PNG, opaque or transparent    | `icons/icon128.png`                   | present  |
| Small promo tile       | 440×280 PNG (**required by store**) | `store-assets/promo-440x280.png`      | **VERIFIED 440×280** — generated by `scripts/make-promo.ps1`; uses existing 1132 icon + dark/amber scheme + wordmark `1132 FIXER` + tagline "Fix Zoom site data in one click." + explicit "Independent project. Not affiliated with Zoom." disclaimer. No Zoom logo. |
| Marquee promo          | 1400×560 PNG (optional)       | `store-assets/promo-1400x560.png`     | not generated (optional)            |

Promo-tile content rules (apply to all promo assets):

- Reuse the same 1132 logo and dark / amber palette already shipping in `icons/icon128.png` and `popup.css`. Do not invent a new visual identity.
- Use the wordmark **"1132 FIXER"**.
- Allowed taglines (pick one): "Fix Zoom 1132. One click." / "Clear Zoom site data, fast." / "1132? Cleared." Do **not** use Zoom's logo, wordmark, or product art — that risks trademark issues and store rejection.
- Do **not** describe the extension as "official Zoom" anything. It is unaffiliated with Zoom Video Communications, Inc.
- Do **not** show fake screenshots, fabricated UI states, or features the extension does not have.

### Screenshots checklist

Capture at 1280×800 (preferred) or 640×400. Filenames are stable so the manual proof walk maps 1-to-1 onto each row.

| # | Target filename                                          | Subject                                                                                                       | What it must prove                                                                                  | Required?               | Status   |
| - | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------- | -------- |
| 1 | `store-assets/01-zoom-detected.png`                      | Popup open on `https://zoom.us` with **ZOOM DETECTED** banner visible.                                        | Banner shows the real host, **FIX ZOOM** button is rendered, status badge says `READY · zoom.us`.                          | **yes**     | regenerated by `scripts/capture-screenshots.js` against the v1.1.0 zoom-only popup |
| 2 | `store-assets/02-fix-complete.png`                       | Popup taken immediately after a successful **FIX ZOOM** click, before the Zoom tab reload finishes.           | Status badge reads `ZOOM CLEARED`, log shows `-- zoom.us --` / `-- zoom.com --` and `Zoom data cleared`.                    | **yes**     | regenerated; log fields preserved                                                  |
| 3 | `store-assets/03-non-zoom-safe.png`                      | Popup on a clearly non-Zoom site such as `https://example.com`.                                               | **No** ZOOM DETECTED banner. The "Not a Zoom tab" card is visible. Status badge says `NOT ZOOM`. No FIX action.             | **yes**     | regenerated for the v1.1.0 non-Zoom card UI                                        |
| 4 | `store-assets/04-extension-details-permissions.png`      | `chrome://extensions` → **Details** page for 1132 Fixer.                                                      | Shows real `1132 Fixer for Chrome` Details page (name, version `1.1.0`, ID, description, Site access scoped to Zoom hosts). | recommended | regenerated against the v1.1.0 unpacked load                                       |

The former 05-manual-picker.png was deleted along with the manual / Custom domain / All sites scope feature in v1.1.0. The Web Store accepts up to 5 screenshots — uploading 4 is allowed.

Notes:

- Do **not** edit, blur, or stage these screenshots in a way that hides real UI state (status badge text, version chip, log lines, permission list).
- Do **not** capture or include screenshots that show real Zoom meeting content, account email, or any other personal information. The popup itself shows only the host and counters — keep it that way.
- The extension popup is 420 px wide; capture either at native size or scale the OS window so the popup remains the dominant element.

## Manual test checklist before submitting

Run every row of the **Manual test checklist** in [README.md](README.md). Capture the screenshots above while you walk it. Do not edit screenshots in a way that hides real UI state (status badge, version, log lines).

## Package zip — verified contents

Running the packaging command above produces an 11-entry zip. **Verified locally** — see the "Tests / checks run" section of the most recent task report for the exact byte count and entry list. The shape is:

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
PRIVACY_POLICY.md
```

`manifest.json` is at the top level of the zip (Chrome Web Store requirement).

## Known limitations to disclose

- **HTTP cache** is browser-global and is never wiped by this extension. The Zoom-only scope only clears per-origin `cacheStorage` (the Cache API), not the global HTTP cache.
- **`sessionStorage`** can only be cleared in the active tab — closed Zoom tabs in other windows are not reached.
- **IndexedDB enumeration** depends on `indexedDB.databases()` availability inside `chrome.browsingData` and varies by Chrome version. The extension reports per-domain clear status truthfully; it does not claim success when the platform reports failure.
- **No non-Zoom support.** As of v1.1.0 the extension's host permissions are scoped to `https://*.zoom.us/*` and `https://*.zoom.com/*`. To clear other sites' data, use Chrome's built-in **Settings → Privacy and security → Clear browsing data** instead.

## Source-level validation gate before packaging

```bash
node scripts/validate-extension.js
```

Must exit 0. If any check fails, fix and re-run before zipping.

## Copy-paste-ready Chrome Web Store form

Use the values below verbatim when filling out the Web Store dev console. Anything in **`«angle braces»`** must be supplied by the operator before submission.

### Store listing tab

```text
Name:               1132 Fixer for Chrome
Summary (≤132):     One-click Zoom site-data cleaner. Clears Zoom cookies, storage, cache, and IndexedDB, then reloads the active Zoom tab.
Category:           Productivity
Language:           English (United States)
Detailed description:
    «paste the "Long description (paste into store form ..." block from this file»
Icon (128×128):     store-assets/icon128-store.png   (24-bit PNG, no alpha)
Small promo tile:   store-assets/promo-440x280.png   (440×280, 24-bit PNG)
Marquee promo:      store-assets/promo-1400x560.png  (1400×560, 24-bit PNG, optional)
Screenshots:        store-assets/01-zoom-detected.png
                    store-assets/02-fix-complete.png
                    store-assets/03-non-zoom-safe.png
                    store-assets/04-extension-details-permissions.png
Official URL:       leave "None" until 1132-fixer.xyz is Search-Console-verified
Homepage URL:       https://github.com/PrimeUpYourLife/1132-Fixer-Chrome
Support URL:        https://github.com/PrimeUpYourLife/1132-Fixer-Chrome/issues
Mature content:     No
Item support:       On
```

### Privacy practices tab

```text
Single purpose:
    1132 Fixer clears Zoom-only site data — cookies, localStorage, sessionStorage,
    Cache API, IndexedDB, and service worker registrations — for zoom.us and
    zoom.com (and their subdomains), then reloads the active Zoom tab, to mitigate
    Zoom error 1132 and similar stale-cookie sign-in loops.

Permission justifications (paste each verbatim into the matching field):
    cookies        → «paste the cookies row from Permission justifications above»
    browsingData   → «paste the browsingData row»
    activeTab      → «paste the activeTab row»
    scripting      → «paste the scripting row»
    Host permission→ «paste the Host row»

Privacy policy URL: https://primeupyourlife.github.io/1132-Fixer-Chrome/privacy.html

Data usage — leave ALL nine checkboxes UNCHECKED:
    Personally identifiable information ... NOT collected
    Health information ......................... NOT collected
    Financial and payment information .......... NOT collected
    Authentication information ................. NOT collected
    Personal communications .................... NOT collected
    Location ................................... NOT collected
    Web history ................................ NOT collected
    User activity .............................. NOT collected
    Website content ............................ NOT collected

Certifications (tick all three):
    [x] I do not sell or transfer user data to third parties outside the approved use cases.
    [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
    [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

Remote code use: No, I am not using remote code
```

### Distribution tab

```text
Visibility:       Public  (only after manual proof + operator approval)
Geographic regions: All regions
Pricing:          Free
```

## Browser-executed validation status

| Method                                                                        | Status                                                                                                                                            |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source-level validator (`scripts/validate-extension.js`)                      | **PASS** — 68/68 on v1.1.0, run before every push. Includes zoom-only safety guards that fail the build if `<all_urls>` or any manual scope code reappears. |
| Playwright headless Chromium against `file:///popup.html` (mocked `chrome.*`) | **PASS** — `scripts/capture-screenshots.js` renders the real popup HTML/CSS/JS end-to-end. Drove `runZoomFix()` to the `ZOOM CLEARED` status badge; verified banner hides and "Not a Zoom tab" card shows on non-Zoom. |
| Real Chromium load-unpacked via Playwright `launchPersistentContext --load-extension` | **PASS** — `scripts/capture-extension-details.js` loaded the unpacked repo as an MV3 extension, discovered its `chrome://extensions` item id, navigated to the Details page, and captured screenshot #04. Extension card showed `On`, version `1.1.0`, description, ID, Site access scoped to Zoom hosts. |
| Real Chrome operator walk against live `zoom.us`                              | optional — the harness Chromium does not carry a signed-in Zoom session. Operator may run the README manual checklist for a second-source proof.   |

### Self-proof manual block (Claude harness, v1.1.0 zoom-only)

```text
Chrome version:               Playwright Chromium (Chrome for Testing 145.0.7632.6)
OS:                           Windows 11 Home (10.0.26200)
Date/time:                    2026-05-22 (local)
zoom.us banner shown:         yes (screenshot 01)
FIX ZOOM completed:           yes (status badge reached ZOOM CLEARED in screenshot 02)
Zoom tab reloaded after clear: yes (popup log line `Reloaded tab: zoom.us` in screenshot 02; mocked chrome.tabs.reload returned success)
Non-Zoom banner hidden:       yes (screenshot 03: "Not a Zoom tab" card visible, NOT ZOOM badge)
Manual picker works:          n/a — manual picker removed in v1.1.0
Popup console errors:         none (Playwright pageerror handler reported zero errors across all three shoots)
Service worker errors:        none (extension is popup-only; no MV3 service worker registered)
Notes:                        v1.1.0 narrows host_permissions to https://*.zoom.us/* and https://*.zoom.com/* only. All-sites / Custom domain / FIX NOW flows deleted along with the all-sites global cache wipe risk.
```

## Remaining submission blockers

| Blocker                                | Owner    | Status                                                                                                                                                       |
| -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public privacy policy URL              | Claude   | **DONE** — `https://primeupyourlife.github.io/1132-Fixer-Chrome/privacy.html` (HTTPS, 200 OK, content matches `PRIVACY_POLICY.md`).                          |
| 440×280 promo tile (24-bit PNG)        | Claude   | **DONE** — `store-assets/promo-440x280.png` (440×280, Format24bppRgb).                                                                                       |
| 1400×560 marquee promo (optional)      | Claude   | **DONE** — `store-assets/promo-1400x560.png` (1400×560, Format24bppRgb).                                                                                     |
| 128×128 store icon (24-bit PNG)        | Claude   | **DONE** — `store-assets/icon128-store.png` (128×128, Format24bppRgb).                                                                                       |
| 4 store screenshots (1280×800)         | Claude   | **DONE** — `store-assets/01–04-*.png` (each 1280×800, Format24bppRgb). The former `05-manual-picker.png` is gone with the feature.                            |
| Browser proof                          | Claude   | **DONE** — source 68/68 + Playwright headless popup proof + real-Chromium load-unpacked Details proof.                                                       |
| Chrome Web Store re-upload             | operator | **REQUIRED** — host-permission narrowing and feature drop in v1.1.0 means the previously uploaded `1132-fixer-chrome.zip` is stale. Upload the rebuilt zip, replace all assets, refresh Privacy tab single purpose + permission justifications, then re-check "Why can't I submit?". |
| Chrome Web Store submission            | operator | **BLOCKED** — requires Google Developer Dashboard login + 2FA. Claude harness cannot drive this flow. Submit only after the re-upload above.                  |

## Submission step (requires separate approval)

Do **not** upload to <https://chrome.google.com/webstore/devconsole> until the operator explicitly authorizes the submission with `APPROVE_1132_CHROME_WEB_STORE_SUBMIT`. Submission is irreversible in terms of public visibility once approved.
