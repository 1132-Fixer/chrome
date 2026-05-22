---
layout: default
title: 1132 Fixer for Chrome
description: One-click cookie and site-data cleaner for Zoom error 1132. MV3, user-triggered, no telemetry, no remote code.
hero_title: Fix Zoom 1132 in one click.
hero_sub: 1132 Fixer is a Chrome extension that clears Zoom site data — cookies, localStorage, sessionStorage, Cache API, IndexedDB — for the active Zoom tab, then reloads it. Everything runs locally in your browser. No accounts. No telemetry. No remote code.
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

1132 Fixer is the Chrome sibling of [1132 Fixer for Windows](https://github.com/PrimeUpYourLife/1132-Fixer-Windows). It exists to mitigate Zoom error **1132** and other stale-cookie sign-in loops without dragging in unrelated tooling.

- On `zoom.us` (or `zoom.com` / any subdomain) the popup detects the host and shows a **ZOOM DETECTED** banner.
- One click on **FIX ZOOM** clears Zoom-only site data and reloads the active Zoom tab.
- A manual picker covers any other site: **Current site / Custom domain / All sites**, with checkboxes for the data types to clear.
- **All sites** is gated by a red warning because it wipes the global HTTP cache. Every other scope is per-origin.

## What it does *not* do

- No data collection. No analytics. No telemetry pings of any kind.
- No remote code. Every script ships in the package — no `fetch`, no `XMLHttpRequest`, no `WebSocket`, no `sendBeacon`, no `eval`, no `new Function`.
- No external fonts, stylesheets, images, or remote config.
- No auto-clearing. The popup never deletes anything on open, install, startup, or tab activation. Every clear requires an explicit click.
- No reading of your cookies or storage values. The extension only **deletes** — the UI surfaces counts only.

## Permissions, in plain English

| Permission        | Used for                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| `cookies`         | Enumerate and delete cookies for the host you pick.                                                       |
| `browsingData`    | Per-origin clear of `localStorage`, `cacheStorage`, `indexedDB`, and `serviceWorkers`.                     |
| `activeTab`       | Read the active tab's URL when you open the popup; reload it after a successful clear.                    |
| `scripting`       | Run a one-liner `sessionStorage.clear()` in the active tab after you click. Nothing is read.              |
| Host `<all_urls>` | Required by `chrome.cookies` / `chrome.browsingData` for the **Custom domain** and **All sites** flows.    |

## Where to go next

- **Privacy:** [Full privacy policy](./privacy.html)
- **Source:** [github.com/PrimeUpYourLife/1132-Fixer-Chrome](https://github.com/PrimeUpYourLife/1132-Fixer-Chrome)
- **Windows sibling:** [github.com/PrimeUpYourLife/1132-Fixer-Windows](https://github.com/PrimeUpYourLife/1132-Fixer-Windows)
- **License:** MIT
