---
layout: default
title: 1132 Fixer for Chrome
description: One-click Zoom cookie cleaner for Zoom error 1132. Cookies only. Zoom-only host permissions. MV3. User-triggered. No telemetry. No remote code.
hero_title: Fix Zoom 1132 in one click.
hero_sub: 1132 Fixer is a one-button Chrome extension that deletes cookies for zoom.us and zoom.com, then reloads the active Zoom tab. Cookies only — your storage, cache and IndexedDB are left alone. Zoom-only host access. Everything runs locally in your browser. No accounts. No telemetry. No remote code.
permalink: /
---

<div class="cta-row" markdown="0">
  <div class="cta-card">
    <h3>Install</h3>
    <p>Load the latest unpacked build or grab it from the Chrome Web Store once review completes.</p>
    <a class="btn" href="https://github.com/PrimeUpYourLife/1132-Fixer-Chrome#install-unpacked-for-development">Get the extension</a>
  </div>
  <div class="cta-card">
    <h3>Privacy</h3>
    <p>Read the full canonical privacy policy. Zero data collection, zero network traffic from the extension.</p>
    <a class="btn secondary" href="./privacy.html">Read privacy policy</a>
  </div>
</div>

## What it does

1132 Fixer is the Chrome sibling of [1132 Fixer for Windows](https://github.com/PrimeUpYourLife/1132-Fixer-Windows). One purpose: delete Zoom's cookies, reload the Zoom tab, get past Zoom error **1132** and similar stale-cookie sign-in loops.

- On `zoom.us`, `zoom.com`, or any of their subdomains, the popup shows the detected host and a single **FIX ZOOM** button. No options, no checkboxes, no log to read.
- On any other site (or `chrome://` / `about:` pages), the popup shows one line asking you to open a Zoom tab. No button is offered. The extension does not request access to non-Zoom hosts.
- Every clear is user-triggered. The popup never deletes anything on open, install, startup, page-load, or a timer.

## What it does *not* do

- **No storage, cache or IndexedDB clearing.** Cookies are the only data type touched, so your Zoom preferences and cached assets survive.
- No data collection. No analytics. No telemetry pings of any kind.
- No remote code. Every script ships in the package — no `fetch`, no `XMLHttpRequest`, no `WebSocket`, no `sendBeacon`, no `eval`, no `new Function`.
- No external fonts, stylesheets, images, or remote config.
- No reading of your cookie values. The extension only **deletes**; the UI surfaces a single count.
- No access to non-Zoom domains. Host permissions are scoped to Zoom's two domains — Chrome will not let the extension touch anything else.
- The global HTTP cache is **never** wiped.

## Permissions, in plain English

| Permission                                                                                        | Used for                                                                                                                |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `cookies`                                                                                         | Enumerate and delete cookies for `zoom.us` and `zoom.com`.                                                              |
| `activeTab`                                                                                       | Read the active tab's URL when you open the popup; reload it after a successful clear.                                  |
| Hosts: `https://*.zoom.us/*`, `https://*.zoom.com/*`, `http://*.zoom.us/*`, `http://*.zoom.com/*` | Required by `chrome.cookies` to operate on Zoom domains. Both schemes are listed so non-Secure Zoom cookies are visible too. No broader host access is requested. |

There is no `browsingData` permission and no `scripting` permission — they were dropped in v1.2.0 with the non-cookie data types.

## Where to go next

- **Privacy:** [Full privacy policy](./privacy.html)
- **Source:** [github.com/PrimeUpYourLife/1132-Fixer-Chrome](https://github.com/PrimeUpYourLife/1132-Fixer-Chrome)
- **Windows sibling:** [github.com/PrimeUpYourLife/1132-Fixer-Windows](https://github.com/PrimeUpYourLife/1132-Fixer-Windows)
- **License:** MIT
- *Independent project. Not affiliated with Zoom Video Communications, Inc.*
