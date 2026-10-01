import { dom, errors, options, spinner, targetPermissions } from '../../api/index.js';
import { getCurrentState } from './modules/getCurrentState.js';
import { runDiscovery } from './modules/runDiscovery.js';

async function initFindLoginView() {
  const { origin, anchorTabId } = getCurrentState();

  const spinnerEl = dom.getRequiredElement('#spinner');
  const errorElem = dom.getRequiredElement('#error');
  const summaryLink = dom.getRequiredElement('#summary-link');

  targetPermissions.registerTargetPermissionListener({
    tabId: Number(anchorTabId),
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
        errorElem.textContent = `Error: ${errors.messageOf(err)}`;
      }
    });
  }

  try {
    await spinner.withDeferredSpinner(
      async () => {
        await targetPermissions.assertTargetTabAccessible(Number(anchorTabId), origin);
        const customPaths = await options.getOption('customLoginPaths');
        await runDiscovery(Number(anchorTabId), origin, customPaths);
      },
      { spinnerEl, delayMs: 250 }
    );
  } catch (error) {
    const errorMsg = errors.messageOf(error);
    errorElem.textContent = `Error: ${errorMsg}`;
  }
}

document.addEventListener('DOMContentLoaded', initFindLoginView);
