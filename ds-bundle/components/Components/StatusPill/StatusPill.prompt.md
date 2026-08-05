# StatusPill

The one state indicator. Variants: default/ready (green, pulsing dot), `.scanning` (amber, blinking dot), `.done` (green, static dot), `.error` (red, static dot), `.neutral` (grey, static dot — "nothing to act on", not failure).

```html
<span class="status-badge scanning"><span class="status-dot"></span>WORKING</span>
```

Rules: label UPPERCASE, ≤3 words (host suffix allowed, e.g. `READY · zoom.us`). One pill per screen. Neutral means out-of-scope, never success or error.
