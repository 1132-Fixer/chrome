'use strict';

/**
 * Report-a-bug page (#16) — the ONLY file in this extension that talks to the
 * network, and it talks to exactly one place: the 1132 Fixer support service.
 * Everything is user-initiated — the page sends nothing until the user clicks
 * Submit. The popup's fix flow stays cookies-only and network-free.
 *
 * The form renders only when GET /health advertises capabilities.screenshots
 * (the support platform is live end-to-end); otherwise the page shows the
 * GitHub-issues fallback link — never a dead form.
 *
 * The submission travels the authenticated /v1 support API: the install
 * self-registers a support principal on first use (POST /v1/principals; the
 * token identifies this install to the support service and is stored in this
 * page's localStorage — extension-origin, never a shipped secret).
 */

const IS_BROWSER = typeof document !== 'undefined';

// Public support-service endpoint. NOT a secret — same stance as the Windows
// app's FEEDBACK_PROXY_URL. scripts/validate-extension.js pins this as the
// one allowed network origin in this file.
const SUPPORT_ORIGIN = 'https://1132-fixer-feedback-proxy-production.up.railway.app';

const SHOT_MAX_BYTES = 5 * 1024 * 1024;
const MIN_TEXT_CHARS = 50;
const PRINCIPAL_KEY = '1132_support_principal';

// --- pure helpers (exported for source-level tests) -------------------

/** Sniffed image MIME of the bytes, or null when not an accepted image. */
function sniffImageBytes(u8) {
  if (!u8 || u8.length < 12) return null;
  if (u8[0] === 0x89 && u8[1] === 0x50 && u8[2] === 0x4e && u8[3] === 0x47 &&
      u8[4] === 0x0d && u8[5] === 0x0a && u8[6] === 0x1a && u8[7] === 0x0a) return 'image/png';
  if (u8[0] === 0xff && u8[1] === 0xd8 && u8[2] === 0xff) return 'image/jpeg';
  const head = String.fromCharCode.apply(null, Array.from(u8.slice(0, 12)));
  if (head.startsWith('GIF87a') || head.startsWith('GIF89a')) return 'image/gif';
  if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

/** Base64 of a Uint8Array, chunked so large images cannot blow the arg limit. */
function bytesToBase64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  }
  return btoa(s);
}

/** Single-line title from the report text, matching the Windows app's rule. */
function titleFrom(text) {
  const t = text.slice(0, 80).replace(/\s+/g, ' ').trim();
  return t || 'Bug report';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { sniffImageBytes, bytesToBase64, titleFrom, SUPPORT_ORIGIN, MIN_TEXT_CHARS };
}

// --- page logic -------------------------------------------------------

