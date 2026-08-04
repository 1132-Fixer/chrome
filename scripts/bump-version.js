#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/**
 * Bump the extension version in every place it is written down, in one step:
 *
 *   manifest.json  "version"        — the real version Chrome ships
 *   package.json   "version"        — kept in lockstep
 *   popup.html     #appVersion chip — the offline fallback label
 *
 * `scripts/validate-extension.js` fails the build if these three drift, so this
 * script is the only supported way to change the version.
 *
 * Usage:
 *   node scripts/bump-version.js patch          # 1.2.0 -> 1.2.1  (default)
 *   node scripts/bump-version.js minor          # 1.2.0 -> 1.3.0
 *   node scripts/bump-version.js major          # 1.2.0 -> 2.0.0
 *   node scripts/bump-version.js 1.4.2         # explicit version
 *   node scripts/bump-version.js patch --dry-run
 *   node scripts/bump-version.js --print        # print current version, change nothing
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const rel  = p => path.join(ROOT, p);

const args    = process.argv.slice(2);
const dryRun  = args.includes('--dry-run');
const printer = args.includes('--print');
const bump    = args.find(a => !a.startsWith('--')) || 'patch';

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function readJson(p) { return JSON.parse(fs.readFileSync(rel(p), 'utf8')); }

const manifest = readJson('manifest.json');
const current  = manifest.version;

if (!SEMVER.test(current)) {
  console.error(`manifest.json version "${current}" is not x.y.z — fix it by hand first.`);
  process.exit(1);
}

if (printer) {
  console.log(current);
  process.exit(0);
}

function nextVersion(from, how) {
  if (SEMVER.test(how)) return how;
  const [major, minor, patch] = from.split('.').map(Number);
  switch (how) {
    case 'major': return `${major + 1}.0.0`;
    case 'minor': return `${major}.${minor + 1}.0`;
    case 'patch': return `${major}.${minor}.${patch + 1}`;
    default:
      console.error(`Unknown bump "${how}". Use patch | minor | major | x.y.z`);
      process.exit(1);
  }
}

const next = nextVersion(current, bump);

if (next === current) {
  console.log(`Version already ${current} — nothing to do.`);
  process.exit(0);
}

/** Replace the first `"version": "…"` in a JSON file, leaving formatting alone. */
function writeVersionInJson(file) {
  const text = fs.readFileSync(rel(file), 'utf8');
  const updated = text.replace(/("version"\s*:\s*")[^"]+(")/, `$1${next}$2`);
  if (updated === text) throw new Error(`could not find a "version" field in ${file}`);
  if (!dryRun) fs.writeFileSync(rel(file), updated);
  return `${file}: ${current} -> ${next}`;
}

/** Replace the popup's hard-coded version chip (the pre-manifest fallback). */
function writeVersionInPopup() {
  const file = 'popup.html';
  const text = fs.readFileSync(rel(file), 'utf8');
  const updated = text.replace(/(id="appVersion"[^>]*>)v[0-9.]+(<)/, `$1v${next}$2`);
  if (updated === text) throw new Error('could not find the #appVersion chip in popup.html');
  if (!dryRun) fs.writeFileSync(rel(file), updated);
  return `${file}: version chip -> v${next}`;
}

try {
  const changes = [
    writeVersionInJson('manifest.json'),
    writeVersionInJson('package.json'),
    writeVersionInPopup(),
  ];
  console.log(`${dryRun ? '[dry run] ' : ''}${current} -> ${next}`);
  for (const c of changes) console.log(`  ${c}`);
  if (!dryRun) {
    console.log('\nNext: npm test   (the validator checks all three stayed in sync)');
  }
} catch (e) {
  console.error('bump failed:', e.message);
  process.exit(1);
}
