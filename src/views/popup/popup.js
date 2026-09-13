import {
  getInvocationTab,
  getErrorMessage,
  getPageContext,
  getSitevisionMode,
  getRequiredElement,
  isFirefox,
  registerCurrentTabChangeListener,
  SiteVerification,
  matchDOM,
  withDeferredSpinner,
  fetchDOM,
} from '../../api/index.js';
import { initCookieConsent } from './modules/cookie.js';
import { initFindLogin } from './modules/find-login.js';
import { initOpenOptions } from './modules/open-options.js';
import { initParamButtons } from './modules/params.js';
import { initProperties } from './modules/properties.js';

/** @type {HTMLDivElement} */
const appEl = getRequiredElement('#app');
const initialHTML = appEl.innerHTML;
let tabReloadListenerRegistered = false;

async function init() {
  try {
    const invocationTab = await getInvocationTab();
    const activeUrl = invocationTab?.url;
    if (!activeUrl) {
      throw new Error(
        'Unable to access tab URL. Please make sure you are on an active web page and try again.'
      );
    }
    const tabId = invocationTab?.id;
    if (!tabId) {
      throw new Error('Missing tabid.');
    }

    if (!activeUrl.startsWith('http:') && !activeUrl.startsWith('https:')) {
      throw new Error('Wrong protocol on current tab.');
    }

    const pageContext = await getPageContext(invocationTab);

    if (pageContext) {
      await SiteVerification.set(invocationTab, true);
    } else {
      let status = await SiteVerification.get(invocationTab);

      if (status === SiteVerification.Status.UNKNOWN) {
        const origin = new URL(activeUrl).origin;
        const { html } = await fetchDOM(tabId, origin);
        const isSitevision = matchDOM(html, {
          selector: 'script',
          pattern: /\bsv\.PageContext\s*=\s*\{/i,
        });
        await SiteVerification.set(invocationTab, isSitevision);
        status = isSitevision ? SiteVerification.Status.VERIFIED : SiteVerification.Status.REJECTED;
      }
    }

    const sitevisionMode = await getSitevisionMode(invocationTab);
    if (sitevisionMode === null) {
      throw new Error('Current tab is not a Sitevision site.');
    }

    await initFindLogin(invocationTab);
    await initProperties(invocationTab, pageContext);
    await initParamButtons(invocationTab, sitevisionMode);
    await initCookieConsent(invocationTab);

    if (!tabReloadListenerRegistered) {
      registerCurrentTabChangeListener(handleTabReload);
      tabReloadListenerRegistered = true;
    }
  } catch (error) {
    const msg = getErrorMessage(error);
    /** @type {HTMLDivElement} */
    const errEl = getRequiredElement('#error');
    errEl.textContent = `Error: ${msg}`;
  } finally {
    try {
      await initOpenOptions();
    } catch (error) {
      const msg = getErrorMessage(error);
      /** @type {HTMLDivElement} */
      const errEl = getRequiredElement('#error');
      errEl.textContent = `Error: ${msg}`;
    }
  }
}

async function handleTabReload() {
  const firefox = await isFirefox();

  // Firefox drops the temporary activeTab permission when the popup page itself is reloaded or navigated.
  // Closing the popup is more reliable than resetting the DOM in that browser, while Chrome can still recover
  // by rebuilding the popup state from the current tab.
  if (firefox) {
    window.close();
    return;
  }

  appEl.innerHTML = initialHTML;
  await init();
}

const spinnerEl = getRequiredElement('#spinner');

await withDeferredSpinner(() => init(), { spinnerEl, delayMs: 250 });
