import { getErrorMessage, getOption, getRequiredElement } from '../../api/index.js';
import { runDiscovery } from './modules/runDiscovery.js';

/**
 * Checks if origin permission exists (Firefox fallback check).
 *
 * @param {string} origin
 * @returns {Promise<boolean>}
 */
async function hasHostPermission(origin) {
  return chrome.permissions.contains({
    origins: [`${origin}/*`],
  });
}

export async function initFindLoginView() {
  const params = new URLSearchParams(window.location.search);
  const origin = params.get('origin');

  /** @type {HTMLButtonElement} */
  const startBtn = getRequiredElement('#start-discovery');
  const logContainer = getRequiredElement('#log-container');

  /**
   * Validates permissions, fetches latest options and runs discovery.
   */
  async function startDiscovery() {
    try {
      if (!origin) {
        startBtn.disabled = true;
        throw new Error('Missing "origin" parameter.');
      }

      if (!(await hasHostPermission(origin))) {
        startBtn.disabled = true;
        throw new Error(
          `Missing host permission for ${origin}. Please launch discovery from the extension popup.`
        );
      }

      const customPaths = await getOption('customLoginPaths');
      runDiscovery(origin, customPaths);
    } catch (error) {
      logContainer.textContent = `Error: ${getErrorMessage(error)}`;
    }
  }

  startBtn.addEventListener('click', startDiscovery);

  // Auto-run discovery on load
  startDiscovery();
}

document.addEventListener('DOMContentLoaded', initFindLoginView);
