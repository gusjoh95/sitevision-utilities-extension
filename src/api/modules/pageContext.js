import * as SiteVerification from './siteVerification.js';
import { executeScript } from './targetTab.js';
import { isEdit } from './editMode.js';

/** @type {'window' | 'frame' | null | undefined} */
let pageContextSource = undefined;

/**
 * @typedef {Object} PageContext
 * @property {string} pageId
 * @property {string} siteId
 * @property {string} userIdentityId
 * @property {number} userIdentityReadTimeout
 * @property {string} userLocale
 * @property {boolean} dev
 * @property {string} csrfToken
 * @property {boolean} html5
 * @property {boolean} useServerSideEvents
 * @property {boolean} nodeIsReadOnly
 */

/**
 * Retrieves the Sitevision PageContext object from a tab.
 *
 * @param {number} tabId - ID of the tab to inspect.
 * @returns {Promise<PageContext | null>} The page context, or null if unavailable on the page.
 */
export async function getPageContext(tabId) {
  pageContextSource = null;

  /** @typedef {Window & { sv?: { PageContext?: PageContext } }} CustomWindow */

  if (typeof tabId !== 'number') {
    throw new Error('Could not retrieve PageContext: No valid tab ID supplied.');
  }

  const result = await executeScript(
    tabId,
    () => {
      /** @type {CustomWindow} */
      const win = window;
      if (win.sv?.PageContext) {
        return { pageContext: win.sv.PageContext, source: 'window' };
      }

      /** @type {HTMLIFrameElement | null} */
      const editFrame = document.querySelector('#content-frame');
      /** @type {CustomWindow | null} */
      const frameWin = editFrame?.contentWindow ?? null;
      return {
        pageContext: frameWin?.sv?.PageContext ?? null,
        source: frameWin?.sv?.PageContext ? 'frame' : null,
      };
    },
    [],
    { world: 'MAIN' }
  );

  if (!result) throw new Error('Could not execute retrieval of PageContext');
  pageContextSource = /** @type {'window' | 'frame' | null} */ (result.source);
  return result.pageContext;
}

/**
 * @typedef {'online' | 'offline' | 'neither' | null | undefined} SitevisionMode
 */

/**
 * Determines whether a tab is in Sitevision online, offline/edit, neither, or unknown mode.
 *
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<SitevisionMode>}
 */
export async function getSitevisionMode(tab) {
  if (pageContextSource === undefined) {
    if (!tab?.id) throw new Error('No valid tab ID found.');
    await getPageContext(tab.id);
  }

  if (pageContextSource === 'window') return 'online';
  if (pageContextSource === 'frame') return 'offline';
  if (isEdit(tab)) return 'offline';

  const status = await SiteVerification.get(tab);
  if (status === SiteVerification.Status.VERIFIED) return 'neither';
  if (status === SiteVerification.Status.REJECTED) return null;
  return undefined;
}
