#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/**
 * Build the Chrome Web Store upload zip, cross-platform and dependency-free.
 *
 *   node scripts/package-extension.js
 *   -> store-assets/1132-fixer-chrome-<version>.zip
 *
 * Ships exactly the runtime files plus the two documents reviewers benefit from
 * (LICENSE, README.md, PRIVACY_POLICY.md). Dev tooling, store assets, CI config
 * and the git metadata are deliberately excluded — see STORE_PREP.md.
 *
 * `manifest.json` lands at the zip root, which the Web Store requires.
 * Timestamps are fixed so the same tree always produces the same bytes.
 */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT     = path.resolve(__dirname, '..');
const OUT_DIR  = path.join(ROOT, 'store-assets');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

const ENTRIES = [
  'manifest.json',
  'popup.html',
  'popup.css',
  'popup.js',
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
const missing = ENTRIES.filter(e => !fs.existsSync(path.join(ROOT, e)));
if (missing.length) {
  console.error('cannot package, missing files:\n  ' + missing.join('\n  '));
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const outPath = path.join(OUT_DIR, `1132-fixer-chrome-${manifest.version}.zip`);

const parts   = [];
const central = [];
let offset = 0;

for (const name of ENTRIES) {
  const data     = fs.readFileSync(path.join(ROOT, name));
  const deflated = zlib.deflateRawSync(data, { level: 9 });
  const header   = localHeader(name, data, deflated);
  parts.push(header, deflated);
  central.push(centralEntry(name, data, deflated, offset));
  offset += header.length + deflated.length;
  console.log(`  + ${name}  (${data.length} -> ${deflated.length} bytes)`);
}

const cd     = Buffer.concat(central);
const zipBuf = Buffer.concat([...parts, cd, endRecord(ENTRIES.length, cd.length, offset)]);
fs.writeFileSync(outPath, zipBuf);

console.log('');
console.log(`wrote ${path.relative(ROOT, outPath)}  (${zipBuf.length} bytes, ${ENTRIES.length} entries)`);
console.log(`manifest.json is at the zip root: ${ENTRIES[0] === 'manifest.json' ? 'yes' : 'NO'}`);
console.log(`version: ${manifest.version}`);
