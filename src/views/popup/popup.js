import {
  getInvocationTab,
  getErrorMessage,
  getPageContext,
  getSitevisionMode,
  getRequiredElement,
  assertTargetTabAccessible,
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
      throw new Error('Unable to access active tab URL.');
    }
    const tabId = invocationTab?.id;
    if (typeof tabId !== 'number') {
      throw new Error('Missing tab ID.');
    }

    const { protocol, origin } = new URL(activeUrl);
    if (protocol !== 'http:' && protocol !== 'https:') {
      throw new Error('Active tab must use HTTP or HTTPS.');
    }
    // Can probably be removed without problems
    await assertTargetTabAccessible(tabId, origin);

    const pageContext = await getPageContext(invocationTab);

    // Determine if website is running Sitevision
    if (pageContext) {
      await SiteVerification.set(invocationTab, true);
    } else {
      let status = await SiteVerification.get(invocationTab);

      if (status === SiteVerification.Status.UNKNOWN) {
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
