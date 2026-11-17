import { dom, errors, i18n } from '../../../api/index.js';

/**
 * @param {chrome.tabs.Tab} tab
 * @param {string} siteId
 * @param {boolean} isEditMode
 */
export async function initSearch(tab, siteId, isEditMode) {
  /** @type {HTMLButtonElement} */
  const searchButton = dom.getRequiredElement('#open-search');

  if (typeof siteId !== 'string' || !/^2\.[a-f\d]+$/i.test(siteId)) {
    return;
  }

  searchButton.disabled = false;
  searchButton.addEventListener('click', async () => {
    try {
      if (!tab.url || typeof tab.id !== 'number') {
        throw new Error(i18n.getMessage('popup_noActiveTabUrlFound'));
      }
      const params = new URLSearchParams({
        origin: new URL(tab.url).origin,
        anchorTabId: String(tab.id),
        siteId,
        version: isEditMode ? '0' : '1',
      });
      await browser.windows.create({
        url: `/views/search/search.html?${params}`,
        type: 'popup',
        width: 800,
        height: 600,
      });
    } catch (error) {
      const errorElement = dom.getRequiredElement('#error');
      errorElement.textContent = i18n.getMessage('common_errorOpeningWindow', [
        errors.messageOf(error),
      ]);
    }
  });
}
