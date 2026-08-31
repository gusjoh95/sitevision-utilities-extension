import {
  getActiveTab,
  getRequiredElement,
  reloadCurrentTab,
  updateSessionWithParam,
} from '../../../api/index.js';

export async function initParamButtons() {
  const PARAMS = {
    profiling: 'profiling',
    jsdebug: 'jsdebug',
    slimrender: 'slimRender',
  };

  /** @type {HTMLInputElement} */
  const toggleProfilingCheckbox = getRequiredElement('#toggle-profiling');
  /** @type {HTMLInputElement} */
  const toggleJsDebugCheckbox = getRequiredElement('#toggle-jsdebug');
  /** @type {HTMLInputElement} */
  const toggleSlimrenderCheckbox = getRequiredElement('#toggle-slimrender');

  const tab = await getActiveTab();
  const activeTabId = tab?.id;
  if (typeof activeTabId !== 'number') {
    throw new Error('No active tab available for session parameter checks.');
  }

  toggleProfilingCheckbox.disabled = false;
  toggleJsDebugCheckbox.disabled = false;
  toggleSlimrenderCheckbox.disabled = false;

  /** @type {number} */
  const safeTabId = activeTabId;

  async function getProfilingState() {
    const results = await /** @type {Promise<chrome.scripting.InjectionResult[]>} */ (
      chrome.scripting.executeScript({
        target: { tabId: safeTabId },
        func: () =>
          [...document.querySelectorAll('body table th')].some(
            (th) => th.textContent.trim() === 'Profiling results'
          ),
      })
    );
    /** @type {{ result?: boolean } | undefined} */
    const result = results?.[0];
    return Boolean(result?.result);
  }

  async function getJsdebugState() {
    const results = await /** @type {Promise<chrome.scripting.InjectionResult[]>} */ (
      chrome.scripting.executeScript({
        target: { tabId: safeTabId },
        func: () => {
          // TODO Improve
          const minifiedTemplateAssetsSelector =
            'script[src$="/sv-template-asset.js"], link[href$="/sv-template-asset.css"]';
          const minifiedWebappAssetsSelector = 'script[src$="/webapp-assets.js"]';
          const count1 = document.querySelectorAll(minifiedTemplateAssetsSelector)?.length;
          const count2 = document.querySelectorAll(minifiedWebappAssetsSelector)?.length;
          const minifiedAssetCount = count1 + count2;
          // Jsdebug is considered on if no minified assets
          return minifiedAssetCount === 0;
        },
      })
    );
    /** @type {{ result?: boolean } | undefined} */
    const result = results?.[0];
    return Boolean(result?.result);
  }

  async function getSlimrenderState() {
    const results = await /** @type {Promise<chrome.scripting.InjectionResult[]>} */ (
      chrome.scripting.executeScript({
        target: { tabId: safeTabId },
        func: () =>
          document.querySelectorAll('head link[as="script"][href$="slim.js"]')?.length > 0,
      })
    );
    /** @type {{ result?: boolean } | undefined} */
    const result = results?.[0];
    return Boolean(result?.result);
  }
  toggleProfilingCheckbox.checked = await getProfilingState();
  toggleJsDebugCheckbox.checked = await getJsdebugState();
  toggleSlimrenderCheckbox.checked = await getSlimrenderState();

  toggleProfilingCheckbox.addEventListener('change', async () => {
    const success = await updateSessionWithParam(PARAMS.profiling, toggleProfilingCheckbox.checked);
    if (success) {
      reloadCurrentTab();
    }
  });

  toggleJsDebugCheckbox.addEventListener('change', async () => {
    const success = await updateSessionWithParam(PARAMS.jsdebug, toggleJsDebugCheckbox.checked);
    if (success) {
      reloadCurrentTab();
    }
  });

  toggleSlimrenderCheckbox.addEventListener('change', async () => {
    const success = await updateSessionWithParam(
      PARAMS.slimrender,
      toggleSlimrenderCheckbox.checked
    );
    if (success) {
      reloadCurrentTab();
    }
  });
}
