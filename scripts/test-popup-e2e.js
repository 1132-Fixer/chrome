#!/usr/bin/env node
/* eslint-disable no-console */
'use strict';

/**
 * End-to-end behaviour test for the 1132 Fixer popup.
 *
 * Loads the real popup.html / popup.css / popup.js in headless Chromium with a
 * recording `chrome.*` mock, drives the single FIX ZOOM button, and asserts
 * what actually happened — Zoom cookies removed exactly once each, page-data
 * cleanup injected only into the Zoom tab and only after the click, unrelated
 * origins untouched, and no browsingData / hidden background sweep.
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
// Version injected into the chrome.runtime.getManifest mock — the version
// chip must reflect whatever the manifest says, so the assertion derives
// from this constant instead of hardcoding a stale literal.
const MOCK_VERSION = '1.2.0';

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
  const calls = { getAll: [], remove: [], reload: [], executeScript: [], forbidden: [] };
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
    scripting: {
      executeScript: async (injection) => {
        calls.executeScript.push({
          tabId: injection && injection.target && injection.target.tabId,
          hasFunc: !!(injection && injection.func),
        });
        if (CFG.scriptingThrows) throw new Error('simulated scripting failure');
        if (CFG.pageCleanup) return [{ result: CFG.pageCleanup }];
        return [{ result: {
          skipped: false,
          origin: 'https://zoom.us',
          localStorage: true,
          sessionStorage: true,
          caches: 1,
          indexedDB: 1,
          errors: [],
        } }];
      },
    },
  };

  // These APIs must never be touched. scripting is allowed (Zoom-tab inject).
  for (const banned of ['browsingData', 'storage', 'webRequest', 'history']) {
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
    // 'Checking…' is the static pre-JS pill text; init() always replaces it.
    await page.waitForFunction(() => {
      const t = document.getElementById('statusBadgeText');
      return t && t.textContent && t.textContent !== 'Checking…';
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

const MIXED_JAR = [
  ...ZOOM_JAR,
  { name: 'sid', domain: 'example.com', secure: true },
  { name: 'id',  domain: 'github.com',  secure: true },
];

const zoomOnlyRemoves = removes => removes.every(r => {
  try {
    const host = new URL(r.url).hostname;
    return host === 'zoom.us' || host.endsWith('.zoom.us') || host === 'zoom.com' || host.endsWith('.zoom.com');
  } catch {
    return false;
  }
});

(async () => {
  // --- 1. Happy path on zoom.us -----------------------------------------
  group('FIX ZOOM on https://zoom.us (4 cookies, no partition support)');
  await withPopup({
    name: 'zoom.us',
    activeUrl: 'https://zoom.us/',
    version: MOCK_VERSION,
    jar: ZOOM_JAR,
    partitionSupport: false,
  }, async (page) => {
    const before = await readState(page);
    check(before.buttonHidden === false,        'FIX ZOOM button is visible on a Zoom tab');
    check(before.buttonCount === 1,             'popup renders exactly one button', `got ${before.buttonCount}`);
    check(before.fieldCount === 0,              'popup renders no inputs, checkboxes or selects', `got ${before.fieldCount}`);
    check(before.buttonLabel === 'FIX ZOOM',    'button label is FIX ZOOM', before.buttonLabel);
    check(before.status === 'ZOOM DETECTED',    'state pill reads ZOOM DETECTED', before.status);
    check(before.version === 'v' + MOCK_VERSION, 'version chip comes from the manifest', before.version);
    check(before.bodyWidth === POPUP_WIDTH,     `popup is ${POPUP_WIDTH}px wide`, String(before.bodyWidth));
    check(before.bodyScrollW <= POPUP_WIDTH,    'no horizontal overflow', `scrollWidth ${before.bodyScrollW}`);
    check(before.calls.remove.length === 0,     'opening the popup removes nothing');
    check(before.calls.executeScript.length === 0, 'opening the popup does not inject page cleanup');
    check(before.calls.getAll.length === 0,     'opening the popup does not read the cookie jar');

    await clickFix(page);
    const after = await readState(page);

    check(after.status === 'CLEARED',            'state pill reads CLEARED', after.status);
    check(/Removed 4 Zoom cookies\./.test(after.result), 'result line reports 4 cookies removed', after.result);
    check(/Zoom site data was cleared/.test(after.result), 'result line reports Zoom site data cleared', after.result);
    check(/Tab reloaded\./.test(after.result),   'result line reports the tab reload', after.result);
    check(after.resultClass.includes('good'),    'result line is styled as success', after.resultClass);
    check(after.jarLeft === 0,                   'every Zoom cookie is gone from the jar', `${after.jarLeft} left`);
    check(after.calls.remove.length === 4,       'each cookie removed exactly once', `${after.calls.remove.length} remove calls`);
    check(after.calls.reload.join() === '7',     'active Zoom tab reloaded once', JSON.stringify(after.calls.reload));
    check(after.calls.executeScript.length === 1, 'page cleanup injected once after FIX ZOOM', `${after.calls.executeScript.length}`);
    check(after.calls.executeScript[0].tabId === 7, 'page cleanup targeted the active Zoom tab', JSON.stringify(after.calls.executeScript));
    check(after.calls.forbidden.length === 0,    'never reads chrome.browsingData / storage / webRequest / history', after.calls.forbidden.join(','));
    check(zoomOnlyRemoves(after.calls.remove),   'cookie removals stay on Zoom origins');

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
    version: MOCK_VERSION,
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
    version: MOCK_VERSION,
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
    version: MOCK_VERSION,
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
    version: MOCK_VERSION,
    partitionSupport: true,
    jar: [],
  }, async (page) => {
    const before = await readState(page);
    check(before.status === 'ZOOM DETECTED', 'subdomain is detected as Zoom', before.status);
    check(before.buttonHidden === false, 'FIX ZOOM is offered on a Zoom subdomain');
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
    version: MOCK_VERSION,
    jar: ZOOM_JAR,
    getAllThrows: true,
  }, async (page) => {
    await clickFix(page);
    const s = await readState(page);
    check(s.status === 'PARTIAL',                      'state pill reads PARTIAL when cookies fail but site data clears', s.status);
    check(/cookie jar/.test(s.result),                 'result line explains the cookie-jar failure', s.result);
    check(/Zoom site data was cleared/.test(s.result), 'result line still reports site-data success', s.result);
    check(s.resultClass.includes('warn'),              'result line is styled as a warning', s.resultClass);
    check(s.calls.remove.length === 0,                 'no cookie removal attempted', `${s.calls.remove.length}`);
    check(s.calls.executeScript.length === 1,          'site-data cleanup still ran', `${s.calls.executeScript.length}`);
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
      version: MOCK_VERSION,
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
      check(s.calls.executeScript.length === 0, 'page cleanup is not injected on a non-Zoom tab');
      check(s.jarLeft === ZOOM_JAR.length,      'jar untouched', `${s.jarLeft}`);
    });
  }

  // --- 8. Unrelated-origin cookies must survive --------------------------
  group('unrelated-origin cookies are not cleared');
  await withPopup({
    name: 'mixed jar',
    activeUrl: 'https://zoom.us/',
    version: MOCK_VERSION,
    partitionSupport: false,
    jar: MIXED_JAR,
  }, async (page) => {
    await clickFix(page);
    const s = await readState(page);
    check(s.status === 'CLEARED', 'mixed jar still reports CLEARED', s.status);
    check(s.calls.remove.length === 4, 'only the four Zoom cookies are removed', `${s.calls.remove.length}`);
    check(zoomOnlyRemoves(s.calls.remove), 'no remove URL leaves Zoom origins', JSON.stringify(s.calls.remove.map(r => r.url)));
    check(s.jarLeft === 2, 'example.com and github.com cookies remain', `${s.jarLeft} left`);
    const leftover = (await page.evaluate(() => window.__jar.map(c => c.domain))).sort();
    check(leftover.join(',') === 'example.com,github.com', 'leftover domains are the unrelated origins', leftover.join(','));
  });

  // --- 9. scripting failure is reported, cookies still attempted ---------
  group('scripting.executeScript fails after cookies clear');
  await withPopup({
    name: 'scripting fails',
    activeUrl: 'https://zoom.us/',
    version: MOCK_VERSION,
    partitionSupport: false,
    jar: ZOOM_JAR,
    scriptingThrows: true,
  }, async (page) => {
    await clickFix(page);
    const s = await readState(page);
    check(s.status === 'PARTIAL', 'state pill reads PARTIAL when site data fails', s.status);
    check(/Removed 4 Zoom cookies\./.test(s.result), 'cookies were still cleared', s.result);
    check(/site data could not be cleared/.test(s.result), 'result line reports the storage failure', s.result);
    check(s.calls.remove.length === 4, 'Zoom cookies were removed before the inject failed', `${s.calls.remove.length}`);
    check(s.jarLeft === 0, 'Zoom jar empty after cookie clear', `${s.jarLeft}`);
  });

  // --- 10. cookies + scripting both fail ---------------------------------
  group('cookies.getAll and scripting both fail');
  await withPopup({
    name: 'both fail',
    activeUrl: 'https://zoom.us/',
    version: MOCK_VERSION,
    jar: ZOOM_JAR,
    getAllThrows: true,
    scriptingThrows: true,
  }, async (page) => {
    await clickFix(page);
    const s = await readState(page);
    check(s.status === 'ERROR', 'state pill reads ERROR when nothing succeeded', s.status);
    check(/cookie jar/.test(s.result), 'cookie-jar failure is named', s.result);
    check(/site data could not be cleared/.test(s.result), 'site-data failure is named', s.result);
    check(s.resultClass.includes('bad'), 'result line is styled as an error', s.resultClass);
    check(s.calls.remove.length === 0, 'no cookie removal', `${s.calls.remove.length}`);
    check(s.jarLeft === ZOOM_JAR.length, 'jar untouched', `${s.jarLeft}`);
  });

  console.log('');
  console.log(`Passed: ${passed}  Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
})().catch(e => {
  console.error('\ne2e run crashed:', (e && e.stack) || e);
  process.exit(1);
});
