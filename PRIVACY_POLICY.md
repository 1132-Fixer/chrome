---
layout: default
title: Privacy Policy
description: Privacy policy for the 1132 Fixer Chrome extension. Zoom cookies only. No data collection, telemetry, or remote code.
hero_title: Privacy Policy
hero_sub: 1132 Fixer does not collect, transmit, sell, share, or store any personal data. It deletes Zoom cookies — nothing else — locally in your own browser, and only when you click.
permalink: /privacy.html
---

*Last updated: 2026-08-04.*

This is the privacy policy for the **1132 Fixer** Chrome extension distributed via the Chrome Web Store and hosted at <https://github.com/PrimeUpYourLife/1132-Fixer-Chrome>. This document is the canonical source and is also published at <https://primeupyourlife.github.io/1132-Fixer-Chrome/privacy.html>.

## Summary

**1132 Fixer does not collect, transmit, sell, share, or store any personal data.** It deletes **cookies for Zoom domains only** (`zoom.us` and `zoom.com`, including subdomains), only after the user clicks **FIX ZOOM** in the popup, and only inside the user's own browser.

## What the extension does

- It is the Chrome sibling of [1132 Fixer for Windows](https://github.com/PrimeUpYourLife/1132-Fixer-Windows/releases/latest). It exists to mitigate Zoom error 1132 and similar stale-cookie sign-in loops.
- When the active tab is on `zoom.us`, `zoom.com`, or any of their subdomains, the popup shows the detected host and a single **FIX ZOOM** button. Clicking it deletes Zoom cookies and reloads the active Zoom tab.
- On any other site (or `chrome://` / `about:` pages), **FIX ZOOM** stays hidden. The website and feedback links remain available. The extension does not request host access to non-Zoom domains.
- All clearing is **user-triggered**. Opening the popup never deletes anything by itself; no install, startup, page-load, or timer hook clears data.

## What data the extension may clear (locally, after a user click)

When the user explicitly clicks **FIX ZOOM**, the extension deletes exactly one category of data, using Chrome's built-in `chrome.cookies` API:

- HTTP cookies for `zoom.us`, `zoom.com`, and their subdomains — Secure and non-Secure, and partitioned (CHIPS) cookies where the installed Chrome version supports the partition filter.

Nothing else is touched. As of v1.2.0 the extension **does not** clear:

- `localStorage` or `sessionStorage` — for any origin, including Zoom's.
- Cache API / `cacheStorage`.
- IndexedDB databases.
- Service worker registrations.
- The global HTTP cache.
- Anything at all belonging to a non-Zoom site.

The `browsingData` and `scripting` permissions were removed in v1.2.0 because the extension no longer needs them; without them Chrome cannot clear those data types even if the code tried.

The extension **never reads, transmits, copies, or logs the values** of cookies or page content. Its only operation on cookies is **deletion**. The popup shows a single count (for example, `Removed 17 Zoom cookies.`) — never a value.

## What data the extension collects or transmits

- The **FIX ZOOM** action sends **no cookie data and issues no direct network request of its own**. After clearing, it reloads the active Zoom tab, and that reload loads the page's own resources exactly like any normal visit — the extension adds nothing to that traffic. The website and feedback links open a normal browser tab only when the user clicks them.
- **No telemetry, analytics, or remote logging.** No Google Analytics, no Mixpanel, no Amplitude, no Sentry, no Segment, no PostHog, no Hotjar, no custom beacon — confirmed by the source-level validator and by the absence of `fetch`, `XMLHttpRequest`, `WebSocket`, and `sendBeacon` from the extension runtime.
- **No remote code.** All scripts and styles ship in the package. Nothing is fetched at runtime, evaluated, or injected from a remote URL. The extension does not use `eval` or `new Function`.
- **No external fonts, images, or stylesheets.**
- **No remote configuration.** Behavior is fixed at install time and changes only via Chrome Web Store updates.
- **No account, sign-in, or identifier of any kind.**

## Permissions, in plain English

| Permission                                          | Used for                                                                                                              |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `cookies`                                           | Enumerate and delete cookies for `zoom.us` and `zoom.com`. Cookie **values** are never read or transmitted.           |
| `activeTab`                                         | Read the active tab's URL when the popup opens (to detect a Zoom tab) and reload that tab after a successful clear.    |
| Hosts: `https://*.zoom.us/*`, `https://*.zoom.com/*`, `http://*.zoom.us/*`, `http://*.zoom.com/*` | Required by Chrome's `cookies` API to operate on Zoom domains. Both schemes are listed because Chrome maps a non-Secure cookie to an `http://` URL and hides it from an https-only extension — without `http`, stale non-Secure Zoom cookies would be missed. **No** other hosts are requested. The extension does not inject content scripts at install or page-load time and does not read page content. |

The extension holds **no** `browsingData` and **no** `scripting` permission.

## Children's privacy

The extension does not target or knowingly process data about children. Because it processes no personal data at all, it imposes no child-specific data risk.

## Changes to this policy

If extension behavior changes in a way that affects this policy, this document will be updated with a new "Last updated" date and a corresponding Chrome Web Store update. The version history is available in the public Git repository.

## Affiliation

1132 Fixer is an independent open-source project. It is **not** affiliated with, endorsed by, or sponsored by Zoom Video Communications, Inc. "Zoom" is a registered trademark of Zoom Video Communications, Inc., used here only to describe the site the extension operates on.

## Contact

- **Owner:** `1132 Fixer` — published by PrimeUpYourLife.
- **Support / privacy questions:** open an issue at <https://github.com/PrimeUpYourLife/1132-Fixer-Chrome/issues> — this is the canonical public contact point for this extension.
- **Repository:** <https://github.com/PrimeUpYourLife/1132-Fixer-Chrome>.
- **Hosted privacy URL:** <https://primeupyourlife.github.io/1132-Fixer-Chrome/privacy.html>.

## Verifiability

The claims above can be verified directly from this repository:

- `node scripts/validate-extension.js` checks the source. It bans `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, remote code, telemetry, broad host access, and unsafe browser-data APIs. Only the two approved user-clicked links are allowed.
- `node scripts/test-popup-e2e.js` checks the real popup in headless Chromium. It proves the cookie action stays on Zoom hosts, does not use other browser-data APIs, and makes no runtime network request.
- `manifest.json` lists only two permissions (`cookies`, `activeTab`) and the four Zoom host patterns documented above.
- `popup.js` is short enough to audit by reading top to bottom. The only destructive call in the file is `chrome.cookies.remove`, scoped to Zoom domains and gated behind an explicit click on `#zoomFixBtn`.
