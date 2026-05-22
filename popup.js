'use strict';

const IS_BROWSER = typeof document !== 'undefined';

const els = IS_BROWSER ? {
  statusBadge: document.getElementById('statusBadge'),
  statusText: document.getElementById('statusBadgeText'),
  fileList: document.getElementById('fileList'),
  appVersion: document.getElementById('appVersion'),
  zoomBanner: document.getElementById('zoomBanner'),
  zoomBannerHost: document.getElementById('zoomBannerHost'),
  zoomFixBtn: document.getElementById('zoomFixBtn'),
  nonZoomCard: document.getElementById('nonZoomCard'),
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
 * types. We never pass `cache: true` here — that would wipe the global HTTP
 * cache. The matching `cacheStorage` key is per-origin and is the right one.
 */
function perOriginBrowsingDataTypes() {
  return {
    cookies: true,
    localStorage: true,
    cacheStorage: true,
    serviceWorkers: true,
    indexedDB: true,
  };
}

async function clearForOrigins(origins) {
  const dataTypes = perOriginBrowsingDataTypes();
  log(`Origins: ${origins.join(', ')}`);
  log(`Types: ${Object.keys(dataTypes).join(', ')}`);
  await chrome.browsingData.remove({ origins }, dataTypes);
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

/** sessionStorage is per-tab and not supported by chrome.browsingData. Inject into active Zoom tab. */
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
  setStatus('scanning', 'WORKING');
  els.fileList.hidden = false;
  clearLog();
  log('FIX ZOOM', 'header');

  let hadError = false;

  try {
    for (const host of ZOOM_HOSTS) {
      log(`-- ${host} --`, 'header');
      const origins = [`https://${host}`, `http://${host}`];
      try {
        await clearForOrigins(origins);
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
  }
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
  els.zoomFixBtn.addEventListener('click', runZoomFix);
  await detectActiveOrigin();
  if (isZoomHost(state.currentHost)) {
    els.zoomBanner.hidden = false;
    els.zoomBannerHost.textContent = state.currentHost;
    setStatus('', 'READY · ' + state.currentHost);
  } else {
    els.nonZoomCard.hidden = false;
    setStatus('', 'NOT ZOOM');
  }
}

if (IS_BROWSER) {
  document.addEventListener('DOMContentLoaded', init);
}

// Expose pure helpers for source-level tests in Node.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeHost, hostMatchesBase, isZoomHost };
}
