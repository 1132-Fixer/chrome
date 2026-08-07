# Chrome Web Store — Submission Prep

This document is the operator's checklist for packaging and listing **1132 Fixer for Chrome** on the Chrome Web Store. It does **not** authorize a submission; that step requires separate explicit approval.

## Single-purpose statement

> 1132 Fixer deletes cookies for `zoom.us` and `zoom.com` (and their subdomains), then reloads the active Zoom tab, to mitigate Zoom error 1132 and similar stale-cookie sign-in loops. Cookies are the only data type it touches.

Every permission below maps directly to this single purpose. The extension does not request access to non-Zoom domains.

## Permission justifications (Web Store form)

| Permission                                                                                        | Justification (paste into store form, ≤1000 chars)                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cookies`                                                                                         | Required to enumerate and remove cookies for zoom.us and zoom.com via chrome.cookies. Cookie values are never read or transmitted; the extension only deletes by name/domain/path.                                                                                                |
| `activeTab`                                                                                       | Read the active tab's URL when the popup opens so the popup can detect zoom.us and show the FIX ZOOM button, and reload that tab after the user-triggered clear completes. No content scripts are injected at install or page-load time.                                          |
| Hosts: `https://*.zoom.us/*`, `https://*.zoom.com/*`, `http://*.zoom.us/*`, `http://*.zoom.com/*` | Required by chrome.cookies to operate on Zoom domains. Both schemes are requested because Chrome maps a non-Secure cookie to an http:// URL and hides it from an https-only extension, so without http the clear would silently miss stale non-Secure Zoom cookies. No content scripts are injected and no page content is read. Host access is scoped to Zoom only — no broader access is requested. |

`browsingData` and `scripting` are **not** requested as of v1.2.0. If the store form still lists justifications for them from the v1.1.0 submission, delete those fields.

## Privacy disclosure draft

- **Personally identifiable information:** none collected.
- **Health information:** none collected.
- **Financial and payment information:** none collected.
- **Authentication information:** none collected. Cookies are **deleted**, not read.
- **Personal communications:** none collected.
- **Location:** none collected.
- **Web history:** none collected.
- **User activity:** none collected.
- **Website content:** never read. The extension runs no content scripts and injects no script at all — the `scripting` permission was dropped in v1.2.0.
- **Remote code use:** none. No remote scripts, styles, fonts, or images. All assets ship in the package.
- **Data transmission:** the extension makes zero network requests.

Tick *I do not collect or transmit user data* in the Privacy Practices form.

## Packaging command

Run from the repo root, on any OS:

```bash
npm run package      # -> store-assets/1132-fixer-chrome-<version>.zip
```

`scripts/package-extension.js` writes the zip itself (no dependencies, no PowerShell), puts `manifest.json` at the zip root as the Web Store requires, uses fixed timestamps so the same tree always produces identical bytes, and refuses to build if any shipped file is missing.

## Release automation

| Step                          | Command / trigger                                                        | Notes                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Bump the version              | `npm run bump` (patch), `npm run bump:minor`, `npm run bump:major`, or `node scripts/bump-version.js 1.4.2` | Updates `manifest.json`, `package.json`, and the popup's version chip together. The validator fails if they ever drift. |
| Automatic bump                | push to `master` that touches `manifest.json`, `popup.*`, or `icons/`     | `.github/workflows/version-bump.yml` patch-bumps and commits `chore(release): vX.Y.Z [skip bump]`. Skipped when the push already changed the version, when the message contains `[skip bump]`, or when the bot itself pushed. |
| Test gate                     | `npm test`, and CI on every push / PR                                     | Source validator + headless-Chromium e2e suite.                                              |
| Build the zip                 | `npm run package`, or `npm run release` (test + package)                  | Deterministic 11-entry zip.                                                                  |
| Upload to the Web Store       | **Actions → Publish to Chrome Web Store → Run workflow**, `mode=upload-draft` | Uploads a draft. Nothing becomes public. Requires the operator to type the expected version as a confirmation. |
| Go public                     | same workflow, `mode=upload-and-publish`                                 | Only with operator approval (see below). Publishing is effectively irreversible.               |

### Secrets the publish workflow needs

| Secret              | Where it comes from                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `CWS_EXTENSION_ID`  | The item id from the Web Store developer dashboard URL.                                                                 |
| `CWS_CLIENT_ID`     | Google Cloud project → APIs & Services → Credentials → OAuth client (type: Desktop app), with the Chrome Web Store API enabled. |
| `CWS_CLIENT_SECRET` | Same OAuth client.                                                                                                     |
| `CWS_REFRESH_TOKEN` | Mint once by authorising that client for scope `https://www.googleapis.com/auth/chromewebstore` and exchanging the resulting code for a refresh token. |

