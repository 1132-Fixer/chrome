#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/**
 * Capture the four popup-state screenshots required by Chrome Web Store
 * submission, by loading popup.html in real Playwright Chromium with
 * `chrome.*` APIs mocked so the popup runs end-to-end.
 *
 * Output filenames match STORE_PREP.md:
 *   store-assets/01-zoom-detected.png
 *   store-assets/02-fix-complete.png
 *   store-assets/03-non-zoom-safe.png
 *   store-assets/05-manual-picker.png
 *
 * Screenshot #04 (chrome://extensions details/permissions) requires a real
 * Chromium load-unpacked flow — captured separately by
 * scripts/capture-extension-details.js.
 *
 * Resolves the globally-installed `playwright` so the repo does not gain a
 * node_modules dependency.
 */

const fs   = require('fs');
const path = require('path');

const PLAYWRIGHT_PATH = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'playwright');
const { chromium } = require(PLAYWRIGHT_PATH);

const ROOT       = path.resolve(__dirname, '..');
const POPUP_URL  = 'file:///' + path.join(ROOT, 'popup.html').replace(/\\/g, '/');
const OUT_DIR    = path.join(ROOT, 'store-assets');
fs.mkdirSync(OUT_DIR, { recursive: true });

/**
 * Build the mocked-chrome script that the popup expects. The popup's init()
 * calls chrome.tabs.query, chrome.runtime.getManifest, and on click calls
 * chrome.cookies.* / chrome.browsingData.remove / chrome.scripting.executeScript
 * / chrome.tabs.reload. Mock everything as no-op success so the popup behaves
 * exactly as it would for a real user clicking FIX ZOOM.
 */
function chromeMock(activeUrl) {
  return `(() => {
    window.chrome = {
      runtime: {
        getManifest: () => ({ name: '1132 Fixer for Chrome', version: '1.0.0', manifest_version: 3 }),
      },
      tabs: {
        query: async () => [{ id: 1, url: ${JSON.stringify(activeUrl)} }],
        reload: async () => {},
      },
      cookies: {
        getAll: async () => [],
        remove: async () => ({}),
      },
      browsingData: {
        remove: async () => {},
      },
      scripting: {
        executeScript: async () => [{ result: true }],
      },
    };
  })();`;
}

async function shoot({ name, activeUrl, after }) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 460, height: 760 },
      deviceScaleFactor: 2,
    });
    await context.addInitScript(chromeMock(activeUrl));
    const page = await context.newPage();
    page.on('pageerror', e => { throw new Error('popup pageerror: ' + e.message); });
    await page.goto(POPUP_URL, { waitUntil: 'domcontentloaded' });
    // Wait for popup init() to populate the status badge and log
    await page.waitForFunction(() => {
      const t = document.getElementById('statusBadgeText');
      return t && t.textContent && t.textContent !== 'Ready';
    }, { timeout: 5000 }).catch(() => {});
    if (typeof after === 'function') {
      await after(page);
    }
    // Tight crop around <body> so the screenshot matches popup dimensions
    const body = page.locator('body');
    const out = path.join(OUT_DIR, name);
    await body.screenshot({ path: out, omitBackground: false });
    console.log(`  wrote ${path.relative(ROOT, out)}`);
  } finally {
    await browser.close();
  }
}

(async () => {
  // 01 — zoom.us active, popup shows ZOOM DETECTED banner
  await shoot({
    name: '01-zoom-detected.png',
    activeUrl: 'https://zoom.us/',
  });

  // 02 — same setup, click FIX ZOOM, wait for ZOOM CLEARED status
  await shoot({
    name: '02-fix-complete.png',
    activeUrl: 'https://zoom.us/',
    after: async (page) => {
      await page.click('#zoomFixBtn');
      await page.waitForFunction(() => {
        const t = document.getElementById('statusBadgeText');
        return t && /CLEARED|ERROR|PARTIAL/.test(t.textContent || '');
      }, { timeout: 5000 });
    },
  });

  // 03 — non-Zoom site, banner hidden, scope picker visible
  await shoot({
    name: '03-non-zoom-safe.png',
    activeUrl: 'https://example.com/',
  });

  // 05 — manual picker: select Custom domain, type a host
  await shoot({
    name: '05-manual-picker.png',
    activeUrl: 'https://example.com/',
    after: async (page) => {
      await page.click('input[name="scope"][value="custom"]');
      await page.fill('#customDomain', 'example.org');
    },
  });

  console.log('done');
})().catch(e => {
  console.error('capture failed:', e && e.stack || e);
  process.exit(1);
});
