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
| Privacy policy URL     | **TODO** — operator must host the canonical text from [PRIVACY_POLICY.md](PRIVACY_POLICY.md) publicly before submission. Placeholder string only: `https://<operator-domain>/1132-fixer-chrome/privacy`. **Do not invent a URL.** |

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
| Small promo tile       | 440×280 PNG (**required by store**) | `store-assets/promo-440x280.png`      | **TODO** |
| Marquee promo          | 1400×560 PNG (optional)       | `store-assets/promo-1400x560.png`     | **TODO** |

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
| 1 | `store-assets/01-zoom-detected.png`                      | Popup open on `https://zoom.us` with **ZOOM DETECTED** banner visible.                                        | Banner shows the real host, **FIX ZOOM** button is rendered, status badge says `READY · zoom.us`.   | **yes**                 | **TODO** |
| 2 | `store-assets/02-fix-complete.png`                       | Popup taken immediately after a successful **FIX ZOOM** click, before the Zoom tab reload finishes.           | Status badge reads `ZOOM CLEARED`, log shows `-- zoom.us --` / `-- zoom.com --` and `Zoom data cleared`. | **yes**                 | **TODO** |
| 3 | `store-assets/03-non-zoom-safe.png`                      | Popup on a clearly non-Zoom site such as `https://example.com`.                                               | **No** ZOOM DETECTED banner. Scope picker is visible (default **Current site** chip selected).      | **yes**                 | **TODO** |
| 4 | `store-assets/04-extension-details-permissions.png`      | `chrome://extensions` → **Details** page for 1132 Fixer.                                                      | Lists exactly the four permissions (`cookies`, `browsingData`, `activeTab`, `scripting`) and the host access line. Site access is set to "On all sites" because of the **All sites** scope. | recommended (persuasive) | **TODO** |
| 5 | `store-assets/05-manual-picker.png`                      | Popup with **Custom domain** selected and a domain typed in the input, ready to click **FIX NOW**.            | Demonstrates the manual flow is intentional and separate from FIX ZOOM.                             | **yes**                 | **TODO** |

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

- **HTTP cache** is browser-global and is never wiped from per-domain operations. The **All sites** scope is the only path that touches it.
- **`sessionStorage`** can only be cleared in the active tab — closed Zoom tabs in other windows are not reached.
- **IndexedDB enumeration** depends on `indexedDB.databases()` availability inside `chrome.browsingData` and varies by Chrome version. The extension reports per-domain clear status truthfully; it does not claim success when the platform reports failure.

## Source-level validation gate before packaging

```bash
node scripts/validate-extension.js
```

Must exit 0. If any check fails, fix and re-run before zipping.

## Copy-paste-ready Chrome Web Store form

Use the values below verbatim when filling out the Web Store dev console. Anything in **`«angle braces»`** must be supplied by the operator before submission.

### Store listing tab

```text
Name:               1132 Fixer
Summary (≤132):     One-click Zoom 1132 cleaner: clears Zoom cookies, storage, and cache, then reloads.
Category:           Productivity
Language:           English (United States)
Detailed description:
    «paste the "Long description (paste into store form ..." block from this file»
Icon (128×128):     icons/icon128.png
Small promo tile:   store-assets/promo-440x280.png
Marquee promo:      store-assets/promo-1400x560.png  (optional)
Screenshots:        store-assets/01-zoom-detected.png
                    store-assets/02-fix-complete.png
                    store-assets/03-non-zoom-safe.png
                    store-assets/04-extension-details-permissions.png
                    store-assets/05-manual-picker.png
Official URL:       https://github.com/PrimeUpYourLife/1132-Fixer-Chrome
Homepage URL:       https://github.com/PrimeUpYourLife/1132-Fixer-Chrome
Support URL:        «operator-hosted support page or GitHub issues URL»
```

### Privacy practices tab

```text
Single purpose:
    1132 Fixer clears the user's own site data — cookies, localStorage,
    sessionStorage, Cache API, and IndexedDB — for the active site, a chosen
    domain, or all sites, with a dedicated one-click shortcut for zoom.us to
    mitigate Zoom error 1132.

Permission justifications:
    cookies        → «paste the cookies row from Permission justifications above»
    browsingData   → «paste the browsingData row»
    activeTab      → «paste the activeTab row»
    scripting      → «paste the scripting row»
    Host «all_urls»→ «paste the host row»

Privacy policy URL: «operator-hosted public URL of PRIVACY_POLICY.md»

Data usage disclosures:
    Personally identifiable information ... NOT collected
    Health information ......................... NOT collected
    Financial and payment information .......... NOT collected
    Authentication information ................. NOT collected
    Personal communications .................... NOT collected
    Location ................................... NOT collected
    Web history ................................ NOT collected
    User activity .............................. NOT collected
    Website content ............................ NOT collected

Certifications:
    [x] I do not sell or transfer user data to third parties outside the approved use cases.
    [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
    [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

Remote code use: No
```

### Distribution tab

```text
Visibility:       Public  (only after manual proof + operator approval)
Geographic regions: All regions
Pricing:          Free
```

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
