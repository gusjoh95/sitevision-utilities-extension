import {
  getErrorMessage,
  getOption,
  getRequiredElement,
  withDeferredSpinner,
} from '../../api/index.js';
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
  const origin = new URLSearchParams(window.location.search).get('origin');
  const logContainer = getRequiredElement('#log-container');
  const spinnerEl = getRequiredElement('#spinner');

  try {
    await withDeferredSpinner(
      async () => {
        if (!origin) {
          throw new Error('Missing "origin" parameter.');
        }

        if (!(await hasHostPermission(origin))) {
          throw new Error(
            `Missing host permission for ${origin}. Please launch discovery from the extension popup.`
          );
        }

        await runDiscovery(origin, await getOption('customLoginPaths'));
      },
      { spinnerEl, delayMs: 250 }
    );
  } catch (error) {
    logContainer.textContent = `Error: ${getErrorMessage(error)}`;
  }
}

document.addEventListener('DOMContentLoaded', initFindLoginView);
