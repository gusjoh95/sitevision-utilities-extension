import * as SiteVerification from './siteVerification.js';
import executeInTab from './executeInTab.js';

/** @type {'window' | 'frame' | null} */
let pageContextSource = null;

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
 * Retrieves the Sitevision PageContext object from the active tab.
 *
 * Executes a script in the page's MAIN world context to access the global
 * page metadata object. It first attempts to read directly from the main window,
 * falling back to the editing iframe (#content-frame) if needed.
 *
 * @remarks CSP: Running in the MAIN world means the script is subject to the page's Content Security Policy.
 *
 * @throws {Error} Throws if no active tab or valid tab ID is found.
 * @param {chrome.tabs.Tab} tab - The active tab to inspect.
 * @returns {Promise<PageContext | null>} Resolves to the PageContext object, or null if unavailable on the page.
 */

export async function getPageContext(tab) {
  pageContextSource = null;

  /**
   * @typedef {Window & { sv?: { PageContext?: PageContext } }} CustomWindow
   */

  if (typeof tab?.id !== 'number') {
    throw new Error('Could not retrieve PageContext: No valid active tab found.');
  }

  const result = await executeInTab(
    tab.id,
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

  if (!result) {
    throw new Error('Could not retrieve PageContext: Script returned no result.');
  }

  pageContextSource = result.source;
  return result.pageContext;
}

/**
 * @typedef {'online' | 'offline' | 'neither' | null | undefined} SitevisionMode
 */

/**
 * Determines whether the active tab is in Sitevision online mode, offline/edit mode,
 * Sitevision without a PageContext, or has not been verified as Sitevision.
 *
 * @param {chrome.tabs.Tab} tab
 * @returns {Promise<SitevisionMode>}
 * `null` means the tab is cached as non-Sitevision; `undefined` means verification is unknown.
 */
export async function getSitevisionMode(tab) {
  if (pageContextSource === 'window') return 'online';
  if (pageContextSource === 'frame') return 'offline';

  const status = await SiteVerification.get(tab);
  if (status === SiteVerification.Status.VERIFIED) return 'neither';
  if (status === SiteVerification.Status.REJECTED) return null;
  return undefined;
}
