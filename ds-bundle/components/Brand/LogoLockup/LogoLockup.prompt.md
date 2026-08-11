# LogoLockup

Centered brand stack: transparent gear mark (`icons/popup-logo.png` in the real product — the preview uses a placeholder disc), white 600-weight wordmark, thin accent separator at 0.6 opacity, uppercase dim descriptor.

```html
<div class="logo-lockup">
  <img class="logo-mark" src="icons/popup-logo.png" alt="" width="64" height="64">
  <span class="logo-title">1132 FIXER</span>
  <div class="logo-sep"></div>
  <span class="logo-desc">A focused browser cleanup for Zoom error 1132.</span>
</div>
```

Rules: the wordmark is plain `--text` — no gradients, no glow (the retired amber-gradient title must not return). Brand orange exists only inside the logo artwork itself. Mark renders at 64px from a 128px source (2× crisp).
