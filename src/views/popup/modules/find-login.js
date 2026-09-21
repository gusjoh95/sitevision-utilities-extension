import { getErrorMessage, getRequiredElement } from '../../../api/index.js';

/**
 * Initializes the "Find login page" feature inside the popup.
 * Enables the button and attaches click event listener to launch discovery window.
 *
 * @param {chrome.tabs.Tab} tab - The active tab.
 * @returns {Promise<void>}
 */
export async function initFindLogin(tab) {
  /** @type {HTMLButtonElement} */
  const findLoginBtn = getRequiredElement('#find-login');

  try {
    if (!tab?.url) {
      throw new Error('No active tab URL found.');
    }

    const origin = new URL(tab.url).origin;

    // Enable button once origin is resolved
    findLoginBtn.disabled = false;

    findLoginBtn.addEventListener('click', async () => {
      try {
        await browser.windows.create({
          url: `/views/find-login/find-login.html?origin=${encodeURIComponent(origin)}&anchorTabId=${tab.id}`,
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
