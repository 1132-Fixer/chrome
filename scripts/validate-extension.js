#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

// Source-level validation for the 1132 Fixer Chrome extension.
// Run from project root: `node scripts/validate-extension.js`
// Exits non-zero if any check fails.
//
// Two invariants this file exists to defend:
//   1. Zoom-only  — no manual / Custom domain / All sites scope, narrow hosts.
//   2. Cookies-only (v1.2.0) — cookies are the ONLY data type touched, so
//      `browsingData` and `scripting` must stay out of the manifest and out of
//      popup.js, and the popup stays a single button with no options.

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

// Chrome Web Store caps the listing summary at 132 characters.
if ((manifest.description || '').length <= 132) pass(`description is ≤132 chars (${manifest.description.length})`);
else fail('description is ≤132 chars', `${manifest.description.length} chars`);

const popupPath = manifest.action && manifest.action.default_popup;
if (popupPath && exists(popupPath)) pass(`action.default_popup exists: ${popupPath}`);
else fail('action.default_popup exists', popupPath || '(missing)');

for (const size of ['16', '32', '48', '128']) {
  const p = manifest.icons && manifest.icons[size];
  if (p && exists(p)) pass(`icons.${size} exists: ${p}`);
  else fail(`icons.${size} exists`, p || '(missing)');
}

// Cookies-only: `cookies` to read/delete the jar, `activeTab` to detect the
// Zoom tab and reload it. Nothing else is needed or allowed.
const ALLOWED_PERMS = new Set(['cookies', 'activeTab']);
const perms = manifest.permissions || [];
const extra = perms.filter(p => !ALLOWED_PERMS.has(p));
if (extra.length === 0) pass(`permissions are exactly the minimal set [${[...ALLOWED_PERMS].join(', ')}]`);
else fail('permissions are exactly the minimal set', `extra: ${extra.join(', ')}`);

const missing = [...ALLOWED_PERMS].filter(p => !perms.includes(p));
if (missing.length === 0) pass('permissions include all required');
else fail('permissions include all required', `missing: ${missing.join(', ')}`);

// Explicit tripwire for the data types removed in v1.2.0.
for (const banned of ['browsingData', 'scripting', 'tabs', 'storage', 'webRequest', 'history', '<all_urls>']) {
  if (perms.includes(banned)) fail(`permissions do NOT include "${banned}"`);
  else pass(`permissions do NOT include "${banned}"`);
}

// host_permissions must stay Zoom-only. Both schemes are listed because Chrome
// maps a non-Secure cookie to an http:// URL and hides it from an https-only
// extension — without http the clear would silently miss those cookies.
const ALLOWED_HOSTS = new Set([
  'https://*.zoom.us/*',
  'https://*.zoom.com/*',
  'http://*.zoom.us/*',
  'http://*.zoom.com/*',
]);
const hostPerms = manifest.host_permissions || [];
if (hostPerms.length > 0) pass('host_permissions is non-empty');
else fail('host_permissions is non-empty');
const badHosts = hostPerms.filter(h => !ALLOWED_HOSTS.has(h));
if (badHosts.length === 0) pass('host_permissions is zoom-only');
else fail('host_permissions is zoom-only', `extra: ${badHosts.join(', ')}`);
if (hostPerms.some(h => /^(\*|https?):\/\/(\*\/|\*$)/.test(h)) || hostPerms.includes('<all_urls>')) {
  fail('host_permissions does not request broad access', hostPerms.join(', '));
} else {
  pass('host_permissions does not request broad access');
}

// --- 2. Version consistency ---------------------------------------------
group('version consistency');
const pkg = JSON.parse(readText('package.json'));
if (pkg.version === manifest.version) pass(`package.json version matches manifest (${manifest.version})`);
else fail('package.json version matches manifest', `package.json ${pkg.version} vs manifest ${manifest.version}`);

const popupHtml = readText('popup.html');
const versionChip = popupHtml.match(/id="appVersion"[^>]*>v([0-9.]+)</);
if (!versionChip) fail('popup.html has a version chip fallback');
else if (versionChip[1] === manifest.version) pass(`popup.html version chip matches manifest (v${manifest.version})`);
else fail('popup.html version chip matches manifest', `popup.html v${versionChip[1]} vs manifest ${manifest.version}`);

