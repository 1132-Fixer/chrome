<p align="center">
  <img src="assets/social-preview.png" alt="1132 Fixer for Chrome — A focused browser cleanup for Zoom error 1132" width="960">
</p>

<h1 align="center">1132 Fixer for Chrome</h1>

<p align="center">
  <strong>A focused browser cleanup for Zoom error 1132.</strong><br>
  Clears Zoom cookies and this tab's Zoom site data, then reloads the current Zoom tab.
</p>

<p align="center">
  <img alt="Source version 1.2.7" src="https://img.shields.io/badge/source-v1.2.7-3A82F7">
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
  <a href="https://github.com/1132-Fixer/windows/releases/latest"><strong>Windows App</strong></a>
</p>

This is the **canonical public source** for the browser extension. Issues, pull requests, and CI live here: [`1132-Fixer/chrome`](https://github.com/1132-Fixer/chrome).

Companion products in the same organization:

- [Windows](https://github.com/1132-Fixer/windows) — helper-account / `user1` profile path
- [macOS](https://github.com/1132-Fixer/macos)

**Source version is 1.2.7** (`manifest.json`). The [Chrome Web Store listing](https://chromewebstore.google.com/detail/fccnmckeeddpkhocebnbfnlapcjllljh) was measured **1.2.1** on 2026-08-23 (226 users). The live store package is older than this tree. This repository does not publish store updates.

---

## What Error 1132 means here

Zoom Error 1132 can survive a reinstall. It is not one single bug.

**In this browser tool**, 1132 is treated as stale Zoom *browser* state: cookies on `zoom.us` / `zoom.com` and this tab's Zoom site data. The extension deletes that Zoom-origin state after you press **FIX ZOOM**, then reloads the tab so the next sign-in starts clean.

**This is not the Windows-profile 1132 path.** The [Windows app](https://github.com/1132-Fixer/windows) resets a local helper account named `user1` and launches Zoom Workplace under that isolated profile. This extension does **not** create Windows accounts, does **not** touch `user1`, does **not** launch `Zoom.exe`, and does **not** isolate a Windows user profile. If a 1132 loop survives a browser clear, use the Windows app.

1132 Fixer is independent of Zoom. It is not made by, endorsed by, or affiliated with Zoom Video Communications, Inc.

## What this extension does

When the active tab is on `zoom.us`, `zoom.com`, or a subdomain of either, the popup shows **ZOOM DETECTED** and a single **FIX ZOOM** button. Opening the popup, or merely detecting Zoom, does not clear anything.

After you press **FIX ZOOM**, and only then, it:

1. Deletes cookies for `zoom.us` and `zoom.com` (including subdomains, and partitioned / CHIPS cookies where the browser supports the filter).
2. Clears this tab's Zoom-origin `localStorage`, `sessionStorage`, Cache API, and IndexedDB via a one-shot, origin-checked inject.
3. Reloads the active Zoom tab when appropriate.
4. Reports a cookie count and whether this tab's Zoom site data was cleared. Cookie and storage **values** are never shown.

On any other site (or `chrome://` / `about:` pages) the popup shows **NOT ZOOM**. **FIX ZOOM** stays hidden.

## What it does not do

| Claim someone might infer | Reality |
|---|---|
| Windows `user1` / isolated-profile repair | **No.** That is the Windows app only. |
| Launch or repair Zoom Workplace (`Zoom.exe`) | **No.** |
| Auto-clear on detect, install, startup, page load, or a timer | **No.** Explicit **FIX ZOOM** only. |
| Other websites | **Not touched.** |
| Global HTTP cache / service workers | **Not touched.** |
| `<all_urls>` or `browsingData` | **Not requested.** |
| Telemetry / analytics / remote runtime code | **None.** |

## Supported browsers

Packages are built from **one** Chrome source tree. One zip is not universal. Chrome-only claims stay on the Chrome package.

| Target | How it is produced | Runtime status |
|---|---|---|
| Chrome | Source `manifest.json` bytes (`npm run package`) | Primary. Load unpacked, or the older store listing above. |
| Edge | Chromium name/description overlay | Packaged. Chromium load-unpacked. |
| Brave | Chromium name/description overlay | Packaged. Not a Brave store listing. |
| Firefox | Overlay adds `browser_specific_settings.gecko` (`1132-fixer@1132-fixer.xyz`, min 115.0) and drops `minimum_chrome_version` | **Packaged only.** Runtime is `MANUAL_VALIDATION_REQUIRED` — no Firefox-browser e2e in this repo. |

`npm run package:all` writes the four zips under `packages/`. This repo does not publish to any store.

## Privacy

- Host access is Zoom only: `zoom.us` and `zoom.com` (http and https, including subdomains).
- Cleanup runs in your browser, on your device, after an explicit click.
- The popup itself makes no network request.
- The optional Report-a-Bug page is the only networked surface, and it sends only what you type and attach, only when you press Submit.
- Full text: [PRIVACY_POLICY.md](PRIVACY_POLICY.md).

## One button. One job.

1. Open a page on `zoom.us` or `zoom.com`.
2. Open the 1132 Fixer extension.
3. Press **FIX ZOOM**.

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
| Windows `user1` / helper profile | Not touched |

## Permissions

| Permission | Why it is needed |
|---|---|
| `cookies` | Finds and removes Zoom cookies. |
| `activeTab` | Checks the open tab and reloads it after the fix. |
| `scripting` | Injects a one-shot, origin-checked cleaner into the active Zoom tab so localStorage, sessionStorage, Cache API, and IndexedDB can be cleared there. Nothing is injected on install or page load. |
| `zoom.us` and `zoom.com` hosts | Allows cookie access and the click-time inject only for Zoom sites. |

The extension does not request `<all_urls>`, `browsingData`, `history`, or `tabs`. `scripting` is the minimum extra permission the in-page Zoom-origin cleaner needs; `browsingData` is not added because it cannot clear sessionStorage and is broader than the current Zoom tab.

## Install unpacked for development

The public store listing is older than this tree (see version note above). Developers can load this folder directly:

1. Clone this repo.
2. Open `chrome://extensions` (Edge: `edge://extensions`; Brave: `brave://extensions`).
3. Turn on **Developer mode**.
4. Select **Load unpacked**.
5. Choose this repo folder.
6. Pin **1132 Fixer** to the toolbar.

On Windows, `install.bat` opens the right Chrome page and folder. It does not install the extension by itself.

Firefox load-unpacked is `MANUAL_VALIDATION_REQUIRED`.

## If the button does not appear

- Open a tab on `zoom.us` or `zoom.com`.
- Open the extension again.
- If the popup says **NOT ZOOM**, check the address in the active tab.
- If Error 1132 remains after **FIX ZOOM**, the cause is not this browser jar — try the [Windows app](https://github.com/1132-Fixer/windows/releases/latest) or send a [Feedback & Report](https://github.com/1132-Fixer/chrome/issues/new).

## Current support status

The **Feedback & Report** link opens the extension's own Report-a-Bug page. While the support service is being activated, that page shows a GitHub-issues link; once the service is live it offers an in-extension bug-report form with an optional screenshot attachment (see `PRIVACY_POLICY.md` — "Bug reports"). The verified live rating system is still being built and is not part of the extension yet.

## Develop, test, and package

```bash
git clone https://github.com/1132-Fixer/chrome.git
cd chrome
npm test
npm run version:print
npm run package
npm run package:all
```

| Command | What it does |
|---|---|
| `npm test` | Validator + popup e2e + package smoke (`validate-extension`, `test-popup-e2e`, `test-packages`). |
| `node scripts/validate-extension.js` | Source and safety checks. |
| `node scripts/test-popup-e2e.js` | Browser behavior checks. |
| `node scripts/test-packages.js` | Four zips exist; Firefox ≠ Chrome; Zoom-only hosts; no `all_urls`. |
| `npm run version:print` | Print the shared `manifest.json` / `package.json` / popup version. |
| `npm run bump` | Patch bump via `scripts/bump-version.js` (do not hand-edit versions). |
| `npm run package` | Chrome zip at `store-assets/1132-fixer-chrome-<version>.zip`. |
| `npm run package:all` | Chrome, Edge, Brave, and Firefox zips under `packages/`. |
| `npm run release` | `npm test` then Chrome `npm run package`. Does not publish. |
| `npm run assets` | Store images. See [STORE_PREP.md](STORE_PREP.md). |

The checks protect these rules:

- one main button;
- Zoom-only host access;
- user-triggered Zoom-origin cleanup only;
- no automatic clearing;
- no remote runtime code;
- all popup files are included in the store package;
- Chrome, Edge, Brave, and Firefox packages exist as separate zips;
- Chrome-only claims stay on the Chrome package;
- the version is the same in every file.

### Main files

| File | Purpose |
|---|---|
| `manifest.json` | Chrome settings and permissions (live Chrome identity). |
| `scripts/browser-targets.js` | Edge / Brave / Firefox manifest overlays. |
| `popup.html` / `popup.css` / `popup.js` | Zoom detection, Zoom-origin cleanup, and reload. |
| `icons/` | Toolbar, store, and transparent header icons. |
| `scripts/validate-extension.js` | Source and safety checks. |
| `scripts/test-popup-e2e.js` | Browser behavior checks. |
| `STORE_PREP.md` | Store release checklist (not a publish). |

## Independent project

1132 Fixer is not made by, endorsed by, or affiliated with Zoom Video Communications, Inc. "Zoom" is their trademark, used here only to describe which site this extension can clear. See [NOTICE.md](NOTICE.md).

## License

[MIT](LICENSE). The 1132 Fixer name, logo, and icons are **not** covered by the MIT licence — see [TRADEMARKS.md](TRADEMARKS.md) and [NOTICE.md](NOTICE.md).
