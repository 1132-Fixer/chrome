/**
 * Every line the popup can show the user, derived from what actually happened.
 *
 * Pure: no DOM, no `chrome.*`, no `browser.*`. A view model goes out, the
 * caller paints it. Keeping the wording here — rather than spread through the
 * click handler — is what makes the product's claims reviewable in one place.
 *
 * Truthfulness boundary (binding): this extension removes Zoom cookies and
 * reloads the active Zoom tab. It does NOT detect that Zoom Error 1132
 * occurred and does NOT verify that it was resolved. No string in this file
 * may say or imply otherwise, and counts reported here are counts of cookies
 * removed — never evidence that anything was repaired.
 *
 * Shape of a view model:
 *   badge   status-pill modifier class: '' | 'neutral' | 'scanning' | 'done' | 'error'
 *   status  status-pill text
 *   tone    result-line modifier class:  '' | 'good' | 'warn' | 'bad'
 *   message result-line text
 */

/** A Zoom tab is in front and the button is offered. */
export function ready(host) {
  return {
    badge: '',
    status: 'READY · ' + host,
    tone: '',
    message: 'One click clears zoom.us and zoom.com cookies, then reloads this tab.',
  };
}

/** Nothing to act on — the front tab is not Zoom. */
export function notZoom() {
  return {
    badge: 'neutral',
    status: 'NOT ZOOM',
    tone: '',
    message: 'Open a zoom.us or zoom.com tab, then click this icon again.',
  };
}

/** The clear is running. */
export function working() {
  return {
    badge: 'scanning',
    status: 'WORKING',
    tone: '',
    message: 'Clearing Zoom cookies…',
  };
}

/**
 * Report the outcome of `clearZoomCookies`, plus whether the tab was reloaded.
 * Takes the outcome object as-is: `{ removed, failed, hostErrors, hostCount }`.
 */
export function cleanupResult({ removed, failed, hostErrors, hostCount, reloaded }) {
  const tail = reloaded ? ' Tab reloaded.' : '';

  if (hostErrors === hostCount) {
    return {
      badge: 'error',
      status: 'ERROR',
      tone: 'bad',
      message: 'Chrome would not let us read the Zoom cookie jar. Try reopening the popup.',
    };
  }

  if (failed || hostErrors) {
    return {
      badge: 'error',
      status: 'PARTIAL',
      tone: 'warn',
      message: `Removed ${removed} Zoom cookie${removed === 1 ? '' : 's'}; ${failed + hostErrors} could not be removed.${tail}`,
    };
  }

  if (removed === 0) {
    return {
      badge: 'done',
      status: 'CLEARED',
      tone: 'good',
      message: `No Zoom cookies were left to remove.${tail}`,
    };
  }

  return {
    badge: 'done',
    status: 'CLEARED',
    tone: 'good',
    message: `Removed ${removed} Zoom cookie${removed === 1 ? '' : 's'}.${tail}`,
  };
}

/**
 * Something threw outside the per-cookie and per-host handling. Never show a
 * bare exception as the whole message. Clearing is safe to repeat, so the
 * honest next step is always "run it again".
 */
export function cleanupCrash(error) {
  const detail = error && error.message ? error.message : String(error);
  return {
    badge: 'error',
    status: 'ERROR',
    tone: 'bad',
    message: 'Something interrupted the fix. Close and reopen this popup, then try again — running it twice is safe. (detail: ' + detail + ')',
  };
}
