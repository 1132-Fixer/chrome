'use strict';

const IS_BROWSER = typeof document !== 'undefined';

const els = IS_BROWSER ? {
  statusBadge: document.getElementById('statusBadge'),
  statusText: document.getElementById('statusBadgeText'),
  fileList: document.getElementById('fileList'),
  fixBtn: document.getElementById('fixBtn'),
  customDomain: document.getElementById('customDomain'),
  appVersion: document.getElementById('appVersion'),
  zoomBanner: document.getElementById('zoomBanner'),
  zoomBannerHost: document.getElementById('zoomBannerHost'),
  zoomFixBtn: document.getElementById('zoomFixBtn'),
} : {};

const ZOOM_HOSTS = ['zoom.us', 'zoom.com'];

const state = {
  currentOrigin: null,
  currentHost: null,
  currentTabId: null,
};

/** Normalize hostname: lowercase, strip trailing dot, drop port. Returns null if invalid. */
function normalizeHost(host) {
  if (typeof host !== 'string') return null;
  let h = host.trim().toLowerCase();
  if (!h) return null;
  if (h.endsWith('.')) h = h.slice(0, -1);
  const colon = h.indexOf(':');
  if (colon >= 0) h = h.slice(0, colon);
  if (!h) return null;
  return h;
}

/** True when host equals base or is a subdomain of base. Both must already be normalized. */
function hostMatchesBase(host, base) {
  if (!host || !base) return false;
  if (host === base) return true;
  return host.endsWith('.' + base);
}

function isZoomHost(host) {
  const h = normalizeHost(host);
  if (!h) return false;
  return ZOOM_HOSTS.some(z => hostMatchesBase(h, z));
}

/** Parse user-supplied domain text. Accept bare host, optional scheme. Reject bad input. */
function parseDomainInput(raw) {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s) return null;
  // Strip scheme + path so URL parser doesn't reject odd input
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  s = s.split('/')[0].split('?')[0].split('#')[0];
  try {
    const u = new URL('http://' + s);
    return normalizeHost(u.hostname);
  } catch {
    return null;
  }
}

function setStatus(kind, text) {
  els.statusBadge.classList.remove('scanning', 'done', 'error');
  if (kind) els.statusBadge.classList.add(kind);
  els.statusText.textContent = text;
}

function clearLog() {
  els.fileList.innerHTML = '';
}

function log(text, cls = '') {
  const div = document.createElement('div');
  div.className = 'file-item' + (cls ? ' ' + cls : '');
  div.textContent = text;
  els.fileList.appendChild(div);
  els.fileList.scrollTop = els.fileList.scrollHeight;
}

function getSelectedScope() {
  const sel = document.querySelector('input[name="scope"]:checked');
  return sel ? sel.value : 'current';
}

function getSelectedTypes() {
  const out = {};
  document.querySelectorAll('input[type="checkbox"][data-type]').forEach(cb => {
    out[cb.dataset.type] = cb.checked;
  });
  return out;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab || null;
}

async function detectActiveOrigin() {
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.url) return;
    const u = new URL(tab.url);
    if (!/^https?:$/.test(u.protocol)) return;
    state.currentHost = normalizeHost(u.hostname);
    state.currentOrigin = u.origin;
    state.currentTabId = tab.id;
  } catch {
    // chrome:// pages etc.
  }
}

/**
 * Chrome's browsingData.remove with `origins` only supports per-origin scoped
 * types: cookies, cacheStorage, fileSystems, indexedDB, localStorage,
 * serviceWorkers, webSQL. Passing `cache: true` here would wipe the GLOBAL HTTP
 * cache (other sites included), so we MUST NOT set it for per-origin clears.
 */
function perOriginBrowsingDataTypes(types) {
  return {
    cookies: !!types.cookies,
    localStorage: !!types.localStorage,
    cacheStorage: !!types.cache,
    serviceWorkers: !!types.cache,
    indexedDB: !!types.indexedDB,
  };
}

function globalBrowsingDataTypes(types) {
  return {
    cookies: !!types.cookies,
    localStorage: !!types.localStorage,
    cacheStorage: !!types.cache,
    cache: !!types.cache,
    serviceWorkers: !!types.cache,
    indexedDB: !!types.indexedDB,
  };
}

