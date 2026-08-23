#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/**
 * Prove each browser package exists and Chrome-only claims stay on Chrome.
 *
 *   node scripts/test-packages.js
 *
 * Does not publish. Does not load the zips into a browser.
 */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');
const { TARGETS, applyOverlay } = require('./browser-targets');
const { ENTRIES, PACKAGES_DIR, packageAll } = require('./package-extension');

const ROOT = path.resolve(__dirname, '..');
let failed = 0;
let passed = 0;

function pass(name) { passed++; console.log(`  PASS  ${name}`); }
function fail(name, detail) { failed++; console.log(`  FAIL  ${name}${detail ? '  — ' + detail : ''}`); }
function group(title) { console.log('\n' + title); }

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

function unzipEntries(buf) {
  const entries = {};
  let offset = 0;
  while (offset + 30 <= buf.length) {
    const sig = buf.readUInt32LE(offset);
    if (sig !== 0x04034b50) break;
    const method   = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen  = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buf.slice(nameStart, nameStart + nameLen).toString('utf8');
    const dataStart = nameStart + nameLen + extraLen;
    const compressed = buf.slice(dataStart, dataStart + compSize);
    entries[name] = method === 8 ? zlib.inflateRawSync(compressed) : compressed;
    offset = dataStart + compSize;
  }
  return entries;
}

function zipPath(target, version) {
  return path.join(PACKAGES_DIR, `${target.zipStem}-${version}.zip`);
}

const sourceManifest = readJson('manifest.json');
const pkg = readJson('package.json');
const ALLOWED_HOSTS = new Set(sourceManifest.host_permissions);
const BANNED = ['<all_urls>', 'browsingData', 'tabs', 'storage', 'webRequest', 'history'];
const TARGET_IDS = Object.keys(TARGETS);

group('package all four targets');
let packaged;
try {
  packaged = packageAll();
  pass('packageAll() completed');
} catch (e) {
  fail('packageAll() completed', e.message);
  console.log(`\nPassed: ${passed}  Failed: ${failed}`);
  process.exit(1);
}

group('each package exists (not one universal zip)');
const zips = {};
for (const id of TARGET_IDS) {
  const p = zipPath(TARGETS[id], sourceManifest.version);
  if (fs.existsSync(p) && fs.statSync(p).size > 0) {
    pass(`${id} zip exists: ${path.relative(ROOT, p)}`);
    zips[id] = fs.readFileSync(p);
  } else {
    fail(`${id} zip exists`, p);
  }
}
if (new Set(TARGET_IDS.map(id => TARGETS[id].zipStem)).size === TARGET_IDS.length) {
  pass('each target has a distinct zip stem');
} else {
  fail('each target has a distinct zip stem');
}

const chromeBytes = zips.chrome;
for (const id of TARGET_IDS.filter(t => t !== 'chrome')) {
  if (zips[id] && chromeBytes && !zips[id].equals(chromeBytes)) {
    pass(`${id} zip is not the Chrome zip`);
  } else if (zips[id] && chromeBytes) {
    fail(`${id} zip is not the Chrome zip`, 'byte-identical to Chrome');
  }
}

