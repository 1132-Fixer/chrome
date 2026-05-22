---
layout: default
title: Privacy Policy — 1132 Fixer for Chrome
permalink: /privacy.html
---

# Privacy Policy — 1132 Fixer for Chrome

*Last updated: 2026-05-22.*

This is the privacy policy for the **1132 Fixer** Chrome extension distributed via the Chrome Web Store and hosted at <https://github.com/PrimeUpYourLife/1132-Fixer-Chrome>. This document is the canonical source and is also published at <https://primeupyourlife.github.io/1132-Fixer-Chrome/privacy.html>.

## Summary

**1132 Fixer does not collect, transmit, sell, share, or store any personal data.** Everything the extension does happens locally inside the user's own browser, and only after the user clicks a button in the extension's popup.

## What the extension does

- It is the Chrome sibling of [1132 Fixer for Windows](https://github.com/PrimeUpYourLife/1132-Fixer-Windows). It is designed to mitigate Zoom error 1132 and other stale-cookie sign-in loops.
- When the active tab is on `zoom.us` or `zoom.com` (or any subdomain), the popup shows a **ZOOM DETECTED** banner and a one-click **FIX ZOOM** button. Clicking it clears Zoom-only site data and reloads the active Zoom tab.
- A manual picker lets the user pick a scope — **Current site**, **Custom domain**, or **All sites** — and the data types they want to clear, then run the clear.
- All clearing is **user-triggered**. Opening the popup never deletes anything by itself.

## What data the extension may clear (locally, after a user click)

When the user explicitly clicks **FIX ZOOM** or **FIX NOW**, the extension may clear the following data **for the scope the user picked**, using Chrome's built-in `chrome.cookies`, `chrome.browsingData`, and `chrome.scripting` APIs:

- HTTP cookies for the chosen domain.
- `localStorage` for the chosen origin.
- `sessionStorage` for the active tab when its host matches the chosen scope (cleared via a one-line `sessionStorage.clear()` injection in the active tab).
- Cache API / `CacheStorage` for the chosen origin.
- IndexedDB databases for the chosen origin, when Chrome's `chrome.browsingData` reports support.
- Service worker registrations for the chosen origin, bundled with Cache API.
- The global HTTP cache is **never** touched by per-domain operations. It is only cleared by the explicit **All sites** scope.

The extension **never reads, transmits, copies, or logs the values** of cookies, storage entries, or page content. Its only operations on this data are **deletion**. The UI surfaces only counts (e.g., "Cookies removed for zoom.us: 17") — never values.

## What data the extension collects or transmits

- **None.** The extension performs **zero network requests**. It does not contact any first-party or third-party server.
- **No telemetry, analytics, or remote logging.** No Google Analytics, no Mixpanel, no Amplitude, no Sentry, no Segment, no PostHog, no Hotjar, no custom beacon — confirmed by source-level validator and by the absence of `fetch`, `XMLHttpRequest`, `WebSocket`, and `sendBeacon` from the extension runtime.
- **No remote code.** All scripts and styles ship in the package. Nothing is fetched at runtime, evaluated, or injected from a remote URL. The extension does not use `eval` or `new Function`.
- **No external fonts, images, or stylesheets.**
- **No remote configuration.** Behavior is fixed at install time and changes only via Chrome Web Store updates.
- **No account, sign-in, or identifier of any kind.**

## Permissions, in plain English

| Permission       | Used for                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| `cookies`        | Enumerate and delete cookies for the domain the user picks. Cookie **values** are never read or transmitted.          |
| `browsingData`   | Delete per-origin `localStorage`, `cacheStorage`, `indexedDB`, and `serviceWorkers` for the user's chosen scope.       |
| `activeTab`      | Read the active tab's URL when the popup opens (to show the Zoom banner) and reload that tab after a successful clear.|
| `scripting`      | Run a single line, `sessionStorage.clear()`, in the active tab after the user clicks. No DOM is read.                 |
| Host: `<all_urls>` | Required by Chrome's `cookies` and `browsingData` APIs to operate on the **Custom domain** or **All sites** scopes. The extension does **not** inject content scripts at install or page-load time and does **not** read page content. |

## Children's privacy

The extension does not target or knowingly process data about children. Because it processes no personal data at all, it imposes no child-specific data risk.

## Changes to this policy

If extension behavior changes in a way that affects this policy, this document will be updated with a new "Last updated" date and a corresponding Chrome Web Store update. The version history is available in the public Git repository.

## Contact

> **TODO (operator):** Replace this section with a real public point of contact before submitting to the Chrome Web Store. Suggested fields:
>
> - **Owner:** `1132 Fixer` — published by *(operator/legal name)*.
> - **Support email:** *(operator email; do not invent one)*.
> - **Repository:** <https://github.com/PrimeUpYourLife/1132-Fixer-Chrome>.
> - **Hosted privacy URL:** *(operator must host this same policy at a stable public URL before submission; do not invent one)*.

## Verifiability

The claims above can be verified directly from this repository:

- `node scripts/validate-extension.js` runs 51 source-level checks, including bans on `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `eval`, `new Function`, common analytics SDK names, and any `http(s)://` URL appearing inside `popup.html` / `popup.js` / `popup.css`.
- `manifest.json` lists only the four permissions and one host pattern documented above.
- `popup.js` is short enough to audit by reading top to bottom. The only data egress points (`chrome.cookies.remove`, `chrome.browsingData.remove`, `chrome.scripting.executeScript`) are deletion operations, not reads.
