<p align="center">
  <img src="assets/social-preview.png" alt="1132 Fixer for Chrome — A focused browser cleanup for Zoom error 1132" width="960">
</p>

<h1 align="center">1132 Fixer for Chrome</h1>

<p align="center">
  <strong>A focused browser cleanup for Zoom error 1132.</strong><br>
  Clears Zoom cookies and this tab's Zoom site data, then reloads the current Zoom tab.
</p>

<p align="center">
  <img alt="Chrome Manifest V3" src="https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&amp;logoColor=white">
  <img alt="Local only" src="https://img.shields.io/badge/Privacy-Local%20only-39D353">
  <img alt="Zoom only" src="https://img.shields.io/badge/Scope-Zoom%20only-3A82F7">
  <img alt="MIT license" src="https://img.shields.io/badge/License-MIT-8FC2FF">
  <a href="https://github.com/1132-Fixer/chrome/actions/workflows/ci.yml"><img alt="Build status" src="https://github.com/1132-Fixer/chrome/actions/workflows/ci.yml/badge.svg"></a>
</p>

<p align="center">
  <a href="https://1132-fixer.xyz/"><strong>Visit Website</strong></a>
  &nbsp;•&nbsp;
  <a href="https://github.com/1132-Fixer/chrome/issues/new"><strong>Feedback &amp; Report</strong></a>
  &nbsp;•&nbsp;
  <a href="PRIVACY_POLICY.md"><strong>Privacy Policy</strong></a>
  &nbsp;•&nbsp;
  <a href="https://github.com/PrimeUpYourLife/1132-Fixer-Windows/releases/latest"><strong>Windows App</strong></a>
</p>

---

## One button. One job.

1. Open a page on `zoom.us` or `zoom.com`.
2. Open the 1132 Fixer extension.
3. Press **FIX ZOOM**.

The extension removes Zoom cookies and this tab's Zoom site data, then reloads the tab. It does not clear data from other sites. Nothing is removed until you press **FIX ZOOM**.

## What it changes

| Item | Result |
|---|---|
| Zoom cookies on `zoom.us` and `zoom.com` | **Cleared** |
| Zoom subdomain cookies | **Cleared** |
| Active Zoom tab `localStorage` / `sessionStorage` | **Cleared** |
| Active Zoom tab Cache API | **Cleared** |
| Active Zoom tab IndexedDB | **Cleared** |
| Other websites | Not touched |
| Global HTTP cache | Not touched |
| Service workers | Not touched |

Cookie values are never shown. The popup reports how many Zoom cookies were removed and whether this tab's Zoom site data was cleared.

## Simple by design

- 🖱️ **One main button** — no setup screen and no extra options.
- 🎯 **Zoom only** — the extension only asks for access to Zoom hosts.
- 🔒 **Local work** — cookie clearing happens in Chrome on your device.
- ✋ **You stay in control** — nothing is removed until you press **FIX ZOOM**.
- 🚫 **No tracking** — no analytics, telemetry, or background data upload.
- 🧹 **Zoom-origin only** — other sites, the global HTTP cache, and service workers stay in place.

The website and feedback links open only when you click them.

## Install for testing

The public store release has its own review process. Developers can load this folder directly:

1. Download or clone this repo.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Select **Load unpacked**.
5. Choose this repo folder.
6. Pin **1132 Fixer** to the Chrome toolbar.

On Windows, `install.bat` opens the right Chrome page and folder. It does not install the extension by itself.

## Permissions

| Permission | Why it is needed |
|---|---|
| `cookies` | Finds and removes Zoom cookies. |
| `activeTab` | Checks the open tab and reloads it after the fix. |
| `scripting` | Injects a one-shot, origin-checked cleaner into the active Zoom tab so localStorage, sessionStorage, Cache API, and IndexedDB can be cleared there. Nothing is injected on install or page load. |
| `zoom.us` and `zoom.com` hosts | Allows cookie access and the click-time inject only for Zoom sites. |

The extension does not request `<all_urls>`, `browsingData`, `history`, or `tabs`. `scripting` is the minimum extra permission the in-page Zoom-origin cleaner needs; `browsingData` is not added because it cannot clear sessionStorage and is broader than the current Zoom tab.

## If the button does not appear

- Open a tab on `zoom.us` or `zoom.com`.
- Open the extension again.
- If the popup says **NOT ZOOM**, check the address in the active tab.
- If Error 1132 remains, try the [Windows app](https://github.com/PrimeUpYourLife/1132-Fixer-Windows/releases/latest) or send a [Feedback & Report](https://github.com/1132-Fixer/chrome/issues/new).

## Current support status

The **Feedback & Report** link opens the extension's own Report-a-Bug page. While the support service is being activated, that page shows a GitHub-issues link; once the service is live it offers an in-extension bug-report form with an optional screenshot attachment (see `PRIVACY_POLICY.md` — "Bug reports"). The verified live rating system is still being built and is not part of the extension yet.

<details>
<summary><strong>For developers</strong></summary>

### Run checks

```bash
npm test
node scripts/validate-extension.js
node scripts/test-popup-e2e.js
```

The checks protect these rules:

- one main button;
- Zoom-only host access;
- user-triggered Zoom-origin cleanup only;
- no automatic clearing;
- no remote runtime code;
- all popup files are included in the store package;
- the version is the same in every file;
- the footer stays on one row;
- the header logo has no extra dark holder.

### Build a release package

```bash
npm run version:print
npm run bump
npm run release
```

Use `scripts/bump-version.js` to change the version. It updates `manifest.json`, `package.json`, and the popup version badge together.

### Build store images

```bash
npm run assets
npm run assets:details
npm run assets:verify
```

See [STORE_PREP.md](STORE_PREP.md) for the full Chrome Web Store checklist.

### Main files

| File | Purpose |
|---|---|
| `manifest.json` | Chrome settings and permissions. |
| `popup.html` | Popup layout. |
| `popup.css` | Shared navy and blue theme. |
| `popup.js` | Zoom detection, Zoom-origin cleanup, and reload. |
| `icons/` | Toolbar, store, and transparent header icons. |
| `scripts/validate-extension.js` | Source and safety checks. |
| `scripts/test-popup-e2e.js` | Browser behavior checks. |
| `STORE_PREP.md` | Store release checklist. |

</details>

## Independent project

1132 Fixer is not made by or linked to Zoom Video Communications, Inc.

## License

[MIT](LICENSE)
