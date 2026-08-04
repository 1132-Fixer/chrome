# 1132 Fixer for Chrome

Chrome sibling of [1132 Fixer for Windows](https://github.com/PrimeUpYourLife/1132-Fixer-Windows). A Manifest V3 popup extension with **one button** and one job: delete Zoom's cookies and reload the Zoom tab, so Zoom error 1132 and other stale-cookie sign-in loops go away.

## What it does

- **On `zoom.us` / `*.zoom.us` / `zoom.com` / `*.zoom.com`:** the popup shows the detected host and a single **FIX ZOOM** button. One click deletes every cookie Chrome holds for `zoom.us` and `zoom.com` (including subdomains), then reloads the active Zoom tab. You get one line of feedback — how many cookies were removed.
- **On any other site:** no button, no options. One line: open a Zoom tab and click the icon again.
- **Cookies only.** `localStorage`, `sessionStorage`, the Cache API, IndexedDB, service worker registrations, and the global HTTP cache are **never** touched. Zoom's cached assets and preferences survive; so does every other site's data.
- **No auto-clearing.** Every clear is user-triggered. Opening the popup never deletes anything; nothing runs on install, startup, page-load, or a timer.
- **No telemetry. No remote code. No external network calls.** Everything runs locally inside the popup.

## What FIX ZOOM clears

| Data                                                   | Cleared?                                            |
| ------------------------------------------------------ | --------------------------------------------------- |
| Cookies for `zoom.us`, `zoom.com`, and their subdomains | **Yes** — Secure and non-Secure, both schemes, partitioned (CHIPS) cookies included where Chrome supports the partition filter |
| `localStorage` / `sessionStorage`                       | No                                                  |
| Cache API (`cacheStorage`)                             | No                                                  |
| IndexedDB                                              | No                                                  |
| Service worker registrations                           | No                                                  |
| Global HTTP cache                                      | No                                                  |
| Anything belonging to a non-Zoom site                  | No — and Chrome would not permit it                 |

Cookie **values** are never read into the UI or anywhere else. The popup reports a count and nothing more.

## Permissions

| Permission                                                                                      | Why                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `cookies`                                                                                       | Enumerate and delete cookies for `zoom.us` / `zoom.com` via `chrome.cookies`.                                                                                                              |
| `activeTab`                                                                                     | Read the active tab's URL when the popup opens (to detect Zoom) and reload that tab after clearing.                                                                                        |
| Hosts: `https://*.zoom.us/*`, `https://*.zoom.com/*`, `http://*.zoom.us/*`, `http://*.zoom.com/*` | Required by `chrome.cookies` to see Zoom cookies. Both schemes are listed because Chrome maps a **non-Secure** cookie to an `http://` URL and hides it from an https-only extension — without `http` the clear would silently miss those cookies. No non-Zoom host is requested. |

`browsingData` and `scripting` were **removed** in v1.2.0 along with the non-cookie data types. The validator fails the build if either comes back.

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

## Tests

```bash
npm test                              # both suites
node scripts/validate-extension.js    # 97 source-level checks
node scripts/test-popup-e2e.js        # 90 behaviour checks in headless Chromium
```

**`validate-extension.js`** — static gate. Manifest shape and MV3, permissions locked to exactly `cookies` + `activeTab`, zoom-only host permissions with no broad access, version agreement across `manifest.json` / `package.json` / the popup's version chip, referenced files exist, no telemetry or remote-code tokens, no runtime URLs, no inline script or inline handlers (MV3 CSP), the one-button UI invariant (exactly one `<button>`, zero inputs/checkboxes/selects, no log panel, no scope picker), the cookies-only invariant (no `chrome.browsingData`, no `chrome.scripting`, no storage/IndexedDB/cacheStorage/service-worker code, `chrome.cookies.remove` as the only destructive call), no install/startup auto-clear hooks, and unit tests for `isZoomHost` / `normalizeHost` / `hostMatchesBase` (including `zoom.us.evil.com`, `evilzoom.us`, `notzoom.us`) plus `cookieUrl` / `cookieKey`.

**`test-popup-e2e.js`** — end-to-end gate. Loads the real popup in headless Chromium against a recording `chrome.*` mock and asserts actual behaviour: the button appears only on Zoom hosts; a click removes every cookie exactly once (deduplicated across the unpartitioned and partitioned queries); Secure cookies go out over `https`, non-Secure over `http`; `partitionKey` is passed back to `cookies.remove`; the tab reloads once; partial failures and an unreadable cookie jar are reported honestly instead of claiming success; nothing at all happens on `example.com`, `chrome://extensions`, `zoom.us.evil.com`, or `evilzoom.us`; `chrome.browsingData` / `chrome.scripting` / `chrome.storage` are never even read; the popup makes zero non-`file://` requests and raises zero page errors; and the layout stays 360 px wide with one button and no horizontal overflow.

CI runs both suites on every push and pull request — see `.github/workflows/ci.yml`.

## Releasing

```bash
npm run version:print     # current version
npm run bump              # patch bump (also: bump:minor, bump:major)
npm run release           # test + build store-assets/1132-fixer-chrome-<version>.zip
```

`scripts/bump-version.js` is the only supported way to change the version — it updates `manifest.json`, `package.json`, and the popup's version chip together, and the validator fails the build if those three ever drift. Pushes to `master` that touch `manifest.json`, `popup.*`, or `icons/` get an automatic patch bump committed by `.github/workflows/version-bump.yml` (skipped if the push already changed the version, if the message contains `[skip bump]`, or if the bot itself pushed).

`scripts/package-extension.js` writes the store zip with no dependencies on any platform: `manifest.json` at the zip root, fixed timestamps for byte-identical rebuilds, and a hard failure if a shipped file is missing.

Uploading to the Chrome Web Store is a manual, gated workflow — **Actions → Publish to Chrome Web Store**. It defaults to `upload-draft` (nothing goes public), requires the operator to type the expected version, and needs four repository secrets (`CWS_EXTENSION_ID`, `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`). See [STORE_PREP.md](STORE_PREP.md) → *Release automation*.

## Manual test checklist

| # | Step                                                                                | Expected                                                                                     |
| - | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1 | Load unpacked, no errors in `chrome://extensions` for this extension.               | Extension card is green.                                                                     |
| 2 | Visit `https://zoom.us`, open popup.                                                | State pill reads `READY · zoom.us`. One **FIX ZOOM** button. No other controls.               |
| 3 | Visit `https://us02web.zoom.us`, open popup.                                        | State pill reads `READY · us02web.zoom.us`.                                                  |
| 4 | Visit a non-Zoom site (e.g. `https://example.com`), open popup.                     | State pill reads `NOT ZOOM`. No button. One line telling you to open a Zoom tab.              |
| 5 | Open popup on a `chrome://` page.                                                   | Same as row 4.                                                                               |
| 6 | On `https://zoom.us` while signed in, click **FIX ZOOM**.                            | Pill goes `WORKING` → `CLEARED`, result line reports a cookie count, Zoom tab reloads signed out. |
| 7 | Before clicking, note a Zoom preference (e.g. UI language) and some cached asset.   | After the clear they are still there — only cookies were removed.                             |
| 8 | Open DevTools on the popup before clicking. Click **FIX ZOOM**.                      | No JS errors. No network requests.                                                           |
| 9 | `chrome://extensions` → Details → Site access.                                       | Zoom hosts only. Permissions list shows cookies + activeTab, no browsing-data permission.     |

## Privacy posture

- No data collection, no analytics, no remote servers, no account.
- Cookie **values** are never read into JS or shown in the UI — only a count.
- All clears are explicit and user-triggered.
- Independent project. Not affiliated with Zoom Video Communications, Inc.

## Files

| File                            | Purpose                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------- |
| `manifest.json`                 | MV3 manifest. Cookies + activeTab, Zoom-only hosts.                              |
| `popup.html`                    | Popup markup: header, state pill, one button, one result line.                    |
| `popup.css`                     | Styles (1132 dark/amber palette + Zoom-blue button), reduced-motion and forced-colors support. |
| `popup.js`                      | Zoom detection, cookie clear, reload.                                            |
| `icons/`                        | Source `icon.png` + generated 16/48/128.                                         |
| `scripts/validate-extension.js` | Static validator + unit tests.                                                   |
| `scripts/test-popup-e2e.js`     | Headless-Chromium behaviour suite.                                               |
| `scripts/lib/playwright.js`     | Cross-platform resolver for a globally installed Playwright.                     |
| `scripts/capture-screenshots.js`| Regenerates store screenshots 01–03 from the real popup.                          |
| `scripts/capture-extension-details.js` | Captures store screenshot 04 from a real load-unpacked Chromium.           |
| `scripts/make-icons.ps1`        | Regenerate `icon16/48/128.png`.                                                  |
| `STORE_PREP.md`                 | Chrome Web Store packaging checklist + justifications.                            |
| `install.bat`                   | Windows quick-install helper; opens Chrome extensions page and the repo folder.   |
| `PRIVACY_POLICY.md`             | Canonical privacy policy text.                                                   |

## License

MIT.