Add all four under **Settings → Secrets and variables → Actions**, and create an Actions **environment** named `chrome-web-store` if you want a required-reviewer gate on top. Until the secrets exist, the workflow fails on its first step with an explicit message and uploads nothing.

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
| `icons/`            | Source 144px + 16/32/48/128 + `popup-logo.png` (transparent popup header mark).                    |
| `LICENSE`           | MIT license, helpful for reviewers.                                                               |
| `README.md`         | Reviewer-readable description of behavior and manual test steps.                                  |
| `PRIVACY_POLICY.md` | Ships the canonical privacy text alongside the runtime so the public hosted URL can be audited against it. |

## Store listing fields

| Field                  | Value                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Name                   | `1132 Fixer`                                                                                         |
| Short description      | `One-click Zoom 1132 cleaner: deletes Zoom cookies, then reloads the tab. Cookies only.` *(132 chars max — currently 86)* |
| Category               | Productivity                                                                                         |
| Language               | English (United States)                                                                              |
| Primary functionality  | Cookie cleaner                                                                                       |
| Single purpose         | See statement above.                                                                                 |
| Permissions            | See justification table.                                                                             |
| Privacy policy URL     | **VERIFIED** — `https://primeupyourlife.github.io/1132-Fixer-Chrome/privacy.html` (HTTPS, public, GitHub Pages, content matches [PRIVACY_POLICY.md](PRIVACY_POLICY.md); fetch returned `200 OK` and page text contains "Privacy Policy", "1132 Fixer", "No telemetry", "user-triggered"). |

### Long description (paste into store form, ≤16 000 chars)

