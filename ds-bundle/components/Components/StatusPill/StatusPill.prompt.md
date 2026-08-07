# StatusPill

One state pill per screen: `ready` (green, default), `.scanning` (amber, blinking dot), `.done` (green, static dot), `.error` (red), `.neutral` (surface + `--text-dim`, for "nothing to act on" — not "all good").

```html
<span class="status-badge scanning"><span class="status-dot"></span>SCANNING</span>
```

Rules: 12px / 700 / 1.4px tracking; flat tinted backgrounds (no gradients); dot glow is 4px max. Warnings live here, never on badges.
