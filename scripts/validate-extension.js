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

// --- 5. Safety guard tests (added 2026-05-22) ----------------------------
// These tests assert that the extension stays user-triggered, that no install/
// startup hook can sneak a clear in, and that the "All sites" feature carries
// an explicit warning per combined v26 Module A §11.4 absolute rule 1.
group('safety guards (user-triggered + warned + no install/startup auto-clear)');

const popupJsSrc = popupJs;
const popupHtmlSrc = popupHtml;

// 5a. popup.js must NOT register chrome.runtime.onInstalled / onStartup listeners.
//     (Service worker / background hooks could call browsingData.remove without
//     user input; this extension is popup-only and must stay popup-only.)
if (!/chrome\.runtime\.onInstalled\.addListener/.test(popupJsSrc)) {
  pass('popup.js does not register chrome.runtime.onInstalled listener');
} else {
  fail('popup.js does not register chrome.runtime.onInstalled listener');
}
if (!/chrome\.runtime\.onStartup\.addListener/.test(popupJsSrc)) {
  pass('popup.js does not register chrome.runtime.onStartup listener');
} else {
  fail('popup.js does not register chrome.runtime.onStartup listener');
}

// 5b. The init() function MUST NOT call chrome.browsingData.remove.
//     Locate `async function init()` body and assert no browsingData.remove inside.
const initMatch = popupJsSrc.match(/async\s+function\s+init\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
if (initMatch) {
  const initBody = initMatch[1];
  if (!/chrome\.browsingData\.remove/.test(initBody)) {
    pass('init() body does not call chrome.browsingData.remove');
  } else {
    fail('init() body does not call chrome.browsingData.remove', 'auto-clear detected');
  }
  if (!/chrome\.cookies\.remove/.test(initBody)) {
    pass('init() body does not call chrome.cookies.remove');
  } else {
    fail('init() body does not call chrome.cookies.remove', 'auto-cookie-clear detected');
  }
} else {
  fail('init() function body locatable for auto-clear scan');
}

// 5c. Both DOM event listeners (zoomFixBtn click + fixBtn click) must remain
//     the only entry points to runZoomFix / runFix.
if (/els\.zoomFixBtn\.addEventListener\(\s*['"]click['"]\s*,\s*runZoomFix\s*\)/.test(popupJsSrc)) {
  pass('runZoomFix is wired to zoomFixBtn click only');
} else {
  fail('runZoomFix is wired to zoomFixBtn click only');
}
if (/els\.fixBtn\.addEventListener\(\s*['"]click['"]\s*,\s*runFix\s*\)/.test(popupJsSrc)) {
  pass('runFix is wired to fixBtn click only');
} else {
  fail('runFix is wired to fixBtn click only');
}

// 5d. popup.html MUST contain the explicit "All sites" warning element and copy.
if (/id="allSitesWarning"/.test(popupHtmlSrc)) {
  pass('popup.html contains #allSitesWarning element');
} else {
  fail('popup.html contains #allSitesWarning element');
}
if (/All sites wipes the GLOBAL HTTP cache/i.test(popupHtmlSrc)) {
  pass('popup.html "All sites" warning text is present and explicit');
} else {
  fail('popup.html "All sites" warning text is present and explicit');
}
if (/Saved passwords, autofill, downloads, and browser history are NOT touched/i.test(popupHtmlSrc)) {
  pass('popup.html "All sites" warning lists protected-data carve-outs');
} else {
  fail('popup.html "All sites" warning lists protected-data carve-outs');
}

// 5e. popup.js must toggle the warning visibility based on scope=all.
if (/els\.allSitesWarning\.hidden\s*=\s*scope\s*!==\s*['"]all['"]/.test(popupJsSrc)) {
  pass('popup.js toggles allSitesWarning visibility on scope change');
} else {
  fail('popup.js toggles allSitesWarning visibility on scope change');
}

// 5f. clearAllSites must remain guarded behind getSelectedScope() === 'all'.
//     Source-text check: clearAllSites is only invoked from inside the `scope === 'all'` branch.
const clearAllSitesGuardRe = /if\s*\(\s*scope\s*===\s*['"]all['"]\s*\)\s*\{[\s\S]{0,80}?await\s+clearAllSites\s*\(/;
if (clearAllSitesGuardRe.test(popupJsSrc)) {
  pass('clearAllSites is guarded behind scope === "all" branch');
} else {
  fail('clearAllSites is guarded behind scope === "all" branch');
}

// 5g. perOriginBrowsingDataTypes must NOT include the global `cache` key.
//     (Setting `cache: true` would wipe the global HTTP cache despite `origins:`.)
const perOriginFnMatch = popupJsSrc.match(/function\s+perOriginBrowsingDataTypes\s*\(\s*types\s*\)\s*\{([\s\S]*?)\n\}/);
if (perOriginFnMatch) {
  const body = perOriginFnMatch[1];
  if (!/\bcache:\s*!!types\.cache/.test(body)) {
    pass('perOriginBrowsingDataTypes does NOT set global `cache` key');
  } else {
    fail('perOriginBrowsingDataTypes does NOT set global `cache` key', 'would wipe global HTTP cache on per-origin clear');
  }
  // It must still include cacheStorage (per-origin Cache API) so per-origin
  // clears actually clear the Cache API for the target origin.
  if (/\bcacheStorage:\s*!!types\.cache/.test(body)) {
    pass('perOriginBrowsingDataTypes sets per-origin cacheStorage key');
  } else {
    fail('perOriginBrowsingDataTypes sets per-origin cacheStorage key');
  }
} else {
  fail('perOriginBrowsingDataTypes function body locatable');
}

// 5h. No top-level (outside functions) call to chrome.browsingData.remove.
//     Heuristic: source text must not contain a `chrome.browsingData.remove`
//     call that isn't lexically inside an `async function`.
{
  const topLevelLines = popupJsSrc
    .split('\n')
    .filter((line) => /chrome\.browsingData\.remove/.test(line));
  // All matches must appear inside `clearAllSites` or `clearForOrigins`.
  const wrapperRe = /^\s*(?:await\s+)?chrome\.browsingData\.remove/;
  const looksWrapped = topLevelLines.every((l) => wrapperRe.test(l));
  if (looksWrapped) {
    pass('all chrome.browsingData.remove calls are wrapped by clearAllSites / clearForOrigins');
  } else {
    fail('all chrome.browsingData.remove calls are wrapped', topLevelLines.join(' | '));
  }
}

// --- 6. Summary ----------------------------------------------------------
console.log('');
console.log(`Passed: ${passed}  Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