> 1132 Fixer is a one-button cleaner for Zoom error 1132 and other stale-cookie sign-in loops in Chrome. Narrow purpose. Cookies only. Zoom-only host access.
>
> When you're on `zoom.us`, `zoom.com`, or any of their subdomains, the popup shows the detected host and a single **FIX ZOOM** button. One click deletes your `zoom.us` and `zoom.com` cookies, then reloads the active Zoom tab, and tells you how many cookies it removed. That's the whole interface — no options, no checkboxes, nothing to configure.
>
> On any non-Zoom site (or `chrome://` / `about:` pages) the popup shows one line asking you to open a Zoom tab, and no button at all. The extension does not request access to non-Zoom domains and cannot clear data for them.
>
> **What it does not do**
>
> - No storage, cache, or IndexedDB clearing. Cookies are the only data type touched, so your Zoom preferences and cached assets survive.
> - No data collection. No analytics. No telemetry.
> - No remote code. Every script ships in the package.
> - The cookie-clearing action sends no cookie data and makes no direct network request of its own; the tab reload afterwards loads the page normally, like any visit. The website and feedback links open only when you click them.
> - No auto-clearing. Opening the popup never deletes anything by itself — every clear requires an explicit click on FIX ZOOM.
> - No reading of your cookie values. The extension only deletes; it reports a count and nothing else.
> - No access to non-Zoom domains.
> - The global HTTP cache is never wiped.
>
> **Permissions, in plain English**
>
> - `cookies` — delete Zoom cookies.
> - `activeTab` — read the active tab's URL so the popup can tell whether you're on Zoom, and reload that Zoom tab after a successful clear.
> - Host access — `zoom.us` and `zoom.com` only (both `https` and `http`, so non-Secure Zoom cookies are visible too).
>
> **Open source**
>
> Built as the Chrome sibling of [1132 Fixer for Windows](https://github.com/PrimeUpYourLife/1132-Fixer-Windows-Releases/releases/latest). MIT licensed. Source: <https://github.com/PrimeUpYourLife/1132-Fixer-Chrome>.
>
> Independent project. Not affiliated with Zoom Video Communications, Inc.

## Assets required by the store

Generated files go in `store-assets/`, which `.gitignore` excludes — they are rebuilt from the repo on demand, never committed.

### Generating everything

```bash
npm run assets            # popup shots 01-03 + letterbox + both promo tiles + store icon + verify
npm run assets:details    # shot 04, needs a real display (Linux CI: xvfb-run npm run assets:details)
npm run assets:verify     # dimensions + 24-bit-no-alpha check on every asset
```

All generators are Node + Chromium and run on any OS. The equivalent `.ps1` scripts are superseded and kept only for reference. `scripts/lib/png.js` does the 24-bit re-encode, because Chromium always hands back RGBA and the store rejects an alpha channel on promo art.

### Promo / icon assets

| Asset                  | Spec                          | Target filename                       | Status   |
| ---------------------- | ----------------------------- | ------------------------------------- | -------- |
| Icon 128×128           | PNG, opaque or transparent    | `icons/icon128.png`                   | present  |
| Store icon 128×128     | 24-bit PNG, no alpha          | `store-assets/icon128-store.png`      | **VERIFIED 128×128, 24-bit RGB** — `npm run assets` (`scripts/make-store-icon.js`) flattens the shipped icon onto the popup navy. |
| Small promo tile       | 440×280 PNG (**required by store**) | `store-assets/promo-440x280.png`      | **VERIFIED 440×280, 24-bit RGB** — `scripts/make-promo.js`: shipped 1132 icon, shared navy/blue palette, `1132 FIXER` wordmark, tagline "Fix Zoom cookies in one click.", subline "One button. Zoom cookies only. Reload.", and the "Independent project. Not affiliated with Zoom." disclaimer. No Zoom logo. Text auto-fits by measurement, so the copy can change without overflowing. |
| Marquee promo          | 1400×560 PNG (optional)       | `store-assets/promo-1400x560.png`     | **VERIFIED 1400×560, 24-bit RGB** — same generator: `node scripts/make-promo.js 1400 560`. The layout box is centred, so the wider canvas stays balanced. |

Promo-tile content rules (apply to all promo assets):

- Reuse the same 1132 logo and the navy Fluent palette (Windows STYLEGUIDE) already shipping in `icons/icon128.png` and `popup.css`. Do not invent a new visual identity.
- Use the wordmark **"1132 FIXER"**.
- Allowed taglines (pick one): "Fix Zoom 1132. One click." / "Clear Zoom cookies, fast." / "1132? Cleared." Do **not** use Zoom's logo, wordmark, or product art — that risks trademark issues and store rejection.
- Do **not** claim the extension clears storage, cache, or IndexedDB. As of v1.2.0 it clears cookies only, and promo copy that overstates the scope is grounds for rejection.
- Do **not** describe the extension as "official Zoom" anything. It is unaffiliated with Zoom Video Communications, Inc.
- Do **not** show fake screenshots, fabricated UI states, or features the extension does not have.

### Screenshots checklist

Capture at 1280×800 (preferred) or 640×400. Filenames are stable so the manual proof walk maps 1-to-1 onto each row.

| # | Target filename                                          | Subject                                                                                                       | What it must prove                                                                                  | Required?               | Status   |
| - | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------- | -------- |
| 1 | `store-assets/01-zoom-detected.png`                      | Popup open on `https://zoom.us`.                                                                              | State pill reads `READY · zoom.us`, the single **FIX ZOOM** button is rendered, and `Cookies only` appears at the top-right. | **yes**     | **VERIFIED 1280×800, 24-bit RGB** — captured from the real popup, letterboxed onto the popup navy |
| 2 | `store-assets/02-fix-complete.png`                       | Popup immediately after a successful **FIX ZOOM** click.                                                       | State pill reads `CLEARED` and the result line reports the outcome (a cookie count on a real session; "No Zoom cookies were left to remove." against the empty mocked jar). | **yes**     | **VERIFIED 1280×800, 24-bit RGB** — result line preserved verbatim, nothing staged  |
| 3 | `store-assets/03-non-zoom-safe.png`                      | Popup on a clearly non-Zoom site such as `https://example.com`.                                               | State pill reads `NOT ZOOM` in neutral grey, **no button at all**, one line telling the user to open a Zoom tab.            | **yes**     | **VERIFIED 1280×800, 24-bit RGB**                                                  |
| 4 | `store-assets/04-extension-details-permissions.png`      | `chrome://extensions` → **Details** page for 1132 Fixer.                                                      | Shows the real Details page: version `1.2.0`, ID, an **empty Permissions row**, and Site access listing exactly the four Zoom host patterns — no browsing-data permission anywhere. | recommended | **VERIFIED 1280×800, 24-bit RGB on v1.2.0** — real load-unpacked Chromium; the capture scrolls the details container so every host pattern is in frame |

The former 05-manual-picker.png was deleted along with the manual / Custom domain / All sites scope feature in v1.1.0. The Web Store accepts up to 5 screenshots — uploading 4 is allowed.

Notes:

- Do **not** edit, blur, or stage these screenshots in a way that hides real UI state (status badge text, version chip, log lines, permission list).
- Do **not** capture or include screenshots that show real Zoom meeting content, account email, or any other personal information. The popup itself shows only the host and a count — keep it that way.
- The extension popup is 360 px wide as of v1.2.0; capture either at native size or scale the OS window so the popup remains the dominant element.

## Manual test checklist before submitting

Run every row of the **Manual test checklist** in [README.md](README.md). Capture the screenshots above while you walk it. Do not edit screenshots in a way that hides real UI state (status badge, version, log lines).

## Package zip — verified contents

Running the packaging command above produces a 13-entry zip. **Verified locally** — see the "Tests / checks run" section of the most recent task report for the exact byte count and entry list. The shape is:

```
icons/icon.png         (source 144×144 — safe to ship as the brand asset)
icons/icon16.png
icons/icon32.png
icons/icon48.png
icons/icon128.png
icons/popup-logo.png   (transparent popup header mark)
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

- **Cookies only.** As of v1.2.0 the extension does not clear `localStorage`, `sessionStorage`, Cache API, IndexedDB, service workers, or the global HTTP cache — for Zoom or anyone else. If a 1132 loop survives a cookie clear, the operator should point users at Chrome's **Settings → Privacy and security → Delete browsing data** for the heavier options.
- **Partitioned (CHIPS) cookies** are best-effort. The extension asks for the Zoom-top-level partition in addition to the unpartitioned jar; Chrome builds that reject the `partitionKey` filter simply return the unpartitioned set. Zoom cookies partitioned under some *other* top-level site cannot be enumerated by any extension without knowing that site.
- **Current profile only.** Cookies are cleared in the cookie store of the profile the popup is running in. An incognito window's jar is separate and is only reachable if the user has allowed the extension in incognito and opens the popup there.
- **No non-Zoom support.** Host permissions are scoped to `zoom.us` and `zoom.com`.

## Validation gate before packaging

```bash
node scripts/validate-extension.js    # source and safety checks
node scripts/test-popup-e2e.js        # headless-Chromium behavior checks
# or: npm test
```

Both must exit 0. If any check fails, fix and re-run before zipping. CI (`.github/workflows/ci.yml`) runs the same two commands on every push and pull request.

## Copy-paste-ready Chrome Web Store form

> **The finished, field-by-field copy now lives in [STORE_LISTING.md](STORE_LISTING.md)**, in dashboard tab order, with `npm run listing:verify` checking every field against the store's character limits. The summary below is kept as a quick reference; STORE_LISTING.md is what you paste from.

Use the values below verbatim when filling out the Web Store dev console. Anything in **`«angle braces»`** must be supplied by the operator before submission.

### Store listing tab

```text
Name:               1132 Fixer for Chrome
Summary (≤132):     One-click Zoom cookie cleaner. Clears zoom.us and zoom.com cookies, then reloads the active Zoom tab.
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
    1132 Fixer deletes cookies for zoom.us and zoom.com (and their subdomains),
    then reloads the active Zoom tab, to mitigate Zoom error 1132 and similar
    stale-cookie sign-in loops. Cookies are the only data type it touches.

Permission justifications (paste each verbatim into the matching field):
    cookies        → «paste the cookies row from Permission justifications above»
    activeTab      → «paste the activeTab row»
    Host permission→ «paste the Hosts row»
    (browsingData and scripting are no longer requested — remove any leftover
     justification text for them from the v1.1.0 submission.)

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
| Source-level validator (`scripts/validate-extension.js`)                      | **PASS** — run before every push and in CI. It protects the cookies-only scope, one-primary-action layout, version sync, approved links, package contents, and transparent header logo. |
| Popup end-to-end suite (`scripts/test-popup-e2e.js`)                          | **PASS** — the real popup runs in headless Chromium against a recording `chrome.*` mock. It checks exact cookie removal, Zoom-only behavior, honest errors, one tab reload, and no runtime network requests. |
| Playwright headless Chromium against `file:///popup.html` (mocked `chrome.*`) | **PASS** — `scripts/capture-screenshots.js` renders the real popup HTML/CSS/JS end-to-end and regenerated shots 01–03 for the v1.2.0 one-button UI. |
| Real Chromium load-unpacked via Playwright `launchPersistentContext --load-extension` | **PASS on v1.2.0** — `scripts/capture-extension-details.js` loaded the unpacked repo, discovered the item id, and captured the Details page. Chrome itself reports version `1.2.0`, an empty Permissions row, and Site access limited to the four Zoom patterns — independent confirmation that `browsingData` and `scripting` are gone. |
| Real Chrome operator walk against live `zoom.us`                              | **pending** — the harness Chromium carries no signed-in Zoom session, so the "signed out after clear, preferences survive" rows of the README checklist need an operator run. |

### Self-proof manual block (Claude harness, v1.2.0 cookies-only)

```text
Chrome version:               Playwright Chromium 1.56.1 (headless)
OS:                           Linux (CI container)
Date/time:                    2026-08-04
Source validator:             PASS
Popup e2e suite:              PASS
Zoom host detected:           yes — state pill `READY · zoom.us`, single FIX ZOOM button (screenshot 01)
Subdomain detected:           yes — `READY · us02web.zoom.us` (e2e scenario 5)
FIX ZOOM completed:           yes — pill reached CLEARED (screenshot 02); with a stocked mock jar, all 4 cookies removed exactly once
Non-Secure cookie handled:    yes — removed via http:// URL (e2e scenario 1)
Partitioned cookie handled:   yes — partitionKey round-tripped to cookies.remove (e2e scenario 2)
Partial failure honest:       yes — "Removed 3 Zoom cookies; 1 could not be removed." + PARTIAL pill (e2e scenario 4)
Unreadable jar honest:        yes — ERROR pill, no removal attempted (e2e scenario 6)
Non-Zoom / lookalike hosts:   no button, no cookie read, nothing removed (example.com, chrome://extensions, zoom.us.evil.com, evilzoom.us)
Non-cookie APIs touched:      none — chrome.browsingData / scripting / storage never read
Popup console errors:         none (pageerror handler across all 9 scenarios)
Network requests:             none beyond file:// (request handler across all 9 scenarios)
Store zip:                    11 entries, manifest.json at root, `unzip -t` reports no errors
Details page (real Chrome):   version 1.2.0, empty Permissions row, Site access = the four Zoom patterns only
Store assets:                 7/7 conform (dimensions + 24-bit RGB, no alpha) per npm run assets:verify
Not covered here:             live signed-in zoom.us walk
```

## Remaining submission blockers

| Blocker                                | Owner    | Status                                                                                                                                                       |
| -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public privacy policy URL              | Claude   | **DONE** — `https://primeupyourlife.github.io/1132-Fixer-Chrome/privacy.html` (HTTPS, 200 OK, content matches `PRIVACY_POLICY.md`).                          |
| 440×280 promo tile (24-bit PNG)        | Claude   | **DONE for v1.2.0** — regenerated with cookies-only copy, verified 440×280 / 24-bit RGB.                                                                      |
| 1400×560 marquee promo (optional)      | Claude   | **DONE for v1.2.0** — regenerated and re-centred, verified 1400×560 / 24-bit RGB.                                                                             |
| 128×128 store icon (24-bit PNG)        | Claude   | **DONE for v1.2.0** — verified 128×128 / 24-bit RGB.                                                                                                          |
| 4 store screenshots (1280×800)         | Claude   | **DONE for v1.2.0** — `store-assets/01–04-*.png`, each verified 1280×800 / 24-bit RGB by `npm run assets:verify`. The former `05-manual-picker.png` is gone with the feature. |
| Browser proof                          | Claude   | **DONE for v1.2.0** — source 97/97 + popup e2e 90/90 + headless popup screenshots 01–03. Screenshot #04 (Details page) still needs a v1.2.0 re-capture.       |
| Chrome Web Store re-upload             | operator | **REQUIRED for v1.2.0** — v1.1.0 is what the store currently holds. v1.2.0 drops the `browsingData` and `scripting` permissions and adds the two `http://` Zoom host patterns, so the Privacy tab justifications must be re-filled (see the tables above) and the listing copy replaced with the v1.2.0 long description. |
| Chrome Web Store submission            | operator | **NOT SUBMITTED for v1.2.0.** The v1.1.0 submission went in 2026-05-22 (item id per the dashboard, publisher `High-Texas`). Automation is ready — Actions → *Publish to Chrome Web Store* — but it needs the four `CWS_*` secrets and explicit approval before it can run. |

## Submission step (requires separate approval)

Publishing is gated deliberately, in three places:

1. The publish workflow is `workflow_dispatch` only — no push, tag, or merge can trigger it.
2. Its default mode is `upload-draft`, which uploads without making anything public.
3. It requires the operator to type the expected version, and fails if the manifest disagrees.

Do **not** run it in `upload-and-publish` mode, and do not upload through <https://chrome.google.com/webstore/devconsole>, until the operator explicitly authorizes the submission with `APPROVE_1132_CHROME_WEB_STORE_SUBMIT`. Once an item is published, public visibility cannot be cleanly undone.
