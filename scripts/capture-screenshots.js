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
 *
 * Screenshot #04 (chrome://extensions details/permissions) requires a real
 * Chromium load-unpacked flow — captured separately by
 * scripts/capture-extension-details.js.
 *
 * As of v1.1.0 the popup is intentionally zoom-only, and as of v1.2.0 it clears
 * cookies only and renders a single button. The former 05-manual-picker shot was
 * dropped along with the Custom domain / All sites scope feature.
 *
 * The mocked cookie jar is deliberately EMPTY, so shot 02 shows the truthful
 * "no Zoom cookies were left to remove" end state rather than a fabricated
 * count. Capture a real-session shot yourself if the listing needs one.
 *
 * Resolves the globally-installed `playwright` so the repo does not gain a
 * node_modules dependency.
 */

const fs   = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { requirePlaywright } = require('./lib/playwright');

const { chromium } = requirePlaywright();

const ROOT       = path.resolve(__dirname, '..');
const POPUP_URL  = pathToFileURL(path.join(ROOT, 'popup.html')).href;
const OUT_DIR    = path.join(ROOT, 'store-assets');
const VERSION    = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')).version;
fs.mkdirSync(OUT_DIR, { recursive: true });

/**
 * Build the mocked-chrome script the popup expects: init() calls
 * chrome.tabs.query + chrome.runtime.getManifest, and a FIX ZOOM click calls
 * chrome.cookies.getAll / chrome.cookies.remove / chrome.tabs.reload. Those are
 * the only chrome.* APIs the cookies-only popup touches.
 */
function chromeMock(activeUrl) {
  return `(() => {
    window.chrome = {
      runtime: {
        getManifest: () => ({ name: '1132 Fixer for Chrome', version: ${JSON.stringify(VERSION)}, manifest_version: 3 }),
      },
      tabs: {
        query: async () => [{ id: 1, url: ${JSON.stringify(activeUrl)} }],
        reload: async () => {},
      },
      cookies: {
        getAll: async () => [],
        remove: async () => ({}),
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
  // 01 — zoom.us active: state pill shows the host, one FIX ZOOM button
  await shoot({
    name: '01-zoom-detected.png',
    activeUrl: 'https://zoom.us/',
  });

  // 02 — same setup, click FIX ZOOM, wait for the CLEARED state
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

  // 03 — non-Zoom site: NOT ZOOM pill, no button, one explanatory line
  await shoot({
    name: '03-non-zoom-safe.png',
    activeUrl: 'https://example.com/',
  });

  console.log('done');
})().catch(e => {
  console.error('capture failed:', e && e.stack || e);
  process.exit(1);
});