async function clearAllSites(types) {
  const dataTypes = globalBrowsingDataTypes(types);
  const active = Object.keys(dataTypes).filter(k => dataTypes[k]);
  log(`All sites — types: ${active.join(', ') || '(none)'}`);
  await chrome.browsingData.remove({ since: 0 }, dataTypes);
  log('All-sites clear complete', 'success');
}

async function clearForOrigins(origins, types) {
  const dataTypes = perOriginBrowsingDataTypes(types);
  const active = Object.keys(dataTypes).filter(k => dataTypes[k]);
  if (active.length === 0) return false;
  log(`Origins: ${origins.join(', ')}`);
  log(`Types: ${active.join(', ')}`);
  await chrome.browsingData.remove({ origins }, dataTypes);
  return true;
}

async function clearCookiesForHost(host) {
  const variants = new Set([host, '.' + host]);
  let count = 0;
  let failed = 0;
  for (const domain of variants) {
    let cookies = [];
    try {
      cookies = await chrome.cookies.getAll({ domain });
    } catch (e) {
      log(`cookies.getAll(${domain}) failed: ${e.message}`, 'failed');
      continue;
    }
    for (const c of cookies) {
      const proto = c.secure ? 'https:' : 'http:';
      const cookieHost = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
      const url = `${proto}//${cookieHost}${c.path}`;
      try {
        await chrome.cookies.remove({ url, name: c.name, storeId: c.storeId });
        count++;
      } catch {
        failed++;
      }
    }
  }
  log(`Cookies removed for ${host}: ${count}${failed ? ` (${failed} failed)` : ''}`, count ? 'success' : '');
  return { count, failed };
}

/** sessionStorage is per-tab and not supported by chrome.browsingData. Inject into active tab. */
async function clearSessionStorageInActiveTab() {
  if (!state.currentTabId) {
    log('sessionStorage: no active tab', 'failed');
    return false;
  }
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: state.currentTabId, allFrames: true },
      world: 'MAIN',
      func: () => {
        try { sessionStorage.clear(); return true; } catch { return false; }
      },
    });
    const okFrames = results.filter(r => r && r.result).length;
    log(`sessionStorage cleared in ${okFrames}/${results.length} frame(s)`, okFrames ? 'success' : '');
    return true;
  } catch (e) {
    log(`sessionStorage clear failed: ${e.message}`, 'failed');
    return false;
  }
}

async function reloadActiveTabIfMatchesBase(base) {
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.url) return;
    const u = new URL(tab.url);
    const host = normalizeHost(u.hostname);
    if (hostMatchesBase(host, base)) {
      await chrome.tabs.reload(tab.id);
      log(`Reloaded tab: ${host}`);
    }
  } catch {
    // ignore
  }
}

async function reloadActiveTabIfZoom() {
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.url) return;
    const u = new URL(tab.url);
    if (isZoomHost(u.hostname)) {
      await chrome.tabs.reload(tab.id);
      log(`Reloaded tab: ${u.hostname}`);
    }
  } catch {
    // ignore
  }
}

async function runZoomFix() {
  els.zoomFixBtn.disabled = true;
  els.fixBtn.disabled = true;
  setStatus('scanning', 'WORKING');
  clearLog();
  log('FIX ZOOM', 'header');

  const types = { cookies: true, localStorage: true, cache: true, indexedDB: true };
  let hadError = false;

  try {
    for (const host of ZOOM_HOSTS) {
      log(`-- ${host} --`, 'header');
      const origins = [`https://${host}`, `http://${host}`];
      try {
        await clearForOrigins(origins, types);
      } catch (e) {
        hadError = true;
        log(`browsingData(${host}) failed: ${e.message}`, 'failed');
      }
      try {
        await clearCookiesForHost(host);
      } catch (e) {
        hadError = true;
        log(`cookies(${host}) failed: ${e.message}`, 'failed');
      }
    }

    if (isZoomHost(state.currentHost)) {
      await clearSessionStorageInActiveTab();
    } else {
      log('sessionStorage: skipped (active tab is not a Zoom tab)', '');
    }

    if (hadError) {
      log('Zoom clear finished with errors', 'failed');
      setStatus('error', 'PARTIAL');
    } else {
      log('Zoom data cleared', 'success');
      setStatus('done', 'ZOOM CLEARED');
    }

    await reloadActiveTabIfZoom();
  } catch (e) {
    log('Error: ' + (e && e.message ? e.message : String(e)), 'error');
    setStatus('error', 'ERROR');
  } finally {
    els.zoomFixBtn.disabled = false;
    els.fixBtn.disabled = false;
  }
}

