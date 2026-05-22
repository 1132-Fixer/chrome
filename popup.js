'use strict';

const els = {
  statusBadge: document.getElementById('statusBadge'),
  statusText: document.getElementById('statusBadgeText'),
  fileList: document.getElementById('fileList'),
  fixBtn: document.getElementById('fixBtn'),
  customDomain: document.getElementById('customDomain'),
  appVersion: document.getElementById('appVersion'),
  zoomBanner: document.getElementById('zoomBanner'),
  zoomBannerHost: document.getElementById('zoomBannerHost'),
  zoomFixBtn: document.getElementById('zoomFixBtn'),
};

const ZOOM_HOSTS = ['zoom.us', 'zoom.com'];

function isZoomHost(host) {
  if (!host) return false;
  return ZOOM_HOSTS.some(z => host === z || host.endsWith('.' + z));
}

const state = {
  currentOrigin: null,
  currentHost: null,
};

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

function normalizeDomain(raw) {
  if (!raw) return null;
  let s = raw.trim().toLowerCase();
  if (!s) return null;
  try {
    if (!/^https?:\/\//.test(s)) s = 'http://' + s;
    const u = new URL(s);
    return u.hostname || null;
  } catch {
    return null;
  }
}

function originFromHost(host) {
  return host ? `https://${host}` : null;
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
    state.currentHost = u.hostname;
    state.currentOrigin = u.origin;
  } catch {
    // chrome:// pages etc. — leave nulls
  }
}

function browsingDataTypesFromSelection(types) {
  return {
    cookies: !!types.cookies,
    localStorage: !!types.localStorage,
    cacheStorage: !!types.cache,
    cache: !!types.cache,
    indexedDB: !!types.indexedDB,
    serviceWorkers: !!types.cache,
  };
}

async function clearAllSites(types) {
  const dataTypes = browsingDataTypesFromSelection(types);
  log(`Clearing across ALL sites: ${Object.keys(dataTypes).filter(k => dataTypes[k]).join(', ') || '(none)'}`);
  await chrome.browsingData.remove({ since: 0 }, dataTypes);
  log('All-sites clear complete', 'success');
}

async function clearForOrigins(origins, types) {
  const dataTypes = browsingDataTypesFromSelection(types);
  const active = Object.keys(dataTypes).filter(k => dataTypes[k]);
  if (active.length === 0) {
    log('No data types selected', 'error');
    return false;
  }
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
        await chrome.cookies.remove({
          url,
          name: c.name,
          storeId: c.storeId,
        });
        count++;
      } catch (e) {
        failed++;
      }
    }
  }
  log(`Cookies removed for ${host}: ${count}${failed ? ` (${failed} failed)` : ''}`, count ? 'success' : '');
  return { count, failed };
}

async function reloadActiveTabIfMatches(host) {
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.url) return;
    const u = new URL(tab.url);
    if (u.hostname === host || u.hostname.endsWith('.' + host)) {
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

  const types = {
    cookies: true,
    localStorage: true,
    cache: true,
    indexedDB: true,
  };

  try {
    for (const host of ZOOM_HOSTS) {
      log(`-- ${host} --`, 'header');
      const origins = [`https://${host}`, `http://${host}`];
      await clearForOrigins(origins, types);
      await clearCookiesForHost(host);
    }
    log('Zoom data cleared', 'success');
    setStatus('done', 'ZOOM CLEARED');

    const tab = await getActiveTab();
    if (tab && tab.url) {
      try {
        const u = new URL(tab.url);
        if (isZoomHost(u.hostname)) {
          await chrome.tabs.reload(tab.id);
          log(`Reloaded: ${u.hostname}`);
        }
      } catch {
        // ignore
      }
    }
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
        host = normalizeDomain(els.customDomain.value);
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
        setStatus('error', 'NOTHING TO DO');
        els.fixBtn.disabled = false;
        return;
      }

      if (types.cookies) {
        await clearCookiesForHost(host);
      }

      log('Done', 'success');
      setStatus('done', 'CLEARED');
      await reloadActiveTabIfMatches(host);
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
      if (scope === 'custom') {
        els.customDomain.focus();
      }
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

document.addEventListener('DOMContentLoaded', init);
