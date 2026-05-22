#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

// Source-level validation for the 1132 Fixer Chrome extension.
// Run from project root: `node scripts/validate-extension.js`
// Exits non-zero on first failure.
//
// As of v1.1.0 the extension is intentionally zoom-only. The validator
// asserts that no manual / Custom domain / All sites scope feature leaked
// back in, and that host_permissions stays narrow.

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

// host_permissions must be zoom-only after the v1.1.0 narrowing.
const ALLOWED_HOSTS = new Set([
  'https://*.zoom.us/*',
  'https://*.zoom.com/*',
]);
const hostPerms = manifest.host_permissions || [];
if (hostPerms.length > 0) pass('host_permissions is non-empty');
else fail('host_permissions is non-empty');
const badHosts = hostPerms.filter(h => !ALLOWED_HOSTS.has(h));
if (badHosts.length === 0) pass(`host_permissions is zoom-only [${[...ALLOWED_HOSTS].join(', ')}]`);
else fail('host_permissions is zoom-only', `extra: ${badHosts.join(', ')}`);
if (hostPerms.includes('<all_urls>') || hostPerms.includes('*://*/*') || hostPerms.includes('http://*/*') || hostPerms.includes('https://*/*')) {
  fail('host_permissions does not request broad access');
} else {
  pass('host_permissions does not request broad access');
}

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

const popupJs = readText('popup.js');
const idsInHtml = new Set([...popupHtml.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const idsInJs   = new Set([...popupJs.matchAll(/getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]));
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

const RUNTIME_URL_RE = /https?:\/\/[^\s"')]+/g;
for (const f of SCAN_FILES) {
  const txt = readText(f);
  const urls = (txt.match(RUNTIME_URL_RE) || []).filter(u => {
    if (/^https?:\/\/\$\{/.test(u)) return false;
    if (/^https?:\/\/$/.test(u))    return false;
    return true;
  });
  if (urls.length === 0) pass(`${f} has no runtime URLs`);
  else fail(`${f} contains runtime URL(s)`, urls.join(', '));
}

// --- 4. Domain matcher unit tests ---------------------------------------
group('domain matcher (isZoomHost / normalizeHost / hostMatchesBase)');
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
  { fn: 'normalizeHost', input: 'ZOOM.US.',            expect: 'zoom.us' },
  { fn: 'normalizeHost', input: 'host:443',            expect: 'host' },
  { fn: 'hostMatchesBase', input: 'a.zoom.us',         expect: true  }, // hostMatchesBase(host, 'zoom.us')
];
for (const c of cases) {
  let got;
  if (c.fn === 'hostMatchesBase') got = m[c.fn](c.input, 'zoom.us');
  else                            got = m[c.fn](c.input);
  const ok = got === c.expect;
  (ok ? pass : fail)(`${c.fn}(${JSON.stringify(c.input)}) -> ${JSON.stringify(c.expect)}`, ok ? '' : `got ${JSON.stringify(got)}`);
}

// --- 5. Zoom-only safety guards -----------------------------------------
// After narrowing to zoom-only (v1.1.0), assert no Custom domain / All sites
// scope feature, no install/startup auto-clear, no global HTTP cache wipe.
group('zoom-only safety guards');

function rejects(file, re, description) {
  const txt = readText(file);
  if (re.test(txt)) fail(`${file} ${description}`);
  else pass(`${file} ${description}`);
}
function requires(file, re, description) {
  const txt = readText(file);
  if (re.test(txt)) pass(`${file} ${description}`);
  else fail(`${file} ${description}`);
}

// No install/startup auto-clear hooks.
rejects('popup.js', /chrome\.runtime\.onInstalled\.addListener/, 'has no chrome.runtime.onInstalled listener');
rejects('popup.js', /chrome\.runtime\.onStartup\.addListener/,   'has no chrome.runtime.onStartup listener');

// init() never calls a destructive chrome.* API.
const initBodyMatch = popupJs.match(/async function init\s*\([^)]*\)\s*{([\s\S]*?)\n}/);
if (!initBodyMatch) {
  fail('popup.js init() function found');
} else {
  pass('popup.js init() function found');
  const initBody = initBodyMatch[1];
  if (/chrome\.browsingData\.remove/.test(initBody)) fail('popup.js init() does NOT call chrome.browsingData.remove');
  else                                                pass('popup.js init() does NOT call chrome.browsingData.remove');
  if (/chrome\.cookies\.remove/.test(initBody))      fail('popup.js init() does NOT call chrome.cookies.remove');
  else                                                pass('popup.js init() does NOT call chrome.cookies.remove');
  if (/chrome\.scripting\.executeScript/.test(initBody)) fail('popup.js init() does NOT call chrome.scripting.executeScript');
  else                                                    pass('popup.js init() does NOT call chrome.scripting.executeScript');
}

// FIX ZOOM is wired to an explicit click handler.
requires('popup.js', /zoomFixBtn\.addEventListener\(\s*['"]click['"]\s*,\s*runZoomFix\s*\)/, 'wires zoomFixBtn click to runZoomFix');

// No leftover manual scope UI or wiring.
rejects('popup.html', /name="scope"/,                          'has no scope radio group');
rejects('popup.html', /id="customDomain"/,                     'has no custom domain input');
rejects('popup.html', /id="fixBtn"/,                           'has no generic FIX NOW button');
rejects('popup.html', /id="allSitesWarning"/,                  'has no all-sites warning element');
rejects('popup.js',   /\bclearAllSites\b/,                     'has no clearAllSites helper');
rejects('popup.js',   /\bglobalBrowsingDataTypes\b/,           'has no globalBrowsingDataTypes helper');
rejects('popup.js',   /\bparseDomainInput\b/,                  'has no parseDomainInput helper');
rejects('popup.js',   /\bwireScopeToggle\b/,                   'has no wireScopeToggle helper');

// perOriginBrowsingDataTypes must not include the global `cache` key.
requires('popup.js', /function perOriginBrowsingDataTypes/,    'defines perOriginBrowsingDataTypes');
const perOriginMatch = popupJs.match(/function perOriginBrowsingDataTypes[\s\S]*?\n}/);
if (perOriginMatch) {
  const body = perOriginMatch[0];
  if (/\bcache\s*:\s*true/.test(body) && !/cacheStorage\s*:\s*true/.test(body)) {
    fail('perOriginBrowsingDataTypes does NOT set the global `cache` key');
  } else {
    pass('perOriginBrowsingDataTypes does NOT set the global `cache` key');
  }
  if (/cacheStorage\s*:\s*true/.test(body)) pass('perOriginBrowsingDataTypes sets the per-origin `cacheStorage` key');
  else                                       fail('perOriginBrowsingDataTypes sets the per-origin `cacheStorage` key');
}

// All chrome.browsingData.remove calls must go through clearForOrigins.
const removeCalls = popupJs.match(/chrome\.browsingData\.remove\s*\(/g) || [];
const wrappedCalls = popupJs.match(/clearForOrigins\s*\(/g) || [];
if (removeCalls.length > 0 && wrappedCalls.length > 0 && removeCalls.length === 1) {
  pass(`chrome.browsingData.remove only called once, inside clearForOrigins (count=${removeCalls.length})`);
} else {
  fail('chrome.browsingData.remove only called once, inside clearForOrigins',
       `remove=${removeCalls.length} clearForOrigins=${wrappedCalls.length}`);
}

// --- 6. Summary ----------------------------------------------------------
console.log('');
console.log(`Passed: ${passed}  Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