async function runFix() {
  els.fixBtn.disabled = true;
  setStatus('scanning', 'WORKING');
  clearLog();
  log('FIX NOW', 'header');

  const scope = getSelectedScope();
  const types = getSelectedTypes();
  const anyType = Object.values(types).some(Boolean);

  if (!anyType) {
    log('Pick at least one data type', 'error');
    setStatus('error', 'NO TYPES');
    els.fixBtn.disabled = false;
    return;
  }

  try {
    if (scope === 'all') {
      await clearAllSites(types);
      setStatus('done', 'CLEARED');
    } else {
      let host;
      if (scope === 'current') {
        if (!state.currentHost) {
          log('Active tab is not a regular web page (chrome://, file://, etc.)', 'error');
          setStatus('error', 'NO TAB');
          els.fixBtn.disabled = false;
          return;
        }
        host = state.currentHost;
      } else {
        host = parseDomainInput(els.customDomain.value);
        if (!host) {
          log('Enter a valid domain', 'error');
          setStatus('error', 'BAD DOMAIN');
          els.fixBtn.disabled = false;
          return;
        }
      }

      const origins = [`https://${host}`, `http://${host}`];
      const ok = await clearForOrigins(origins, types);
      if (!ok) {
        log('No supported data types selected for per-origin clear', 'error');
        setStatus('error', 'NOTHING TO DO');
        els.fixBtn.disabled = false;
        return;
      }

      if (types.cookies) {
        await clearCookiesForHost(host);
      }

      // sessionStorage applies to the active tab only — clear if it matches
      if (state.currentHost && hostMatchesBase(state.currentHost, host)) {
        await clearSessionStorageInActiveTab();
      }

      log('Done', 'success');
      setStatus('done', 'CLEARED');
      await reloadActiveTabIfMatchesBase(host);
    }
  } catch (e) {
    log('Error: ' + (e && e.message ? e.message : String(e)), 'error');
    setStatus('error', 'ERROR');
  } finally {
    els.fixBtn.disabled = false;
  }
}

function wireScopeToggle() {
  document.querySelectorAll('input[name="scope"]').forEach(r => {
    r.addEventListener('change', () => {
      const scope = getSelectedScope();
      els.customDomain.disabled = scope !== 'custom';
      if (scope === 'custom') els.customDomain.focus();
    });
  });
}

function setVersion() {
  try {
    const m = chrome.runtime.getManifest();
    if (m && m.version) els.appVersion.textContent = 'v' + m.version;
  } catch {
    // ignore
  }
}

async function init() {
  setVersion();
  wireScopeToggle();
  els.fixBtn.addEventListener('click', runFix);
  els.zoomFixBtn.addEventListener('click', runZoomFix);
  await detectActiveOrigin();
  if (state.currentHost) {
    setStatus('', 'READY · ' + state.currentHost);
    clearLog();
    log('Active tab', 'header');
    log(state.currentHost);
    if (isZoomHost(state.currentHost)) {
      els.zoomBanner.hidden = false;
      els.zoomBannerHost.textContent = state.currentHost;
    }
  } else {
    setStatus('', 'READY');
    clearLog();
    log('No web origin in active tab', 'header');
    log('Use Custom domain or All sites.');
  }
}

if (IS_BROWSER) {
  document.addEventListener('DOMContentLoaded', init);
}

// Expose pure helpers for source-level tests in Node.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeHost, hostMatchesBase, isZoomHost, parseDomainInput };
}