// --- 3. Popup file references --------------------------------------------
group('popup files');
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

// MV3 CSP forbids inline script; inline handlers would also break it.
if (/<script(?![^>]*\bsrc=)/i.test(popupHtml)) fail('popup.html has no inline <script>');
else pass('popup.html has no inline <script>');
if (/\son[a-z]+\s*=\s*["']/i.test(popupHtml)) fail('popup.html has no inline event handler attributes');
else pass('popup.html has no inline event handler attributes');

// --- 4. One-button UI ----------------------------------------------------
group('one-button popup (no options, no detail panels)');
const buttons = [...popupHtml.matchAll(/<button\b/gi)];
if (buttons.length === 1) pass('popup.html contains exactly one <button>');
else fail('popup.html contains exactly one <button>', `found ${buttons.length}`);
if (/id="zoomFixBtn"/.test(popupHtml)) pass('the one button is #zoomFixBtn');
else fail('the one button is #zoomFixBtn');
if (/type="button"/.test(popupHtml)) pass('button declares type="button"');
else fail('button declares type="button"');
for (const [re, label] of [
  [/<input\b/i,    'no <input> controls'],
  [/<select\b/i,   'no <select> controls'],
  [/<textarea\b/i, 'no <textarea> controls'],
  [/type="checkbox"/i, 'no checkboxes'],
  [/id="fileList"/, 'no scrolling log panel'],
  [/name="scope"/, 'no scope radio group'],
  [/id="customDomain"/, 'no custom domain input'],
  [/id="fixBtn"/, 'no generic FIX NOW button'],
  [/id="allSitesWarning"/, 'no all-sites warning element'],
]) {
  if (re.test(popupHtml)) fail(`popup.html has ${label}`);
  else pass(`popup.html has ${label}`);
}

// --- 5. Telemetry / remote-code scan ------------------------------------
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
// Static navigation links the popup may carry. NOT runtime code: no fetch, no
// script, just an <a href> the user clicks. Keep this list exact-match tiny.
const ALLOWED_STATIC_LINKS = new Set([
  'https://1132-fixer.xyz/',
  'https://github.com/PrimeUpYourLife/1132-Fixer-Chrome/issues/new',
]);
for (const f of SCAN_FILES) {
  const txt = readText(f);
  const urls = (txt.match(RUNTIME_URL_RE) || []).filter(u => {
    if (/^https?:\/\/\$\{/.test(u)) return false;
    if (/^https?:\/\/$/.test(u))    return false;
    if (f === 'popup.html' && ALLOWED_STATIC_LINKS.has(u)) return false;
    return true;
  });
  if (urls.length === 0) pass(`${f} has no runtime URLs`);
  else fail(`${f} contains runtime URL(s)`, urls.join(', '));
}

// --- 6. Unit tests: domain matcher + cookie helpers ---------------------
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

group('cookie helpers (cookieUrl / cookieKey)');
const urlCases = [
  { cookie: { secure: true,  domain: 'zoom.us',   path: '/'    }, expect: 'https://zoom.us/' },
  { cookie: { secure: false, domain: 'zoom.us',   path: '/'    }, expect: 'http://zoom.us/' },
  { cookie: { secure: true,  domain: '.zoom.us',  path: '/'    }, expect: 'https://zoom.us/' },
  { cookie: { secure: true,  domain: '.zoom.com', path: '/wc/' }, expect: 'https://zoom.com/wc/' },
];
for (const c of urlCases) {
  const got = m.cookieUrl(c.cookie);
  (got === c.expect ? pass : fail)(`cookieUrl(${JSON.stringify(c.cookie)}) -> ${c.expect}`, got);
}
const base       = { storeId: '0', domain: 'zoom.us', path: '/', name: 'cred' };
const sameCookie = { ...base };
const otherPath  = { ...base, path: '/wc/' };
const partitioned = { ...base, partitionKey: { topLevelSite: 'https://zoom.us' } };
(m.cookieKey(base) === m.cookieKey(sameCookie) ? pass : fail)('cookieKey is stable for the same cookie');
(m.cookieKey(base) !== m.cookieKey(otherPath) ? pass : fail)('cookieKey distinguishes paths');
(m.cookieKey(base) !== m.cookieKey(partitioned) ? pass : fail)('cookieKey distinguishes partitioned cookies');

// --- 7. Zoom-only + cookies-only safety guards --------------------------
group('zoom-only + cookies-only safety guards');

/**
 * Source with comments removed, so the API guards below match real code rather
 * than prose *about* the code (popup.js explains which data types it leaves
 * alone, and that explanation must not trip the guards).
 */
function codeOf(rel) {
  return readText(rel)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .filter(line => !/^\s*\/\//.test(line))
    .join('\n');
}
const popupJsCode = codeOf('popup.js');

function rejects(file, re, description) {
  const txt = file === 'popup.js' ? popupJsCode : codeOf(file);
  if (re.test(txt)) fail(`${file} ${description}`);
  else pass(`${file} ${description}`);
}
function requires(file, re, description) {
  const txt = file === 'popup.js' ? popupJsCode : codeOf(file);
  if (re.test(txt)) pass(`${file} ${description}`);
  else fail(`${file} ${description}`);
}

// No install/startup auto-clear hooks.
rejects('popup.js', /chrome\.runtime\.onInstalled\.addListener/, 'has no chrome.runtime.onInstalled listener');
rejects('popup.js', /chrome\.runtime\.onStartup\.addListener/,   'has no chrome.runtime.onStartup listener');

// Cookies are the only data type touched.
rejects('popup.js', /chrome\.browsingData/,        'never calls chrome.browsingData');
rejects('popup.js', /chrome\.scripting/,           'never calls chrome.scripting');
rejects('popup.js', /\bsessionStorage\b/,          'never touches sessionStorage');
rejects('popup.js', /\blocalStorage\b/,            'never touches localStorage');
rejects('popup.js', /\bindexedDB\b/i,              'never touches IndexedDB');
rejects('popup.js', /\bcacheStorage\b/i,           'never touches cacheStorage');
rejects('popup.js', /serviceWorker/i,              'never touches service workers');
rejects('popup.js', /\bclearAllSites\b/,           'has no clearAllSites helper');
rejects('popup.js', /\bclearForOrigins\b/,         'has no origin-scoped browsingData helper');
rejects('popup.js', /BrowsingDataTypes\b/,         'has no browsingData type map');
rejects('popup.js', /\bparseDomainInput\b/,        'has no parseDomainInput helper');
rejects('popup.js', /\bwireScopeToggle\b/,         'has no wireScopeToggle helper');

// The cookie clear path is the one destructive path, and it is the only one.
requires('popup.js', /function clearCookiesForHost/, 'defines clearCookiesForHost');
const destructive = popupJsCode.match(/chrome\.\w+\.(remove|clear|delete)\w*\s*\(/g) || [];
if (destructive.length === 1 && /chrome\.cookies\.remove\s*\(/.test(destructive[0])) {
  pass('the only destructive chrome.* call is chrome.cookies.remove');
} else {
  fail('the only destructive chrome.* call is chrome.cookies.remove', destructive.join(', ') || 'none found');
}

// FIX ZOOM is wired to an explicit click handler.
requires('popup.js', /zoomFixBtn\.addEventListener\(\s*['"]click['"]\s*,\s*runZoomFix\s*\)/, 'wires zoomFixBtn click to runZoomFix');

// init() never calls a destructive chrome.* API.
const initBodyMatch = popupJs.match(/async function init\s*\([^)]*\)\s*{([\s\S]*?)\n}/);
if (!initBodyMatch) {
  fail('popup.js init() function found');
} else {
  pass('popup.js init() function found');
  const initBody = initBodyMatch[1];
  if (/chrome\.cookies\.remove/.test(initBody)) fail('popup.js init() does NOT call chrome.cookies.remove');
  else                                          pass('popup.js init() does NOT call chrome.cookies.remove');
  if (/chrome\.tabs\.reload/.test(initBody))    fail('popup.js init() does NOT reload the tab');
  else                                          pass('popup.js init() does NOT reload the tab');
}

// --- 8. Summary ----------------------------------------------------------
console.log('');
console.log(`Passed: ${passed}  Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
