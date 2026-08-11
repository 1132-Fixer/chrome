#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/**
 * End-to-end behaviour test for the Report-a-Bug page (#16).
 *
 * Loads the real report.html / report.css / report.js in headless Chromium
 * with a recording window.fetch stub (nothing external is ever called) and a
 * minimal chrome.runtime mock, then asserts the three behaviours that matter:
 *   1. Service dark -> GitHub fallback link, never a dead form.
 *   2. Service live -> form renders; screenshot validation (magic bytes,
 *      5 MB) is honest; a submit carries the base64 image + bearer token and
 *      success shows the returned case reference.
 *   3. A non-image file is rejected client-side by content, not extension.
 *
 * Run:  node scripts/test-report-e2e.js
 * Exits non-zero if any check fails.
 */

const path = require('path');
const { pathToFileURL } = require('url');
const { requirePlaywright } = require('./lib/playwright');

const { chromium } = requirePlaywright();

const ROOT = path.resolve(__dirname, '..');
const REPORT_URL = pathToFileURL(path.join(ROOT, 'report.html')).href;
const MOCK_VERSION = '1.2.0';

// 1x1 black-pixel PNG — a real decodable image for the attach path.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64');

let passed = 0;
let failed = 0;
function check(ok, name, detail) {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else    { failed++; console.log(`  FAIL  ${name}${detail ? '  — ' + detail : ''}`); }
}
function group(title) { console.log('\n' + title); }

/** chrome.runtime mock + recording fetch stub, injected before report.js runs. */
function mockScript(cfg) {
  return `(() => {
  const CFG = ${JSON.stringify(cfg)};
  const calls = [];
  window.__fetchCalls = calls;
  window.chrome = {
    runtime: { getManifest: () => ({ name: '1132 Fixer for Chrome', version: CFG.version, manifest_version: 3 }) },
  };
  window.fetch = async (url, opts) => {
    const call = { url: String(url), method: (opts && opts.method) || 'GET', headers: (opts && opts.headers) || {}, body: opts && opts.body };
    calls.push(call);
    if (CFG.dark) throw new TypeError('Failed to fetch');
    const respond = (status, obj) => ({ status, ok: status < 400, json: async () => obj });
    if (call.url.endsWith('/health')) {
      return respond(200, { ok: true, capabilities: { screenshots: true } });
    }
    if (call.url.endsWith('/v1/principals')) {
      return respond(201, { principalId: 'IN-TESTTESTTE', token: 'a'.repeat(64) });
    }
    if (call.url.endsWith('/v1/cases')) {
      const body = JSON.parse(call.body);
      return respond(201, { caseRef: 'FX-TESTREF', kind: 'bug', state: 'new',
        subject: body.title, screenshotAttached: Boolean(body.screenshot) });
    }
    return respond(404, { error: 'unstubbed ' + call.url });
  };
})();`;
}

async function withReportPage(cfg, fn) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 700, height: 900 } });
    await context.addInitScript(mockScript(cfg));
    const page = await context.newPage();

    const pageErrors = [];
    const external = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    // blob:/data: are in-page object URLs (the screenshot preview), not network.
    page.on('request', (r) => {
      const u = r.url();
      if (!u.startsWith('file:') && !u.startsWith('blob:') && !u.startsWith('data:')) external.push(u);
    });

    await page.goto(REPORT_URL, { waitUntil: 'load' });
    await page.waitForFunction(() => document.getElementById('checkingView').hidden === true,
      { timeout: 10000 });

    await fn(page);

    check(pageErrors.length === 0, `${cfg.name}: page raised no errors`, pageErrors.join('; '));
    check(external.length === 0, `${cfg.name}: made no non-file:// requests`, external.join('; '));
  } finally {
    await browser.close();
  }
}

