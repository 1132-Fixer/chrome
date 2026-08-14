/**
 * The one destructive path in the product: remove the cookies a Zoom base
 * domain owns, and report honestly how many actually went.
 *
 * Cookies are the ONLY data type this flow touches. localStorage,
 * sessionStorage, Cache API, IndexedDB and service worker registrations are
 * deliberately left alone, which is why the manifest carries neither the
 * `browsingData` nor the `scripting` permission. Nothing here makes a network
 * request of any kind.
 *
 * Scope note: this module deletes cookies and reports counts. It does not
 * detect that Zoom Error 1132 occurred and does not verify that it was
 * resolved — no caller may describe its result as either.
 *
 * The cookie API is injected rather than imported so this file stays free of
 * `chrome.*` / `browser.*` and can run under any adapter or a plain test
 * double. It needs exactly two methods:
 *
 *   cookies.getAll(details) -> Promise<cookie[]>
 *   cookies.remove(details) -> Promise<object|null>   // null == declined
 */

import { ZOOM_HOSTS } from './zoom-hosts.js';

/** Stable identity for a cookie, so one cookie is never removed — or counted — twice. */
export function cookieKey(c) {
  const partition = c.partitionKey ? JSON.stringify(c.partitionKey) : '';
  return [c.storeId || '', c.domain, c.path, c.name, partition].join(' ');
}

/** A URL the cookie is valid for. cookies.remove requires one. */
export function cookieUrl(c) {
  const scheme = c.secure ? 'https:' : 'http:';
  const host = c.domain.startsWith('.') ? c.domain.slice(1) : c.domain;
  return scheme + '//' + host + c.path;
}

/**
 * Every cookie the browser will hand us for `host` and its subdomains,
 * deduplicated.
 *
 * `getAll({domain})` already covers subdomains. An empty `partitionKey: {}`
 * makes Chromium (119+) return cookies from EVERY partition plus the
 * unpartitioned jar — without it, a Zoom cookie partitioned under some other
 * top-level site (Zoom embedded in a third-party page) would be invisible and
 * survive the clear. Browsers without partition support reject the empty key,
 * so the plain unpartitioned query is the fallback.
 */
export async function collectCookies(cookies, host) {
  const queries = [
    { domain: host, partitionKey: {} },
    { domain: host },
  ];

  for (const query of queries) {
    let found;
    try {
      found = await cookies.getAll(query);
    } catch {
      continue; // unsupported filter — fall back to the plain query
    }
    const unique = new Map();
    for (const c of found || []) {
      unique.set(cookieKey(c), c);
    }
    return [...unique.values()];
  }

  throw new Error('cookies.getAll unavailable');
}

export async function clearCookiesForHost(cookies, host) {
  const found = await collectCookies(cookies, host);

  // Removals are independent, so they run concurrently.
  const outcomes = await Promise.all(found.map(async (c) => {
    const details = { url: cookieUrl(c), name: c.name, storeId: c.storeId };
    if (c.partitionKey) details.partitionKey = c.partitionKey;
    try {
      // Resolves with null when the browser declined the removal.
      return (await cookies.remove(details)) ? 'removed' : 'failed';
    } catch {
      return 'failed';
    }
  }));

  return {
    removed: outcomes.filter(o => o === 'removed').length,
    failed: outcomes.filter(o => o === 'failed').length,
  };
}

/**
 * Clear every Zoom base domain. A domain whose jar could not be read at all is
 * counted separately from a cookie the browser refused to delete, because the
 * two say different things to the user.
 */
export async function clearZoomCookies(cookies) {
  let removed = 0;
  let failed = 0;
  let hostErrors = 0;

  for (const host of ZOOM_HOSTS) {
    try {
      const outcome = await clearCookiesForHost(cookies, host);
      removed += outcome.removed;
      failed += outcome.failed;
    } catch {
      hostErrors++;
    }
  }

  return { removed, failed, hostErrors, hostCount: ZOOM_HOSTS.length };
}
