# Popup

The full 360px popup on the navy gradient. Layout order, top to bottom:

1. **Topbar** — static chips: version left, `Cookies only` right (compact).
2. **Header** — LogoLockup (transparent gear mark, white wordmark, accent separator, uppercase descriptor).
3. **Main** — StatusPill, the single FIX ZOOM FixButton (hidden in non-Zoom state), one dim result line.
4. **Footer** — hairline `--border` top edge; `Feedback & Report` + `Visit Website` link pills centered on one row (44px targets).

Two canonical states: Zoom tab (READY + button) and non-Zoom (`.neutral` pill, no button, guidance line). The center column stays logo / status / action only — no forms, no logs, no settings. The retired hazard stripe must not return.
