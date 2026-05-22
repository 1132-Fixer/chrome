---
layout: default
title: Privacy Policy
description: Privacy policy for the 1132 Fixer Chrome extension. Zoom-only. No data collection, no telemetry, no remote code, no external network calls.
hero_title: Privacy Policy
hero_sub: 1132 Fixer does not collect, transmit, sell, share, or store any personal data. Everything runs locally in your own browser, on Zoom domains only, and only when you click.
permalink: /privacy.html
---

*Last updated: 2026-05-22.*

This is the privacy policy for the **1132 Fixer** Chrome extension distributed via the Chrome Web Store and hosted at <https://github.com/PrimeUpYourLife/1132-Fixer-Chrome>. This document is the canonical source and is also published at <https://primeupyourlife.github.io/1132-Fixer-Chrome/privacy.html>.

## Summary

**1132 Fixer does not collect, transmit, sell, share, or store any personal data.** It operates only on Zoom domains (`zoom.us` and `zoom.com`, including subdomains), only after the user clicks **FIX ZOOM** in the popup, and only inside the user's own browser.

## What the extension does

- It is the Chrome sibling of [1132 Fixer for Windows](https://github.com/PrimeUpYourLife/1132-Fixer-Windows). It exists to mitigate Zoom error 1132 and similar stale-cookie sign-in loops.
- When the active tab is on `zoom.us`, `zoom.com`, or any of their subdomains, the popup shows a **ZOOM DETECTED** banner and a one-click **FIX ZOOM** button. Clicking it clears Zoom-only site data and reloads the active Zoom tab.
- On any other site (or `chrome://` / `about:` pages), the popup shows a small "Not a Zoom tab" card. No clear action is offered or possible — the extension does not request host access to non-Zoom domains.
- All clearing is **user-triggered**. Opening the popup never deletes anything by itself; no install, startup, page-load, or timer hook clears data.

## What data the extension may clear (locally, after a user click)

When the user explicitly clicks **FIX ZOOM**, the extension may delete the following Zoom-scoped data using Chrome's built-in `chrome.cookies`, `chrome.browsingData`, and `chrome.scripting` APIs:

- HTTP cookies for `zoom.us`, `zoom.com`, and their subdomains.
- `localStorage` for the `zoom.us` and `zoom.com` origins.
- Cache API / `cacheStorage` for the `zoom.us` and `zoom.com` origins.
- IndexedDB databases for the `zoom.us` and `zoom.com` origins, when Chrome's `chrome.browsingData` reports support.
- Service worker registrations for the `zoom.us` and `zoom.com` origins.
- `sessionStorage` in the active tab, **only if** that tab is itself a Zoom tab (cleared via a one-line `sessionStorage.clear()` injection — no DOM is read).
- The global HTTP cache is **never** touched. The extension cannot wipe browsing data for any non-Zoom site.

The extension **never reads, transmits, copies, or logs the values** of cookies, storage entries, or page content. Its only operations on this data are **deletion**. The popup log surfaces only counts (for example, `Cookies removed for zoom.us: 17`) — never values.

## What data the extension collects or transmits

- **None.** The extension performs **zero network requests**. It does not contact any first-party or third-party server.
- **No telemetry, analytics, or remote logging.** No Google Analytics, no Mixpanel, no Amplitude, no Sentry, no Segment, no PostHog, no Hotjar, no custom beacon — confirmed by the source-level validator and by the absence of `fetch`, `XMLHttpRequest`, `WebSocket`, and `sendBeacon` from the extension runtime.
- **No remote code.** All scripts and styles ship in the package. Nothing is fetched at runtime, evaluated, or injected from a remote URL. The extension does not use `eval` or `new Function`.
- **No external fonts, images, or stylesheets.**
- **No remote configuration.** Behavior is fixed at install time and changes only via Chrome Web Store updates.
- **No account, sign-in, or identifier of any kind.**

## Permissions, in plain English

| Permission                                          | Used for                                                                                                              |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `cookies`                                           | Enumerate and delete cookies for `zoom.us` and `zoom.com`. Cookie **values** are never read or transmitted.           |
| `browsingData`                                      | Delete per-origin `localStorage`, `cacheStorage`, `indexedDB`, and `serviceWorkers` for `zoom.us` and `zoom.com`.       |
| `activeTab`                                         | Read the active tab's URL when the popup opens (to detect a Zoom tab and show the banner) and reload that tab after a successful clear. |
| `scripting`                                         | Run a single line, `sessionStorage.clear()`, in the active tab after the user clicks **FIX ZOOM**. No DOM is read.    |
| Host: `https://*.zoom.us/*`, `https://*.zoom.com/*` | Required by Chrome's `cookies` and `browsingData` APIs to operate on Zoom domains. **No** other hosts are requested. The extension does not inject content scripts at install or page-load time and does not read page content. |

## Children's privacy

The extension does not target or knowingly process data about children. Because it processes no personal data at all, it imposes no child-specific data risk.

## Changes to this policy

If extension behavior changes in a way that affects this policy, this document will be updated with a new "Last updated" date and a corresponding Chrome Web Store update. The version history is available in the public Git repository.

## Affiliation

1132 Fixer is an independent open-source project. It is **not** affiliated with, endorsed by, or sponsored by Zoom Video Communications, Inc. "Zoom" is a registered trademark of Zoom Video Communications, Inc., used here only to describe the site the extension operates on.

## Contact

> **TODO (operator):** Replace this section with a real public point of contact before submitting to the Chrome Web Store. Suggested fields:
>
> - **Owner:** `1132 Fixer` — published by *(operator/legal name)*.
> - **Support email:** *(operator email; do not invent one)*.
> - **Repository:** <https://github.com/PrimeUpYourLife/1132-Fixer-Chrome>.
> - **Hosted privacy URL:** <https://primeupyourlife.github.io/1132-Fixer-Chrome/privacy.html>.

## Verifiability

The claims above can be verified directly from this repository:

- `node scripts/validate-extension.js` runs 68 source-level checks, including bans on `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `eval`, `new Function`, common analytics SDK names, any `http(s)://` URL appearing inside `popup.html` / `popup.js` / `popup.css`, and explicit zoom-only safety guards that fail the build if the manifest re-introduces `<all_urls>`, if a non-Zoom host is added to `host_permissions`, or if a manual / Custom domain / All sites scope feature leaks back in.
- `manifest.json` lists only the four permissions and the two Zoom host patterns documented above.
- `popup.js` is short enough to audit by reading top to bottom. The only data egress points (`chrome.cookies.remove`, `chrome.browsingData.remove`, `chrome.scripting.executeScript`) are deletion operations, scoped to Zoom domains, gated behind an explicit click on `#zoomFixBtn`.
