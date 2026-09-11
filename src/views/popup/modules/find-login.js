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

    // Check permissions on load
    hasHostPerm = await chrome.permissions.contains({ origins: [`${origin}/*`] });

    if (!hasHostPerm) {
      findLoginBtn.setAttribute('data-tooltip', 'Find login page (requires host permission)');
      findLoginBtn.setAttribute(
        'aria-label',
        'Find login page. Requires host permission, popup will close to show prompt.'
      );
    }

    findLoginBtn.addEventListener('click', async () => {
      try {
        if (!hasHostPerm) {
          // Note: We cannot await this.
          chrome.permissions.request({ origins: [`${origin}/*`] });
          if (firefox) {
            // Manual close on Firefox since popup covers the permission prompt.
            window.close();
          }
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
