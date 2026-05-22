#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

// Source-level validation for the 1132 Fixer Chrome extension.
// Run from project root: `node scripts/validate-extension.js`
// Exits non-zero on first failure.

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let failed = 0;
let passed = 0;

function pass(name) { passed++; console.log(`  PASS  ${name}`); }
function fail(name, detail) { failed++; console.log(`  FAIL  ${name}${detail ? '  — ' + detail : ''}`); }
function group(title) { console.log('\n' + title); }

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function exists(rel) {
  try { fs.accessSync(path.join(ROOT, rel)); return true; } catch { return false; }
}

// --- 1. Manifest ---------------------------------------------------------
group('manifest.json');
let manifest;
try {
  manifest = JSON.parse(readText('manifest.json'));
  pass('parses as JSON');
} catch (e) {
  fail('parses as JSON', e.message);
  process.exit(1);
}

if (manifest.manifest_version === 3) pass('manifest_version is 3');
else fail('manifest_version is 3', `got ${manifest.manifest_version}`);

for (const k of ['name', 'version', 'description', 'icons', 'action', 'permissions', 'host_permissions']) {
  if (k in manifest) pass(`has "${k}"`); else fail(`has "${k}"`);
}

const popupPath = manifest.action && manifest.action.default_popup;
if (popupPath && exists(popupPath)) pass(`action.default_popup exists: ${popupPath}`);
else fail('action.default_popup exists', popupPath || '(missing)');

for (const size of ['16', '48', '128']) {
  const p = manifest.icons && manifest.icons[size];
  if (p && exists(p)) pass(`icons.${size} exists: ${p}`);
  else fail(`icons.${size} exists`, p || '(missing)');
}

const ALLOWED_PERMS = new Set(['cookies', 'browsingData', 'activeTab', 'scripting']);
const extra = (manifest.permissions || []).filter(p => !ALLOWED_PERMS.has(p));
if (extra.length === 0) pass(`permissions are within minimal set [${[...ALLOWED_PERMS].join(', ')}]`);
else fail('permissions are within minimal set', `extra: ${extra.join(', ')}`);

const required = ['cookies', 'browsingData', 'activeTab', 'scripting'];
const missing = required.filter(p => !(manifest.permissions || []).includes(p));
if (missing.length === 0) pass('permissions include all required');
else fail('permissions include all required', `missing: ${missing.join(', ')}`);

// --- 2. Popup file references --------------------------------------------
group('popup files');
const popupHtml = readText('popup.html');
const cssMatches = [...popupHtml.matchAll(/<link[^>]+href="([^"]+\.css)"/gi)].map(m => m[1]);
const jsMatches  = [...popupHtml.matchAll(/<script[^>]+src="([^"]+\.js)"/gi)].map(m => m[1]);
for (const css of cssMatches) {
  if (exists(css)) pass(`popup.html references existing css: ${css}`);
  else fail(`popup.html references existing css: ${css}`);
}
for (const js of jsMatches) {
  if (exists(js)) pass(`popup.html references existing js: ${js}`);
  else fail(`popup.html references existing js: ${js}`);
}
if (cssMatches.length === 0) fail('popup.html links a stylesheet');
if (jsMatches.length === 0) fail('popup.html includes popup.js');

