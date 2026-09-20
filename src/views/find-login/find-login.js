import {
  assertTargetTabAccessible,
  getErrorMessage,
  getOption,
  getRequiredElement,
  registerTargetPermissionListener,
  withDeferredSpinner,
} from '../../api/index.js';
import { getCurrentState } from './modules/getCurrentState.js';
import { runDiscovery } from './modules/runDiscovery.js';

async function initFindLoginView() {
  const { origin, anchorTabId } = getCurrentState();

  const spinnerEl = getRequiredElement('#spinner');
  const errorElem = getRequiredElement('#error');
  // Bind click handler once for clipboard copy & tooltip/feedback state
  const summaryLink = getRequiredElement('#summary-link');

  registerTargetPermissionListener({
    tabId: anchorTabId,
    origin,
    onLost: ({ message }) => {
      errorElem.textContent = `Warning: ${message}`;
    },
  });

  if (summaryLink) {
    summaryLink.addEventListener('click', async (e) => {
      try {
        e.preventDefault();
        const url = summaryLink.dataset.url;
        if (!url) return;

        await browser.tabs.create({ url });
      } catch (err) {
        errorElem.textContent = `Error: ${getErrorMessage(err)}`;
      }
    });
  }

  try {
    await withDeferredSpinner(
      async () => {
        await assertTargetTabAccessible(anchorTabId, origin);
        const options = await getOption('customLoginPaths');
        await runDiscovery(anchorTabId, origin, options);
      },
      { spinnerEl, delayMs: 250 }
    );
  } catch (error) {
    const errorMsg = getErrorMessage(error);
    errorElem.textContent = `Error: ${errorMsg}`;
  }
}

document.addEventListener('DOMContentLoaded', initFindLoginView);
