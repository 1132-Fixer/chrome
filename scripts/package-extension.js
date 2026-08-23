#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/**
 * Build browser-target zips, cross-platform and dependency-free.
 *
 *   node scripts/package-extension.js
 *     -> store-assets/1132-fixer-chrome-<version>.zip
 *   node scripts/package-extension.js --all
 *     -> packages/1132-fixer-{chrome,edge,brave,firefox}-<version>.zip
 *   node scripts/package-extension.js firefox
 *     -> packages/1132-fixer-firefox-<version>.zip
 *
 * Ships exactly the runtime files plus LICENSE, README.md, PRIVACY_POLICY.md.
 * Dev tooling, store assets, CI config and git metadata are excluded.
 *
 * Chrome keeps the source manifest.json bytes. Other targets overlay name /
 * description (and Firefox gecko settings) from scripts/browser-targets.js.
 * One zip is not universal. This script does not publish.
 *
 * `manifest.json` lands at the zip root. Timestamps are fixed so the same
 * tree always produces the same bytes.
 */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');
const { TARGETS, applyOverlay } = require('./browser-targets');

const ROOT         = path.resolve(__dirname, '..');
const OUT_DIR      = path.join(ROOT, 'store-assets');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const manifest     = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

const ENTRIES = [
  'manifest.json',
  'popup.html',
  'popup.css',
  'popup.js',
  'report.html',
  'report.css',
  'report.js',
  'icons/icon.png',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png',
  'icons/popup-logo.png',
  'LICENSE',
  'README.md',
  'PRIVACY_POLICY.md',
];

// --- minimal zip writer --------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// Fixed DOS timestamp: 1980-01-01 00:00:00, for byte-identical rebuilds.
const DOS_TIME = 0;
const DOS_DATE = 0x0021;

function localHeader(name, data, deflated) {
  const nameBuf = Buffer.from(name, 'utf8');
  const head = Buffer.alloc(30);
  head.writeUInt32LE(0x04034b50, 0);
  head.writeUInt16LE(20, 4);            // version needed
  head.writeUInt16LE(0, 6);             // flags
  head.writeUInt16LE(8, 8);             // method: deflate
  head.writeUInt16LE(DOS_TIME, 10);
  head.writeUInt16LE(DOS_DATE, 12);
  head.writeUInt32LE(crc32(data), 14);
  head.writeUInt32LE(deflated.length, 18);
  head.writeUInt32LE(data.length, 22);
  head.writeUInt16LE(nameBuf.length, 26);
  head.writeUInt16LE(0, 28);            // extra length
  return Buffer.concat([head, nameBuf]);
}

function centralEntry(name, data, deflated, offset) {
  const nameBuf = Buffer.from(name, 'utf8');
  const head = Buffer.alloc(46);
  head.writeUInt32LE(0x02014b50, 0);
  head.writeUInt16LE(20, 4);            // version made by
  head.writeUInt16LE(20, 6);            // version needed
  head.writeUInt16LE(0, 8);             // flags
  head.writeUInt16LE(8, 10);            // method: deflate
  head.writeUInt16LE(DOS_TIME, 12);
  head.writeUInt16LE(DOS_DATE, 14);
  head.writeUInt32LE(crc32(data), 16);
  head.writeUInt32LE(deflated.length, 20);
  head.writeUInt32LE(data.length, 24);
  head.writeUInt16LE(nameBuf.length, 28);
  head.writeUInt16LE(0, 30);            // extra
  head.writeUInt16LE(0, 32);            // comment
  head.writeUInt16LE(0, 34);            // disk number
  head.writeUInt16LE(0, 36);            // internal attrs
  head.writeUInt32LE(0o644 << 16, 38);  // external attrs
  head.writeUInt32LE(offset, 42);
  return Buffer.concat([head, nameBuf]);
}

function endRecord(count, cdSize, cdOffset) {
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(count, 8);
  end.writeUInt16LE(count, 10);
  end.writeUInt32LE(cdSize, 12);
  end.writeUInt32LE(cdOffset, 16);
  end.writeUInt16LE(0, 20);
  return end;
}

// --- build ---------------------------------------------------------------
function assertEntriesExist() {
  const missing = ENTRIES.filter(e => !fs.existsSync(path.join(ROOT, e)));
  if (missing.length) {
    throw new Error('cannot package, missing files:\n  ' + missing.join('\n  '));
  }
}

function fileBytes(targetId, name) {
  if (name === 'manifest.json' && targetId !== 'chrome') {
    const overlaid = applyOverlay(manifest, targetId);
    return Buffer.from(JSON.stringify(overlaid, null, 2) + '\n');
  }
  return fs.readFileSync(path.join(ROOT, name));
}

function writeZip(fileMap, outPath) {
  const parts   = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of fileMap) {
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const header   = localHeader(name, data, deflated);
    parts.push(header, deflated);
    central.push(centralEntry(name, data, deflated, offset));
    offset += header.length + deflated.length;
    console.log(`  + ${name}  (${data.length} -> ${deflated.length} bytes)`);
  }
  const cd     = Buffer.concat(central);
  const zipBuf = Buffer.concat([...parts, cd, endRecord(fileMap.length, cd.length, offset)]);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, zipBuf);
  return zipBuf.length;
}

function packageTarget(targetId) {
  const target = TARGETS[targetId];
  if (!target) throw new Error('unknown packaging target: ' + targetId);
  assertEntriesExist();
  const fileMap = ENTRIES.map(name => ({ name, data: fileBytes(targetId, name) }));
  const fileName = `${target.zipStem}-${manifest.version}.zip`;
  const outPath = path.join(PACKAGES_DIR, fileName);
  console.log(`\n[${targetId}]`);
  const bytes = writeZip(fileMap, outPath);
  const written = [outPath];
  if (targetId === 'chrome') {
    const storePath = path.join(OUT_DIR, fileName);
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.copyFileSync(outPath, storePath);
    written.push(storePath);
  }
  console.log(`wrote ${path.relative(ROOT, outPath)}  (${bytes} bytes, ${ENTRIES.length} entries)`);
  console.log(`manifest.json is at the zip root: ${ENTRIES[0] === 'manifest.json' ? 'yes' : 'NO'}`);
  console.log(`version: ${manifest.version}`);
  return written;
}

function packageAll() {
  const paths = [];
  for (const id of Object.keys(TARGETS)) {
    paths.push(...packageTarget(id));
  }
  return paths;
}

function parseArgs(argv) {
  const args = argv.slice(2).filter(a => a !== '--');
  if (args.length === 0) return { mode: 'chrome' };
  if (args.length === 1 && args[0] === '--all') return { mode: 'all' };
  if (args.length === 1 && TARGETS[args[0]]) return { mode: args[0] };
  throw new Error('usage: node scripts/package-extension.js [--all | chrome | edge | brave | firefox]');
}

function main() {
  const { mode } = parseArgs(process.argv);
  if (mode === 'all') packageAll();
  else packageTarget(mode);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
} else {
  module.exports = {
    ENTRIES,
    TARGETS,
    ROOT,
    PACKAGES_DIR,
    OUT_DIR,
    packageTarget,
    packageAll,
    applyOverlay,
  };
}
