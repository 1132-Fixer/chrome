#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/**
 * End-to-end behaviour test for the 1132 Fixer popup.
 *
 * Loads the real popup.html / popup.css / popup.js in headless Chromium with a
 * recording `chrome.*` mock, drives the single FIX ZOOM button, and asserts
 * what actually happened — cookies removed exactly once each, the right URLs,
 * the right end state, and no read of any non-cookie API.
 *
 * Run:  node scripts/test-popup-e2e.js      (or: npm run e2e)
 * Exits non-zero if any check fails.
 */

const path = require('path');
const { pathToFileURL } = require('url');
const { requirePlaywright } = require('./lib/playwright');

const { chromium } = requirePlaywright();

const ROOT      = path.resolve(__dirname, '..');
const POPUP_URL = pathToFileURL(path.join(ROOT, 'popup.html')).href;
const POPUP_WIDTH = 360;

let passed = 0;
let failed = 0;

function check(ok, name, detail) {
  if (ok) { passed++; console.log(`  PASS  ${name}`); }
  else    { failed++; console.log(`  FAIL  ${name}${detail ? '  — ' + detail : ''}`); }
}
function group(title) { console.log('\n' + title); }

/** The `chrome.*` mock injected into the popup page before popup.js runs. */
function mockScript(cfg) {
  return `(() => {
  const CFG = ${JSON.stringify(cfg)};
  const jar = (CFG.jar || []).map(c => Object.assign({ path: '/', secure: true, storeId: '0' }, c));
  const calls = { getAll: [], remove: [], reload: [], forbidden: [] };
  window.__calls = calls;
  window.__jar = jar;

  const baseOf = d => (d.startsWith('.') ? d.slice(1) : d);
  const domainMatches = (cookieDomain, filter) => {
    if (!filter) return true;
    const c = baseOf(cookieDomain), f = baseOf(filter);
    return c === f || c.endsWith('.' + f);
  };
  const partitionMatches = (c, details) => {
    if (details.partitionKey) {
      // Real Chrome: an empty partitionKey returns cookies from every
      // partition PLUS the unpartitioned jar.
      if (details.partitionKey.topLevelSite === undefined) return true;
      return !!c.partitionKey && c.partitionKey.topLevelSite === details.partitionKey.topLevelSite;
    }
    return !c.partitionKey;
  };

  const chromeMock = {
    runtime: {
      getManifest: () => ({ name: '1132 Fixer for Chrome', version: CFG.version, manifest_version: 3 }),
    },
    tabs: {
      query: async () => (CFG.activeUrl ? [{ id: 7, url: CFG.activeUrl }] : []),
      reload: async (tabId) => { calls.reload.push(tabId); },
    },
    cookies: {
      getAll: async (details) => {
        calls.getAll.push(details);
        if (CFG.getAllThrows) throw new Error('simulated getAll failure');
        if (details.partitionKey && !CFG.partitionSupport) throw new Error('Invalid argument: partitionKey');
        return jar.filter(c => domainMatches(c.domain, details.domain) && partitionMatches(c, details));
      },
      remove: async (details) => {
        calls.remove.push(details);
        if ((CFG.failNames || []).includes(details.name)) return null;
        const i = jar.findIndex(c =>
          c.name === details.name &&
          details.url.includes(baseOf(c.domain)) &&
          c.path === new URL(details.url).pathname);
        if (i < 0) return null;
        jar.splice(i, 1);
        return { name: details.name, url: details.url };
      },
    },
  };

  // Reading any of these is a failure: the cookies-only build must not touch them.
  for (const banned of ['browsingData', 'scripting', 'storage', 'webRequest', 'history']) {
    Object.defineProperty(chromeMock, banned, {
      get() { calls.forbidden.push(banned); return {}; },
    });
  }

  window.chrome = chromeMock;
})();`;
}

const readState = page => page.evaluate(() => ({
  status:       document.getElementById('statusBadgeText').textContent.trim(),
  badgeClass:   document.getElementById('statusBadge').className,
  result:       document.getElementById('result').textContent.trim(),
  resultClass:  document.getElementById('result').className,
  version:      document.getElementById('appVersion').textContent.trim(),
  buttonHidden: document.getElementById('zoomFixBtn').hidden,
  buttonLabel:  document.getElementById('zoomFixBtn').textContent.trim(),
  buttonCount:  document.querySelectorAll('button').length,
  fieldCount:   document.querySelectorAll('input, select, textarea').length,
  bodyWidth:    Math.round(document.body.getBoundingClientRect().width),
  bodyScrollW:  document.body.scrollWidth,
  jarLeft:      window.__jar.length,
  calls:        window.__calls,
}));

