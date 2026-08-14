/**
 * Which hosts this product is allowed to act on.
 *
 * Pure by design: no DOM, no `chrome.*`, no `browser.*`. The same matcher has
 * to give the same answer in the popup, in a browser adapter and in a Node
 * test, because "is this tab in scope" is the check that keeps a cookie clear
 * from ever reaching a site the user did not mean.
 */

/** Base domains the extension is scoped to. Iteration order is the clearing order. */
export const ZOOM_HOSTS = ['zoom.us', 'zoom.com'];

/** Normalize hostname: lowercase, strip trailing dot, drop port. Returns null if invalid. */
export function normalizeHost(host) {
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
export function hostMatchesBase(host, base) {
  if (!host || !base) return false;
  if (host === base) return true;
  return host.endsWith('.' + base);
}

export function isZoomHost(host) {
  const h = normalizeHost(host);
  if (!h) return false;
  return ZOOM_HOSTS.some(z => hostMatchesBase(h, z));
}
