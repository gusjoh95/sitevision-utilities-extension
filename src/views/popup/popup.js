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
  fetchInTabContext,
  EditMode,
} from '../../api/index.js';
import { initCookieConsent } from './modules/cookie.js';
import { initFindLogin } from './modules/find-login.js';
import { initOpenOptions } from './modules/open-options.js';
import { initParamButtons } from './modules/params.js';
import { initProperties } from './modules/properties.js';
import { initReindex } from './modules/re-index.js';

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

    const pageContext = await getPageContext(tabId);

    // Determine if website is running Sitevision
    if (pageContext) {
      await SiteVerification.set(invocationTab, true);
    } else {
      let status = await SiteVerification.get(invocationTab);

      if (status === SiteVerification.Status.UNKNOWN) {
        const res = await fetchInTabContext(tabId, origin);
        const isSitevision = matchDOM(res.data, {
          selector: 'script',
          pattern: /\bsv\.PageContext\s*=\s*\{/i,
        });
        await SiteVerification.set(invocationTab, isSitevision);
        status = isSitevision ? SiteVerification.Status.VERIFIED : SiteVerification.Status.REJECTED;
      }
    }

    const sitevisionMode = await getSitevisionMode(invocationTab);
    if (sitevisionMode === null) {
      throw new Error('Active tab is not a Sitevision site.');
    }

    // Initialize UI tasks array for parallel execution
    const uiTasks = [
      initFindLogin(invocationTab),
      initProperties(invocationTab, pageContext),
      initParamButtons(invocationTab, sitevisionMode),
      initCookieConsent(invocationTab),
    ];

    if (sitevisionMode === 'online' || sitevisionMode === 'offline') {
      if (pageContext?.pageId) {
        uiTasks.push(initReindex(invocationTab, pageContext.pageId));
      } else if (await EditMode.isEdit(invocationTab)) {
        // Added await: EditMode.isEdit interacts with the tab and is asynchronous
        const editInfo = await EditMode.getEditInfo(invocationTab);
        // Added await: Fetching edit info requires asynchronous execution in the target tab

        if (editInfo?.isEditMode && editInfo?.nodeId) {
          uiTasks.push(initReindex(invocationTab, editInfo.nodeId));
        }
      }
    }

    // Execute all independent UI initialization promises concurrently.
    // Promise.allSettled ensures one failing module doesn't crash the others.
    const results = await Promise.allSettled(uiTasks);

    // Log failures to console for easier debugging
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`UI Module at index ${index} failed to initialize:`, result.reason);
      }
    });

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
  // by rebuilding the popup state from the active tab.
  if (firefox) {
    window.close();
    return;
  }

  appEl.innerHTML = initialHTML;
  await init();
}

const spinnerEl = getRequiredElement('#spinner');

await withDeferredSpinner(() => init(), { spinnerEl, delayMs: 250 });
