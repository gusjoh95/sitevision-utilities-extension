import {
  getActiveTab,
  getErrorMessage,
  getPageContext,
  getRequiredElement,
  isFirefox,
  registerCurrentTabChangeListener,
  SiteVerification,
  matchDOM,
  withDeferredSpinner,
} from '../../api/index.js';
import { initCookieConsent } from './modules/cookie.js';
import { initParamButtons } from './modules/params.js';
import { initProperties } from './modules/properties.js';

/** @type {HTMLDivElement} */
const appEl = getRequiredElement('#app');
const initialHTML = appEl.innerHTML;
let tabReloadListenerRegistered = false;

async function init() {
  try {
    const tab = await getActiveTab();
    const activeUrl = tab?.url;
    if (!activeUrl) {
      throw new Error(
        'Unable to access tab URL. Please make sure you are on an active web page and try again.'
      );
    }

    if (!activeUrl.startsWith('http:') && !activeUrl.startsWith('https:')) {
      throw new Error(
        'Wrong protocol on current tab. Please navigate to a page with http or https protocol and try again.'
      );
    }

    const pageContext = await getPageContext();

    if (pageContext) {
      await SiteVerification.set(tab, true);
    } else {
      let status = await SiteVerification.get(tab);

      if (status === SiteVerification.Status.UNKNOWN) {
        const origin = new URL(activeUrl).origin;
        const pageContextRegex =
          /<script[\s\S]*?>[\s\S]*?\bsv\.PageContext\s*=\s*\{[\s\S]*?\}[\s\S]*?<\/script>/i;

        const isSitevision = await matchDOM(tab, origin, pageContextRegex);
        await SiteVerification.set(tab, isSitevision);
        status = isSitevision ? SiteVerification.Status.VERIFIED : SiteVerification.Status.REJECTED;
      }

      if (status === SiteVerification.Status.REJECTED) {
        throw new Error(
          'Current tab is not a Sitevision site. Please navigate to a Sitevision site/page where window.sv is available and try again.'
        );
      }
    }

    await initProperties(pageContext);
    if (pageContext) {
      await initParamButtons();
    }
    await initCookieConsent();

    if (!tabReloadListenerRegistered) {
      registerCurrentTabChangeListener(handleTabReload);
      tabReloadListenerRegistered = true;
    }
  } catch (error) {
    const msg = getErrorMessage(error);
    /** @type {HTMLDivElement} */
    const errEl = getRequiredElement('#error');
    errEl.textContent = `Error: ${msg}`;
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