group('packaged manifests: Zoom-only, no all_urls, Chrome claims stay Chrome-only');
const parsed = {};
for (const id of TARGET_IDS) {
  if (!zips[id]) continue;
  const entries = unzipEntries(zips[id]);
  if (entries['manifest.json']) pass(`${id}: manifest.json at zip root`);
  else fail(`${id}: manifest.json at zip root`);

  let m;
  try {
    m = JSON.parse(entries['manifest.json'].toString('utf8'));
    parsed[id] = m;
    pass(`${id}: packaged manifest parses`);
  } catch (e) {
    fail(`${id}: packaged manifest parses`, e.message);
    continue;
  }

  if (m.version === sourceManifest.version && m.version === pkg.version) {
    pass(`${id}: version is ${m.version}`);
  } else {
    fail(`${id}: version matches source`, `got ${m.version}`);
  }

  if (m.name === TARGETS[id].name) pass(`${id}: name is ${JSON.stringify(m.name)}`);
  else fail(`${id}: name overlay`, `got ${JSON.stringify(m.name)}`);

  if (m.description === TARGETS[id].description) pass(`${id}: description overlay`);
  else fail(`${id}: description overlay`, m.description);

  const hosts = m.host_permissions || [];
  const extraHosts = hosts.filter(h => !ALLOWED_HOSTS.has(h));
  if (hosts.length === ALLOWED_HOSTS.size && extraHosts.length === 0) {
    pass(`${id}: host_permissions stay Zoom-only`);
  } else {
    fail(`${id}: host_permissions stay Zoom-only`, extraHosts.join(', ') || 'count mismatch');
  }
  if (hosts.includes('<all_urls>') || BANNED.some(b => (m.permissions || []).includes(b))) {
    fail(`${id}: no banned permissions or <all_urls>`, JSON.stringify({ permissions: m.permissions, hosts }));
  } else {
    pass(`${id}: no banned permissions or <all_urls>`);
  }

  const missingFiles = ENTRIES.filter(name => !entries[name]);
  if (missingFiles.length === 0) pass(`${id}: all ENTRIES present`);
  else fail(`${id}: all ENTRIES present`, missingFiles.join(', '));
}

if (parsed.chrome) {
  if (parsed.chrome.name === sourceManifest.name && parsed.chrome.description === sourceManifest.description) {
    pass('Chrome package name/description match the live source manifest');
  } else {
    fail('Chrome package name/description match the live source manifest');
  }
  if (/\bChrome\b/.test(parsed.chrome.name) && /\bChrome\b/.test(parsed.chrome.description)) {
    pass('Chrome package claims Chrome');
  } else {
    fail('Chrome package claims Chrome');
  }
  if (parsed.chrome.minimum_chrome_version === sourceManifest.minimum_chrome_version) {
    pass('Chrome package keeps minimum_chrome_version');
  } else {
    fail('Chrome package keeps minimum_chrome_version');
  }
  if (!parsed.chrome.browser_specific_settings) pass('Chrome package has no gecko settings');
  else fail('Chrome package has no gecko settings');
}

for (const id of ['edge', 'brave', 'firefox']) {
  const m = parsed[id];
  if (!m) continue;
  const blob = m.name + ' ' + m.description;
  if (/\bChrome\b/.test(blob)) fail(`${id}: Chrome-only claims stay off this package`, blob);
  else pass(`${id}: Chrome-only claims stay off this package`);
}

if (parsed.firefox) {
  const g = parsed.firefox.browser_specific_settings && parsed.firefox.browser_specific_settings.gecko;
  if (g && g.id === TARGETS.firefox.gecko.id && g.strict_min_version === TARGETS.firefox.gecko.strict_min_version) {
    pass('Firefox package has gecko id and strict_min_version');
  } else {
    fail('Firefox package has gecko id and strict_min_version', JSON.stringify(g));
  }
  if (!('minimum_chrome_version' in parsed.firefox)) pass('Firefox package has no minimum_chrome_version');
  else fail('Firefox package has no minimum_chrome_version');
}

group('overlay helper matches packaged bytes for non-Chrome targets');
for (const id of ['edge', 'brave', 'firefox']) {
  if (!zips[id]) continue;
  const expected = Buffer.from(JSON.stringify(applyOverlay(sourceManifest, id), null, 2) + '\n');
  const entries = unzipEntries(zips[id]);
  if (entries['manifest.json'] && entries['manifest.json'].equals(expected)) {
    pass(`${id}: zip manifest bytes match applyOverlay()`);
  } else {
    fail(`${id}: zip manifest bytes match applyOverlay()`);
  }
}

if (parsed.chrome) {
  const srcBytes = fs.readFileSync(path.join(ROOT, 'manifest.json'));
  const packed = unzipEntries(zips.chrome)['manifest.json'];
  if (packed && packed.equals(srcBytes)) pass('Chrome zip ships the source manifest.json bytes');
  else fail('Chrome zip ships the source manifest.json bytes');
}

if (!Array.isArray(packaged) || packaged.length < TARGET_IDS.length) {
  fail('packageAll returns a path per target');
} else {
  pass('packageAll returns a path per target');
}

console.log('');
console.log(`Passed: ${passed}  Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
