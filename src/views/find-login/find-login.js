import { dom, errors, i18n, options, spinner, targetPermissions } from '../../api/index.js';
import { getCurrentState } from './modules/getCurrentState.js';
import { runDiscovery } from './modules/runDiscovery.js';

await i18n.initialize();
i18n.localizeDocument();

async function initFindLoginView() {
  const { origin, anchorTabId } = getCurrentState();

  const spinnerEl = dom.getRequiredElement('#spinner');
  const errorElem = dom.getRequiredElement('#error');
  const summaryLink = dom.getRequiredElement('#summary-link');

  targetPermissions.registerTargetPermissionListener({
    tabId: Number(anchorTabId),
    origin,
    onLost: ({ message }) => {
      errorElem.textContent = i18n.getMessage('warningPrefix', [message]);
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
        errorElem.textContent = i18n.getMessage('errorPrefix', [errors.messageOf(err)]);
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
    errorElem.textContent = i18n.getMessage('errorPrefix', [errorMsg]);
  }
}

await initFindLoginView();