/** Boot the popup with a mock, hand the page to `fn`, then assert the invariants. */
async function withPopup(cfg, fn) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 460, height: 820 } });
    await context.addInitScript(mockScript(cfg));
    const page = await context.newPage();

    const pageErrors = [];
    const external   = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    page.on('request', r => { if (!r.url().startsWith('file:')) external.push(r.url()); });

    await page.goto(POPUP_URL, { waitUntil: 'load' });
    await page.waitForFunction(() => {
      const t = document.getElementById('statusBadgeText');
      return t && t.textContent && t.textContent !== 'Ready';
    }, { timeout: 10000 });

    await fn(page);

    check(pageErrors.length === 0, `${cfg.name}: popup raised no page errors`, pageErrors.join('; '));
    check(external.length === 0,   `${cfg.name}: made no non-file:// requests`, external.join('; '));
  } finally {
    await browser.close();
  }
}

const clickFix = async (page) => {
  await page.click('#zoomFixBtn');
  await page.waitForFunction(
    () => /CLEARED|PARTIAL|ERROR/.test(document.getElementById('statusBadgeText').textContent || ''),
    { timeout: 10000 });
};

const ZOOM_JAR = [
  { name: '_zm_ssid',  domain: 'zoom.us',   secure: true  },
  { name: 'cred',      domain: '.zoom.us',  secure: true  },
  { name: '_zm_lang',  domain: 'zoom.us',   secure: false },
  { name: 'zm_aid',    domain: '.zoom.com', secure: true  },
];

