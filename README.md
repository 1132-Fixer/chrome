# 1132 Fixer for Chrome

One-click cookie and site-data cleaner. Same look and feel as [1132 Fixer for Windows](https://github.com/JG2547/1132-Fixer-Windows), built as a Manifest V3 Chrome extension.

Pick a scope (current site, custom domain, or all sites), pick the data types you want to clear (cookies, local/session storage, cache, IndexedDB), and hit **FIX NOW**. The active tab reloads if its host matches the scope.

## Features

- **Scope:** current tab's site, a custom domain, or every site.
- **Data types:** cookies, localStorage + sessionStorage, cache + service workers, IndexedDB.
- **Auto-reload** the active tab after a per-domain clear.
- **No telemetry, no remote code.** Everything runs locally in the popup.

## Permissions

| Permission        | Why                                                                |
| ----------------- | ------------------------------------------------------------------ |
| `cookies`         | Enumerate and remove cookies for the selected domain.              |
| `browsingData`    | Clear localStorage, cache, IndexedDB, and service workers.         |
| `activeTab`/`tabs`| Detect the active tab's hostname and reload it after clearing.     |
| `<all_urls>`      | Cookies and browsing data live across every origin you might pick. |

The extension does not send data anywhere and does not inject content scripts.

## Install (unpacked, for development)

1. Clone this repo.
2. `chrome://extensions` → enable **Developer mode** (top right).
3. **Load unpacked** → select this folder.
4. Pin the extension and click the icon to open the popup.

If you change `icons/icon.png`, regenerate the 16/48/128 sizes:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/make-icons.ps1
```

## Publish to Chrome Web Store

1. Pay the one-time $5 developer fee at <https://chrome.google.com/webstore/devconsole>.
2. Zip the extension root (must include `manifest.json` at the top level, NOT a parent folder):
   ```powershell
   Compress-Archive -Path manifest.json,popup.html,popup.css,popup.js,icons -DestinationPath 1132-fixer-chrome.zip -Force
   ```
3. In the dev console → **New item** → upload the zip.
4. Fill in the listing: description, screenshots (1280x800 or 640x400), small promo tile (440x280), category (Productivity), single-purpose description ("Clear cookies and site data for a chosen scope").
5. Privacy practices tab: declare no remote data collection, justify each permission in one sentence (see the table above).
6. Submit for review. First review typically takes a few business days.

## Files

| File                       | Purpose                                |
| -------------------------- | -------------------------------------- |
| `manifest.json`            | MV3 manifest.                          |
| `popup.html`               | Popup markup.                          |
| `popup.css`                | Styles (1132 Fixer palette).           |
| `popup.js`                 | Scope/type detection and clear logic.  |
| `icons/`                   | Source `icon.png` + generated sizes.   |
| `scripts/make-icons.ps1`   | Regenerate `icon16/48/128.png`.        |

## License

MIT.
