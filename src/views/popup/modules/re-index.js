import { getErrorMessage, getRequiredElement } from '../../../api/index.js';

/**
 * Initializes the "Reindex node tree" feature inside the popup.
 *
 * @param {chrome.tabs.Tab} tab - The active tab.
 * @param {string} rootNodeId - The root node ID to reindex recursively.
 * @returns {Promise<void>}
 */
export async function initReindex(tab, rootNodeId) {
  /** @type {HTMLButtonElement} */
  const reindexBtn = getRequiredElement('#reindex-tree');

  try {
    if (!tab?.url) {
      throw new Error('No active tab URL found.');
    }

    const origin = new URL(tab.url).origin;

    reindexBtn.disabled = false;

    reindexBtn.addEventListener('click', async () => {
      try {
        await chrome.windows.create({
          url: `/views/re-index/re-index.html?origin=${encodeURIComponent(origin)}&anchorTabId=${tab.id}&rootNodeId=${encodeURIComponent(rootNodeId)}`,
          type: 'popup',
          width: 800,
          height: 600,
        });
      } catch (err) {
        const msg = getErrorMessage(err);
        /** @type {HTMLDivElement} */
        const errEl = getRequiredElement('#error');
        errEl.textContent = `Error opening window: ${msg}`;
      }
    });
  } catch (err) {
    const msg = getErrorMessage(err);
    /** @type {HTMLDivElement} */
    const errEl = getRequiredElement('#error');
    errEl.textContent = `Error: ${msg}`;
  }
}
