#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/**
 * Capture screenshot #04: the chrome://extensions Details page for 1132 Fixer
 * with its loaded permissions list visible. Requires real Chromium load-unpacked
 * (headless mode does not support extensions), so we launch a temporary
 * persistent context with `--load-extension=` pointed at the repo root.
 *
 * Output: store-assets/04-extension-details-permissions.png
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PLAYWRIGHT_PATH = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'playwright');
const { chromium } = require(PLAYWRIGHT_PATH);

const ROOT    = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'store-assets');
fs.mkdirSync(OUT_DIR, { recursive: true });

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), '1132-pw-profile-'));

(async () => {
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    args: [
      '--disable-extensions-except=' + ROOT,
      '--load-extension=' + ROOT,
      '--no-first-run',
      '--no-default-browser-check',
    ],
  });
  let extensionId = null;
  try {
    // Discover the loaded extension's ID via the service worker / background URL.
    // For MV3 popup-only extensions without a service worker, the ID surfaces as
    // soon as Chrome registers the extension; we poll chrome://extensions for it.
    const page = await context.newPage();
    await page.goto('chrome://extensions', { waitUntil: 'domcontentloaded' });
    // Make sure dev mode is on so the ID + details surface.
    await page.evaluate(() => {
      const mgr = document.querySelector('extensions-manager');
      const tb  = mgr && mgr.shadowRoot && mgr.shadowRoot.querySelector('extensions-toolbar');
      const tog = tb  && tb.shadowRoot  && tb.shadowRoot.querySelector('#devMode');
      if (tog && !tog.checked) tog.click();
    });
    await page.waitForTimeout(500);
    extensionId = await page.evaluate(() => {
      const mgr   = document.querySelector('extensions-manager');
      const list  = mgr && mgr.shadowRoot && mgr.shadowRoot.querySelector('extensions-item-list');
      const items = list && list.shadowRoot && list.shadowRoot.querySelectorAll('extensions-item');
      if (!items) return null;
      for (const it of items) {
        const name = it.shadowRoot && it.shadowRoot.querySelector('#name');
        if (name && /1132/.test(name.textContent || '')) return it.getAttribute('id');
      }
      return null;
    });
    if (!extensionId) throw new Error('1132 Fixer extension id not discoverable on chrome://extensions');
    console.log('  extension id:', extensionId);

    // Navigate to the per-extension Details page; permissions list lives there.
    await page.goto('chrome://extensions/?id=' + extensionId, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const out = path.join(OUT_DIR, '04-extension-details-permissions.png');
    await page.screenshot({ path: out, fullPage: false });
    console.log('  wrote', path.relative(ROOT, out));
  } finally {
    await context.close();
    try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch {}
  }
})().catch(e => {
  console.error('capture failed:', e && e.stack || e);
  process.exit(1);
});
