import { getErrorMessage, getRequiredElement, isFirefox } from '../../../api/index.js';

/**
 * Initializes the "Find login page" feature inside the popup.
 * Enables the button and attaches click event listener to launch discovery window.
 *
 * @returns {Promise<void>}
 */
export async function initFindLogin() {
  /** @type {HTMLButtonElement} */
  const findLoginBtn = getRequiredElement('#find-login');

  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!activeTab?.url) {
      throw new Error('No active tab URL found.');
    }

    const origin = new URL(activeTab.url).origin;
    const firefox = await isFirefox();

    let hasHostPerm = true;

    // Enable button once origin is resolved
    findLoginBtn.disabled = false;

    // Check permissions on load for Firefox to update UI accordingly
    if (firefox) {
      hasHostPerm = await chrome.permissions.contains({ origins: [`${origin}/*`] });

      if (!hasHostPerm) {
        findLoginBtn.setAttribute('data-tooltip', 'Find login page (requires host permission)');
        findLoginBtn.setAttribute(
          'aria-label',
          'Find login page. Requires host permission, popup will close to show prompt.'
        );
      }
    }

    findLoginBtn.addEventListener('click', async () => {
      try {
        if (firefox && !hasHostPerm) {
          // Trigger the prompt and close the popup immediately so it doesn't hide the doorhanger.
          // Note: We cannot await this. Closing the window destroys the script context,
          // so the user will need to grant permission and then click the button again.
          chrome.permissions.request({ origins: [`${origin}/*`] });
          window.close();
          return;
        }

        await chrome.windows.create({
          url: `/views/find-login/find-login.html?origin=${encodeURIComponent(origin)}`,
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