if (IS_BROWSER) {
  const els = {
    version: document.getElementById('appVersion'),
    checking: document.getElementById('checkingView'),
    fallback: document.getElementById('fallbackView'),
    form: document.getElementById('formView'),
    text: document.getElementById('bugText'),
    submit: document.getElementById('bugSubmit'),
    status: document.getElementById('bugStatus'),
    shotRow: document.getElementById('shotRow'),
    shotAttach: document.getElementById('shotAttach'),
    shotReplace: document.getElementById('shotReplace'),
    shotRemove: document.getElementById('shotRemove'),
    shotInput: document.getElementById('shotInput'),
    shotPreview: document.getElementById('shotPreview'),
    shotImg: document.getElementById('shotImg'),
    shotName: document.getElementById('shotName'),
    shotStatus: document.getElementById('shotStatus'),
  };

  let screenshot = null;     // { bytes: Uint8Array, mediaType, name }
  let screenshotUrl = null;  // preview object URL

  function appVersion() {
    try { return chrome.runtime.getManifest().version; } catch (_) { return '0.0.0'; }
  }

  function setStatus(msg, cls) {
    els.status.textContent = msg || '';
    els.status.className = 'report-status' + (cls ? ' ' + cls : '');
  }
  function setShotStatus(msg, isError) {
    els.shotStatus.textContent = msg || '';
    els.shotStatus.className = 'report-status' + (isError ? ' err' : '');
  }

  function clearScreenshot() {
    screenshot = null;
    if (screenshotUrl) { URL.revokeObjectURL(screenshotUrl); screenshotUrl = null; }
    els.shotPreview.hidden = true;
    els.shotRow.hidden = false;
    els.shotInput.value = '';
    setShotStatus('');
  }

  async function setScreenshot(fileOrBlob, name) {
    if (fileOrBlob.size > SHOT_MAX_BYTES) {
      setShotStatus('Screenshot must be 5 MB or smaller.', true);
      return;
    }
    const bytes = new Uint8Array(await fileOrBlob.arrayBuffer());
    const mediaType = sniffImageBytes(bytes);
    if (!mediaType) {
      setShotStatus('Only image files can be attached (PNG, JPEG, WebP, or GIF).', true);
      return;
    }
    if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
    screenshot = { bytes, mediaType, name: name || 'screenshot' };
    screenshotUrl = URL.createObjectURL(new Blob([bytes], { type: mediaType }));
    els.shotImg.src = screenshotUrl;
    els.shotName.textContent = screenshot.name;
    els.shotPreview.hidden = false;
    els.shotRow.hidden = true;
    setShotStatus('');
  }

  // --- support-service client ----------------------------------------

  async function serviceRequest(method, path, headers, body) {
    const r = await fetch(SUPPORT_ORIGIN + path, { method, headers, body });
    let json = null;
    try { json = await r.json(); } catch (_) { /* non-JSON body */ }
    return { status: r.status, json };
  }

  async function capabilityProbe() {
    try {
      const r = await serviceRequest('GET', '/health');
      return Boolean(r.json && r.json.capabilities && r.json.capabilities.screenshots);
    } catch (_) {
      return false; // unreachable or CORS-dark -> fallback view
    }
  }

  function loadPrincipal() {
    try {
      const p = JSON.parse(localStorage.getItem(PRINCIPAL_KEY));
      return (p && p.principalId && p.token) ? p : null;
    } catch (_) { return null; }
  }

  async function registerPrincipal() {
    const r = await serviceRequest('POST', '/v1/principals',
      { 'Content-Type': 'application/json' },
      JSON.stringify({ product: 'CHROME', appVersion: appVersion() }));
    if (r.status === 201 && r.json && r.json.principalId && r.json.token) {
      const p = { principalId: r.json.principalId, token: r.json.token };
      localStorage.setItem(PRINCIPAL_KEY, JSON.stringify(p));
      return p;
    }
    return null;
  }

  function messageFor(r) {
    if (r.status === 429) return 'Too many submissions — try again later.';
    if (r.status === 413) return 'The report is too large — remove the screenshot and try again.';
    if (r.status === 400 && r.json && r.json.error && r.json.error.code === 'validation_failed') {
      return r.json.error.message; // server copy is user-facing
    }
    return 'Submission failed — try again later.';
  }

  async function submitReport() {
    const text = els.text.value.trim();
    els.submit.disabled = true;
    setStatus(screenshot ? 'Submitting report + screenshot…' : 'Submitting…');
    try {
      let principal = loadPrincipal() || await registerPrincipal();
      if (!principal) {
        setStatus('Could not reach the support service — try again later.', 'err');
        return;
      }
      const payload = {
        type: 'bug',
        title: titleFrom(text),
        description: text,
        os: navigator.userAgent,
        appVersion: appVersion(),
      };
      if (screenshot) {
        payload.screenshot = { data: bytesToBase64(screenshot.bytes), mediaType: screenshot.mediaType };
      }
      // Key derives from the submission content: a retry after an ambiguous
      // failure (timeout after the server committed) replays the stored
      // response instead of duplicating the case. Editing the report or the
      // screenshot changes the body and therefore the key.
      const bodyStr = JSON.stringify(payload);
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(bodyStr));
      const idemKey = 'fx-' + Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
      const post = (p) => serviceRequest('POST', '/v1/cases', {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + p.token,
        'Idempotency-Key': idemKey,
      }, bodyStr);

      let r = await post(principal);
      if (r.status === 401) {
        // Token revoked or service re-peppered: re-register once, retry once.
        localStorage.removeItem(PRINCIPAL_KEY);
        principal = await registerPrincipal();
        if (principal) r = await post(principal);
      }
      if (r.status === 201 && r.json && r.json.caseRef &&
          (!screenshot || r.json.screenshotAttached)) {
        // Success is claimed only when the service confirmed the WHOLE
        // submission — a 201 without the screenshot must not read as sent.
        setStatus('Submitted — reference ' + r.json.caseRef + '. Thank you!', 'ok');
        els.text.value = '';
        clearScreenshot();
        return;
      }
      setStatus(messageFor(r), 'err');
    } catch (_) {
      setStatus('Network error — check your connection and try again.', 'err');
    } finally {
      els.submit.disabled = els.text.value.trim().length < MIN_TEXT_CHARS;
    }
  }

  // --- wiring ---------------------------------------------------------

  async function init() {
    els.version.textContent = 'v' + appVersion();

    els.text.addEventListener('input', () => {
      els.submit.disabled = els.text.value.trim().length < MIN_TEXT_CHARS;
    });
    els.submit.addEventListener('click', submitReport);
    els.shotAttach.addEventListener('click', () => els.shotInput.click());
    els.shotReplace.addEventListener('click', () => els.shotInput.click());
    els.shotRemove.addEventListener('click', clearScreenshot);
    els.shotInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) setScreenshot(f, f.name);
    });

    ['dragover', 'dragenter'].forEach((ev) => els.form.addEventListener(ev, (e) => {
      e.preventDefault();
      els.shotRow.classList.add('report-drag');
    }));
    ['dragleave', 'drop'].forEach((ev) => els.form.addEventListener(ev, (e) => {
      if (ev === 'drop') e.preventDefault();
      els.shotRow.classList.remove('report-drag');
    }));
    els.form.addEventListener('drop', (e) => {
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) setScreenshot(f, f.name);
    });
    document.addEventListener('paste', (e) => {
      if (els.form.hidden) return;
      const items = (e.clipboardData && e.clipboardData.items) || [];
      for (const item of items) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) { e.preventDefault(); setScreenshot(f, 'pasted screenshot'); }
          return;
        }
      }
    });

    const capable = await capabilityProbe();
    els.checking.hidden = true;
    els.form.hidden = !capable;
    els.fallback.hidden = capable;
  }

  document.addEventListener('DOMContentLoaded', init);
}
