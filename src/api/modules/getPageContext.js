import { getActiveTab } from './getActiveTab.js';

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
 * @returns {Promise<PageContext | null>} Resolves to the PageContext object, or null if unavailable on the page.
 */

export async function getPageContext() {
  /**
   * @typedef {Window & { sv?: { PageContext?: PageContext } }} CustomWindow
   */

  const tab = await getActiveTab();
  if (typeof tab?.id !== 'number') {
    throw new Error('Could not retrieve PageContext: No valid active tab found.');
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: 'MAIN',
    func: () => {
      /** @type {CustomWindow} */
      const win = window;

      if (win.sv?.PageContext) {
        return win.sv.PageContext;
      }

      /** @type {HTMLIFrameElement | null} */
      const editFrame = document.querySelector('#content-frame');
      /** @type {CustomWindow | null} */
      const frameWin = editFrame?.contentWindow ?? null;

      return frameWin?.sv?.PageContext ?? null;
    },
  });

  if (!results?.[0]) {
    throw new Error('Could not retrieve PageContext: Script returned no result.');
  }

  return results[0].result;
}
