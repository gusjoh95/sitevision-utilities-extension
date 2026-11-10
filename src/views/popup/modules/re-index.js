import { dom, errors, i18n } from '../../../api/index.js';

/**
 * Initializes the "Reindex node tree" feature inside the popup.
 *
 * @param {chrome.tabs.Tab} tab - The active tab.
 * @param {string} rootNodeId - The root node ID to reindex recursively.
 * @returns {Promise<void>}
 */
export async function initReindex(tab, rootNodeId) {
  /** @type {HTMLButtonElement} */
  const reindexBtn = dom.getRequiredElement('#reindex-tree');

  try {
    if (!tab?.url) {
      throw new Error(i18n.getMessage('popup_noActiveTabUrlFound'));
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
        const msg = errors.messageOf(err);
        /** @type {HTMLDivElement} */
        const errEl = dom.getRequiredElement('#error');
        errEl.textContent = i18n.getMessage('common_errorOpeningWindow', [msg]);
      }
    });
  } catch (err) {
    const msg = errors.messageOf(err);
    /** @type {HTMLDivElement} */
    const errEl = dom.getRequiredElement('#error');
    errEl.textContent = i18n.getMessage('common_errorPrefix', [msg]);
  }
}