// All button IDs referenced from popup.js must exist in HTML and vice versa.
const popupJs = readText('popup.js');
const idsInHtml = new Set([...popupHtml.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const idsInJs = new Set([...popupJs.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]));
for (const id of idsInJs) {
  if (idsInHtml.has(id)) pass(`element id used in popup.js exists in popup.html: #${id}`);
  else fail(`element id used in popup.js exists in popup.html: #${id}`);
}

// --- 3. Telemetry / remote-code scan ------------------------------------
group('no telemetry or remote runtime code');
const SCAN_FILES = ['popup.html', 'popup.js', 'popup.css'];
const FORBIDDEN_PATTERNS = [
  { re: /\bfetch\s*\(/,                 name: 'fetch(' },
  { re: /\bXMLHttpRequest\b/,           name: 'XMLHttpRequest' },
  { re: /\bWebSocket\b/,                name: 'WebSocket' },
  { re: /\bnavigator\.sendBeacon\b/,    name: 'sendBeacon' },
  { re: /\beval\s*\(/,                  name: 'eval(' },
  { re: /\bnew\s+Function\s*\(/,        name: 'new Function(' },
  { re: /\b(gtag|googletag|ga\(|amplitude|mixpanel|segment\.io|sentry\.io|posthog|hotjar)\b/i, name: 'analytics/telemetry' },
];
for (const f of SCAN_FILES) {
  const txt = readText(f);
  for (const { re, name } of FORBIDDEN_PATTERNS) {
    if (re.test(txt)) fail(`${f} contains forbidden token: ${name}`);
  }
}
pass(`scanned ${SCAN_FILES.length} files for telemetry/remote-code tokens`);

// Any http(s):// URLs found must be doc-only (README), not runtime calls.
const RUNTIME_URL_RE = /https?:\/\/[^\s"')]+/g;
for (const f of SCAN_FILES) {
  const txt = readText(f);
  const urls = (txt.match(RUNTIME_URL_RE) || []).filter(u => {
    // Allow scheme-construction templates that don't carry a real host.
    if (/^https?:\/\/\$\{/.test(u)) return false;
    if (/^https?:\/\/$/.test(u))    return false;
    return true;
  });
  if (urls.length === 0) pass(`${f} has no runtime URLs`);
  else fail(`${f} contains runtime URL(s)`, urls.join(', '));
}

// --- 4. Domain matcher unit tests ---------------------------------------
group('domain matcher (isZoomHost / parseDomainInput / normalizeHost)');
const m = require(path.join(ROOT, 'popup.js'));
const cases = [
  { fn: 'isZoomHost', input: 'zoom.us',                expect: true  },
  { fn: 'isZoomHost', input: 'www.zoom.us',            expect: true  },
  { fn: 'isZoomHost', input: 'us02web.zoom.us',        expect: true  },
  { fn: 'isZoomHost', input: 'ZOOM.US',                expect: true  },
  { fn: 'isZoomHost', input: 'zoom.us.',               expect: true  },
  { fn: 'isZoomHost', input: 'zoom.com',               expect: true  },
  { fn: 'isZoomHost', input: 'foo.zoom.com',           expect: true  },
  { fn: 'isZoomHost', input: 'notzoom.us',             expect: false },
  { fn: 'isZoomHost', input: 'evilzoom.us',            expect: false },
  { fn: 'isZoomHost', input: 'zoom.us.evil.com',       expect: false },
  { fn: 'isZoomHost', input: 'foo.example.com',        expect: false },
  { fn: 'isZoomHost', input: '',                       expect: false },
  { fn: 'isZoomHost', input: null,                     expect: false },
  { fn: 'isZoomHost', input: 'zoom.us:443',            expect: true  },
  { fn: 'parseDomainInput', input: 'https://example.com/path?x', expect: 'example.com' },
  { fn: 'parseDomainInput', input: '  EXAMPLE.com  ',  expect: 'example.com' },
  { fn: 'parseDomainInput', input: 'example.com:8080', expect: 'example.com' },
  { fn: 'parseDomainInput', input: '',                 expect: null },
  { fn: 'parseDomainInput', input: '://',              expect: null },
  { fn: 'normalizeHost', input: 'ZOOM.US.',            expect: 'zoom.us' },
  { fn: 'normalizeHost', input: 'host:443',            expect: 'host' },
];
for (const c of cases) {
  const got = m[c.fn](c.input);
  const ok = got === c.expect;
  (ok ? pass : fail)(`${c.fn}(${JSON.stringify(c.input)}) -> ${JSON.stringify(c.expect)}`, ok ? '' : `got ${JSON.stringify(got)}`);
}

// --- 5. Summary ----------------------------------------------------------
console.log('');
console.log(`Passed: ${passed}  Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
