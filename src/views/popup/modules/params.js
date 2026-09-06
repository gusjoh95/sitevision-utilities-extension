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

  /**
   * Evaluates the active tab DOM to retrieve the current session parameter states.
   * @returns {Promise<{ profiling: boolean, jsdebug: boolean, slimrender: boolean }>}
   */
  async function getSessionParamStates() {
    const results = await /** @type {Promise<chrome.scripting.InjectionResult[]>} */ (
      chrome.scripting.executeScript({
        target: { tabId: safeTabId },
        func: () => {
          // Profiling check
          const isProfiling = [...document.querySelectorAll('body table th')].some(
            (th) => th.textContent?.trim() === 'Profiling results'
          );

          // TODO Improve
          // Jsdebug check
          const minifiedTemplateAssetsSelector =
            'script[src$="/sv-template-asset.js"], link[href$="/sv-template-asset.css"]';
          const minifiedWebappAssetsSelector = 'script[src$="/webapp-assets.js"]';
          const count1 = document.querySelectorAll(minifiedTemplateAssetsSelector)?.length ?? 0;
          const count2 = document.querySelectorAll(minifiedWebappAssetsSelector)?.length ?? 0;
          const minifiedAssetCount = count1 + count2;
          // Jsdebug is considered on if no minified assets
          const isJsdebug = !minifiedAssetCount;
          // Slimrender check
          const isSlimrender =
            (document.querySelectorAll('head link[as="script"][href$="slim.js"]')?.length ?? 0) > 0;

          return {
            profiling: isProfiling,
            jsdebug: isJsdebug,
            slimrender: isSlimrender,
          };
        },
      })
    );

    /** @type {{ result?: { profiling: boolean, jsdebug: boolean, slimrender: boolean } } | undefined} */
    const res = results?.[0];
    return res?.result ?? { profiling: false, jsdebug: false, slimrender: false };
  }

  /**
   * Binds a session parameter checkbox with UI loading states,
   * error rollback, and tab reloading.
   *
   * @param {HTMLInputElement} checkbox
   * @param {string} paramKey
   */
  function bindSessionToggle(checkbox, paramKey) {
    checkbox.addEventListener('click', async () => {
      checkbox.disabled = true;
      checkbox.indeterminate = true; // Note: This is purely a visual change.

      const targetState = checkbox.checked;
      const success = await updateSessionWithParam(paramKey, targetState);

      checkbox.indeterminate = false; // Note: This is purely a visual change.
      checkbox.disabled = false;

      if (success) {
        reloadCurrentTab();
      } else {
        // Revert GUI state if the network request failed
        checkbox.checked = !targetState;
      }
    });
  }

  const sessionStates = await getSessionParamStates();
  /**
   * @typedef {Object} ToggleConfig
   * @property {HTMLInputElement | null} element
   * @property {string} param
   * @property {keyof typeof sessionStates} key
   */

  /** @type {ToggleConfig[]} */
  const toggles = [
    { element: toggleProfilingCheckbox, param: PARAMS.profiling, key: 'profiling' },
    { element: toggleJsDebugCheckbox, param: PARAMS.jsdebug, key: 'jsdebug' },
    { element: toggleSlimrenderCheckbox, param: PARAMS.slimrender, key: 'slimrender' },
  ];

  for (const { element, param, key } of toggles) {
    if (!element) continue;
    element.checked = Boolean(sessionStates[key]);
    bindSessionToggle(element, param);
  }
}