(async () => {
  // --- 1. Happy path on zoom.us -----------------------------------------
  group('FIX ZOOM on https://zoom.us (4 cookies, no partition support)');
  await withPopup({
    name: 'zoom.us',
    activeUrl: 'https://zoom.us/',
    version: '1.2.0',
    jar: ZOOM_JAR,
    partitionSupport: false,
  }, async (page) => {
    const before = await readState(page);
    check(before.buttonHidden === false,        'FIX ZOOM button is visible on a Zoom tab');
    check(before.buttonCount === 1,             'popup renders exactly one button', `got ${before.buttonCount}`);
    check(before.fieldCount === 0,              'popup renders no inputs, checkboxes or selects', `got ${before.fieldCount}`);
    check(before.buttonLabel === 'FIX ZOOM',    'button label is FIX ZOOM', before.buttonLabel);
    check(before.status === 'READY · zoom.us',  'state pill shows the detected host', before.status);
    check(before.version === 'v1.2.0',          'version chip comes from the manifest', before.version);
    check(before.bodyWidth === POPUP_WIDTH,     `popup is ${POPUP_WIDTH}px wide`, String(before.bodyWidth));
    check(before.bodyScrollW <= POPUP_WIDTH,    'no horizontal overflow', `scrollWidth ${before.bodyScrollW}`);
    check(before.calls.remove.length === 0,     'opening the popup removes nothing');

    await clickFix(page);
    const after = await readState(page);

    check(after.status === 'CLEARED',            'state pill reads CLEARED', after.status);
    check(/^Removed 4 Zoom cookies\./.test(after.result), 'result line reports 4 cookies removed', after.result);
    check(/Tab reloaded\./.test(after.result),   'result line reports the tab reload', after.result);
    check(after.resultClass.includes('good'),    'result line is styled as success', after.resultClass);
    check(after.jarLeft === 0,                   'every Zoom cookie is gone from the jar', `${after.jarLeft} left`);
    check(after.calls.remove.length === 4,       'each cookie removed exactly once', `${after.calls.remove.length} remove calls`);
    check(after.calls.reload.join() === '7',     'active Zoom tab reloaded once', JSON.stringify(after.calls.reload));
    check(after.calls.forbidden.length === 0,    'never reads chrome.browsingData / scripting / storage', after.calls.forbidden.join(','));

    const urls = after.calls.remove.map(r => r.url).sort();
    check(urls.includes('http://zoom.us/'),      'non-Secure cookie removed over http', urls.join(' '));
    check(urls.filter(u => u.startsWith('https://')).length === 3, 'Secure cookies removed over https', urls.join(' '));
    const domains = after.calls.getAll.map(q => q.domain);
    check(domains.filter(d => d === 'zoom.us').length === 2 && domains.filter(d => d === 'zoom.com').length === 2,
      'queries both Zoom base domains (unpartitioned + partitioned attempt)', domains.join(','));
  });

  // --- 2. Partitioned (CHIPS) cookies ------------------------------------
  group('partitioned cookies (own-site AND third-party partitions)');
  await withPopup({
    name: 'partitioned',
    activeUrl: 'https://zoom.us/',
    version: '1.2.0',
    partitionSupport: true,
    jar: [
      { name: '_zm_ssid', domain: 'zoom.us', secure: true },
      { name: '_zm_chtaid', domain: 'zoom.us', secure: true, partitionKey: { topLevelSite: 'https://zoom.us' } },
      // Zoom embedded in a third-party page: partitioned under THAT site.
      { name: '_zm_embed', domain: 'zoom.us', secure: true, partitionKey: { topLevelSite: 'https://school-lms.example' } },
    ],
  }, async (page) => {
    await clickFix(page);
    const s = await readState(page);
    check(s.calls.remove.length === 3,  'unpartitioned + both partitioned cookies removed', `${s.calls.remove.length}`);
    const withKey = s.calls.remove.filter(r => r.partitionKey);
    check(withKey.length === 2, 'partitionKey is passed back to cookies.remove for each partitioned cookie', JSON.stringify(withKey));
    check(withKey.some(r => r.partitionKey.topLevelSite === 'https://school-lms.example'),
      'a cookie partitioned under a third-party top-level site is cleared too', JSON.stringify(withKey));
    check(s.jarLeft === 0,              'every partitioned cookie actually deleted', `${s.jarLeft} left`);
  });

  // --- 3. Query results are deduplicated ---------------------------------
  group('duplicate query results');
  await withPopup({
    name: 'dedupe',
    activeUrl: 'https://zoom.us/',
    version: '1.2.0',
    partitionSupport: true,
    jar: [
      { name: '_zm_ssid', domain: 'zoom.us', secure: true },
      { name: 'cred',     domain: 'zoom.us', secure: true },
    ],
  }, async (page) => {
    await clickFix(page);
    const s = await readState(page);
    check(s.calls.remove.length === 2, 'each cookie is removed exactly once', `${s.calls.remove.length} remove calls`);
    check(/Removed 2 Zoom cookies\./.test(s.result), 'count is not double-reported', s.result);
  });

  // --- 4. Partial failure -----------------------------------------------
  group('partial failure (Chrome refuses one removal)');
  await withPopup({
    name: 'partial',
    activeUrl: 'https://zoom.us/',
    version: '1.2.0',
    partitionSupport: false,
    jar: ZOOM_JAR,
    failNames: ['cred'],
  }, async (page) => {
    const s = await (async () => { await clickFix(page); return readState(page); })();
    check(s.status === 'PARTIAL',                    'state pill reads PARTIAL', s.status);
    check(/Removed 3 Zoom cookies; 1 could not be removed\./.test(s.result), 'result line is honest about the failure', s.result);
    check(s.resultClass.includes('warn'),            'result line is styled as a warning', s.resultClass);
    check(s.jarLeft === 1,                           'the refused cookie is still in the jar', `${s.jarLeft}`);
  });

  // --- 5. Nothing to clear ----------------------------------------------
  group('no Zoom cookies present');
  await withPopup({
    name: 'empty',
    activeUrl: 'https://us02web.zoom.us/j/123',
    version: '1.2.0',
    partitionSupport: true,
    jar: [],
  }, async (page) => {
    const before = await readState(page);
    check(before.status === 'READY · us02web.zoom.us', 'subdomain is detected as Zoom', before.status);
    await clickFix(page);
    const s = await readState(page);
    check(s.status === 'CLEARED',                                'state pill reads CLEARED', s.status);
    check(/No Zoom cookies were left to remove\./.test(s.result), 'result line says there was nothing to remove', s.result);
    check(s.calls.remove.length === 0,                           'no removal attempted', `${s.calls.remove.length}`);
  });

  // --- 6. Cookie jar unreadable -----------------------------------------
  group('cookies.getAll fails for both domains');
  await withPopup({
    name: 'getAll fails',
    activeUrl: 'https://zoom.us/',
    version: '1.2.0',
    jar: ZOOM_JAR,
    getAllThrows: true,
  }, async (page) => {
    await clickFix(page);
    const s = await readState(page);
    check(s.status === 'ERROR',                        'state pill reads ERROR', s.status);
    check(/cookie jar/.test(s.result),                 'result line explains the failure', s.result);
    check(s.resultClass.includes('bad'),               'result line is styled as an error', s.resultClass);
    check(s.calls.remove.length === 0,                 'no removal attempted', `${s.calls.remove.length}`);
    check(s.jarLeft === ZOOM_JAR.length,               'jar untouched', `${s.jarLeft}`);
  });

  // --- 7. Non-Zoom, chrome:// and lookalike hosts ------------------------
  for (const [label, activeUrl] of [
    ['non-Zoom site',    'https://example.com/'],
    ['chrome:// page',   'chrome://extensions/'],
    ['lookalike host',   'https://zoom.us.evil.com/'],
    ['lookalike suffix', 'https://evilzoom.us/'],
  ]) {
    group(`${label} (${activeUrl})`);
    await withPopup({
      name: label,
      activeUrl,
      version: '1.2.0',
      jar: ZOOM_JAR,
    }, async (page) => {
      const s = await readState(page);
      check(s.status === 'NOT ZOOM',            'state pill reads NOT ZOOM', s.status);
      check(s.badgeClass.includes('neutral'),   'state pill is neutral, not success-green', s.badgeClass);
      check(s.buttonHidden === true,            'no FIX ZOOM button is offered');
      check(/Open a zoom\.us or zoom\.com tab/.test(s.result), 'result line explains what to do', s.result);
      check(s.calls.getAll.length === 0,        'cookie jar is never even read', `${s.calls.getAll.length} getAll calls`);
      check(s.calls.remove.length === 0,        'nothing removed');
      check(s.calls.reload.length === 0,        'nothing reloaded');
      check(s.jarLeft === ZOOM_JAR.length,      'jar untouched', `${s.jarLeft}`);
    });
  }

  console.log('');
  console.log(`Passed: ${passed}  Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
})().catch(e => {
  console.error('\ne2e run crashed:', (e && e.stack) || e);
  process.exit(1);
});