(async () => {
  group('service dark -> honest fallback, no dead form');
  await withReportPage({ name: 'dark', version: MOCK_VERSION, dark: true }, async (page) => {
    const s = await page.evaluate(() => ({
      fallbackHidden: document.getElementById('fallbackView').hidden,
      formHidden: document.getElementById('formView').hidden,
      link: document.getElementById('fallbackLink').href,
    }));
    check(s.fallbackHidden === false, 'fallback view is shown');
    check(s.formHidden === true, 'form stays hidden');
    check(s.link.includes('github.com/1132-Fixer/chrome/issues/new'),
      'fallback links to GitHub issues', s.link);
  });

  group('service live -> form, validation, submit with screenshot');
  await withReportPage({ name: 'live', version: MOCK_VERSION }, async (page) => {
    const s0 = await page.evaluate(() => ({
      formHidden: document.getElementById('formView').hidden,
      fallbackHidden: document.getElementById('fallbackView').hidden,
      submitDisabled: document.getElementById('bugSubmit').disabled,
      version: document.getElementById('appVersion').textContent.trim(),
    }));
    check(s0.formHidden === false, 'form is shown');
    check(s0.fallbackHidden === true, 'fallback is hidden');
    check(s0.submitDisabled === true, 'submit starts disabled');
    check(s0.version === 'v' + MOCK_VERSION, 'version chip comes from the manifest', s0.version);

    await page.fill('#bugText', 'short');
    check(await page.locator('#bugSubmit').isDisabled(), 'under 50 chars keeps submit disabled');
    await page.fill('#bugText',
      'The fix button does nothing on us02web.zoom.us — the popup opens, I click, nothing happens.');
    check(!(await page.locator('#bugSubmit').isDisabled()), '50+ chars enables submit');

    // The magic-byte rejection lands after an async file read — always await
    // the status text rather than reading it immediately (flaky otherwise).
    const shotStatusShows = (want) => page.waitForFunction(
      (w) => (document.getElementById('shotStatus').textContent || '').includes(w),
      want, { timeout: 5000 }).then(() => true, () => false);

    // Wrong type: PNG-named text file must be rejected by magic bytes.
    await page.setInputFiles('#shotInput', {
      name: 'notes-renamed.png', mimeType: 'image/png', buffer: Buffer.from('just some text'),
    });
    check(await shotStatusShows('Only image files'), 'renamed text file rejected by content');

    // Declared-MIME gate: real PNG bytes declared as a non-image type.
    await page.setInputFiles('#shotInput', {
      name: 'shot.png', mimeType: 'text/plain', buffer: TINY_PNG,
    });
    check(await shotStatusShows('Only image files'), 'non-image declared MIME rejected');

    // Real PNG attaches and previews.
    await page.setInputFiles('#shotInput', {
      name: 'error.png', mimeType: 'image/png', buffer: TINY_PNG,
    });
    await page.waitForFunction(() => document.getElementById('shotPreview').hidden === false,
      { timeout: 5000 });
    const preview = await page.evaluate(() => ({
      name: document.getElementById('shotName').textContent,
      imgSrc: document.getElementById('shotImg').src,
      rowHidden: document.getElementById('shotRow').hidden,
    }));
    check(preview.name === 'error.png', 'preview shows the file name', preview.name);
    check(preview.imgSrc.startsWith('blob:'), 'preview renders the image', preview.imgSrc);
    check(preview.rowHidden === true, 'attach row is replaced by the preview');

    await page.click('#bugSubmit');
    await page.waitForFunction(
      () => /Submitted|error|failed|try again/i.test(document.getElementById('bugStatus').textContent),
      { timeout: 10000 });
    const done = await page.evaluate(() => ({
      status: document.getElementById('bugStatus').textContent,
      statusClass: document.getElementById('bugStatus').className,
      calls: window.__fetchCalls.map((c) => ({ url: c.url, method: c.method, headers: c.headers, body: c.body })),
    }));
    check(/Submitted — reference FX-TESTREF/.test(done.status), 'success names the case reference', done.status);
    check(done.statusClass.includes('ok'), 'success is styled ok', done.statusClass);

    const casePost = done.calls.find((c) => c.url.endsWith('/v1/cases'));
    check(Boolean(casePost), 'a /v1/cases POST was made');
    const body = casePost ? JSON.parse(casePost.body) : {};
    check(body.type === 'bug' && typeof body.title === 'string', 'case body carries type + title');
    check(Boolean(body.screenshot && body.screenshot.data), 'case body carries the base64 screenshot');
    check(body.screenshot && Buffer.from(body.screenshot.data, 'base64').equals(TINY_PNG),
      'screenshot bytes survive the base64 round trip byte-exact');
    check(/^Bearer a{64}$/.test(casePost.headers.Authorization || ''), 'bearer token attached');
    check(Boolean(casePost.headers['Idempotency-Key']), 'idempotency key attached');
    const reg = done.calls.find((c) => c.url.endsWith('/v1/principals'));
    check(Boolean(reg) && JSON.parse(reg.body).product === 'CHROME', 'install registered as CHROME');
  });

  group('oversized image rejected client-side');
  await withReportPage({ name: 'big', version: MOCK_VERSION }, async (page) => {
    const big = Buffer.alloc(5 * 1024 * 1024 + 1);
    TINY_PNG.copy(big, 0);
    await page.setInputFiles('#shotInput', { name: 'huge.png', mimeType: 'image/png', buffer: big });
    const shown = await page.waitForFunction(
      () => (document.getElementById('shotStatus').textContent || '').includes('5 MB'),
      undefined, { timeout: 5000 }).then(() => true, () => false);
    check(shown, 'oversized rejected with the truthful limit');
    const hidden = await page.evaluate(() => document.getElementById('shotPreview').hidden);
    check(hidden === true, 'no preview for a rejected file');
    const inputCleared = await page.evaluate(() => document.getElementById('shotInput').value === '');
    check(inputCleared, 'rejected file clears the picker (same file can be re-selected)');
  });

  console.log('');
  console.log(`Passed: ${passed}  Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
})();
