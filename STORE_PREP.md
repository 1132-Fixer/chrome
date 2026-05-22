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
Compress-Archive -Path manifest.json,popup.html,popup.css,popup.js,icons,LICENSE,README.md -DestinationPath 1132-fixer-chrome.zip -Force
```

The zip's top level must contain `manifest.json` (not a wrapping folder).

## Store listing fields

| Field                  | Value                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Name                   | `1132 Fixer`                                                                                         |
| Short description      | `One-click Zoom 1132 cleaner: clears Zoom cookies, storage, and cache, then reloads.`                |
| Category               | Productivity                                                                                         |
| Language               | English (United States)                                                                              |
| Primary functionality  | Cookie & site-data cleaner                                                                           |
| Single purpose         | See statement above.                                                                                 |
| Permissions            | See justification table.                                                                             |
| Privacy policy URL     | TODO — operator to host. Public copy can be a single-page summary of *Privacy posture* in README.md. |

## Assets required by the store

| Asset                  | Spec                          | Status        |
| ---------------------- | ----------------------------- | ------------- |
| Icon 128×128           | PNG, opaque or transparent    | present       |
| Small promo tile       | 440×280 PNG                   | TODO          |
| Marquee promo (opt.)   | 1400×560 PNG                  | TODO          |
| Screenshots (1–5)      | 1280×800 or 640×400 PNG/JPG   | TODO          |

## Manual test checklist before submitting

Run every row of the **Manual test checklist** in [README.md](README.md). Capture at least one screenshot per row 2–6 for the store listing.

## Known limitations to disclose

- **HTTP cache** is browser-global and is never wiped from per-domain operations. The **All sites** scope is the only path that touches it.
- **`sessionStorage`** can only be cleared in the active tab — closed Zoom tabs in other windows are not reached.
- **IndexedDB enumeration** depends on `indexedDB.databases()` availability inside `chrome.browsingData` and varies by Chrome version. The extension reports per-domain clear status truthfully; it does not claim success when the platform reports failure.

## Source-level validation gate before packaging

```bash
node scripts/validate-extension.js
```

Must exit 0. If any check fails, fix and re-run before zipping.

## Submission step (requires separate approval)

Do **not** upload to <https://chrome.google.com/webstore/devconsole> until the operator explicitly authorizes the submission. Submission is irreversible in terms of public visibility once approved.
