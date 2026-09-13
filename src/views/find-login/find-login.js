import {
  getErrorMessage,
  getOption,
  getRequiredElement,
  withDeferredSpinner,
} from '../../api/index.js';
import { getCurrentState } from './modules/getCurrentState.js';
import { runDiscovery } from './modules/runDiscovery.js';

export async function initFindLoginView() {
  const { origin, anchorTabId } = getCurrentState();

  const logContainer = getRequiredElement('#log-container');
  const spinnerEl = getRequiredElement('#spinner');

  try {
    await withDeferredSpinner(
      async () => {
        if (!origin) {
          throw new Error('Missing "origin" parameter.');
        }
        if (!anchorTabId) {
          throw new Error('Missing "anchorTabId" parameter.');
        }

        await runDiscovery(anchorTabId, origin, await getOption('customLoginPaths'));
      },
      { spinnerEl, delayMs: 250 }
    );
  } catch (error) {
    logContainer.textContent = `Error: ${getErrorMessage(error)}`;
  }
}

document.addEventListener('DOMContentLoaded', initFindLoginView);
