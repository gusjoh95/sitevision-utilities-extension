/**
 * Sitevision verification status for an origin.
 * @readonly
 * @enum {string}
 */
export const Status = {
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
  UNKNOWN: 'UNKNOWN',
};

/**
 * @typedef {typeof Status[keyof typeof Status]} StatusValue
 */

/**
 * Extracts the origin from a Chrome tab or throws an error.
 *
 * @param {chrome.tabs.Tab} [tab]
 * @returns {string}
 * @throws {Error} If the tab is invalid or lacks an http(s) URL.
 */
function getOriginFromTab(tab) {
  if (!tab?.url) {
    throw new Error('Invalid tab: Missing URL.');
  }

  try {
    const { protocol, origin } = new URL(tab.url);
    if (protocol === 'http:' || protocol === 'https:') {
      return origin;
    }
  } catch {
    // URL parsing failed
  }

  throw new Error(`Invalid tab URL: Unable to resolve origin from "${tab.url}".`);
}

/**
 * Gets the cached verification status for a tab's origin.
 *
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<StatusValue>}
 */
export async function get(tab) {
  const origin = getOriginFromTab(tab);
  const res = await chrome.storage.session.get(origin);
  const value = res[origin];

  if (value === true) return Status.VERIFIED;
  if (value === false) return Status.REJECTED;
  return Status.UNKNOWN;
}

/**
 * Caches the verification status for a tab's origin.
 *
 * @param {chrome.tabs.Tab} tab
 * @param {boolean} isSitevision
 * @returns {Promise<void>}
 */
export async function set(tab, isSitevision) {
  const origin = getOriginFromTab(tab);
  await chrome.storage.session.set({ [origin]: Boolean(isSitevision) });
}

/**
 * Clears the verification cache for a tab's origin or the whole session.
 *
 * @param {chrome.tabs.Tab} [tab]
 * @returns {Promise<void>}
 */
export async function clear(tab) {
  if (!tab) {
    await chrome.storage.session.clear();
    return;
  }

  const origin = getOriginFromTab(tab);
  await chrome.storage.session.remove(origin);
}
