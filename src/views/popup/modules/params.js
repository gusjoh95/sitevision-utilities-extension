import {
  executeInTab,
  getErrorMessage,
  getRequiredElement,
  reloadInvocationTab,
  updateSessionWithParam,
} from '../../../api/index.js';

/**
 * @param {chrome.tabs.Tab} tab - The active tab.
 * @param {import('../../../api/types.js').SitevisionMode} sitevisionMode
 */
export async function initParamButtons(tab, sitevisionMode) {
  const PARAMS = {
    profiling: 'profiling',
    jsdebug: 'jsdebug',
    slimrender: 'slimRender',
  };

  if (sitevisionMode !== 'online') {
    console.info('Skipping initalization of parameters in popup');
    return;
  }

  /** @type {HTMLInputElement} */
  const toggleProfilingCheckbox = getRequiredElement('#toggle-profiling');
  /** @type {HTMLInputElement} */
  const toggleJsDebugCheckbox = getRequiredElement('#toggle-jsdebug');
  /** @type {HTMLInputElement} */
  const toggleSlimrenderCheckbox = getRequiredElement('#toggle-slimrender');
  /** @type {HTMLParagraphElement} */

  /** @type {Array<{ element: HTMLInputElement, param: string, key: 'profiling' | 'jsdebug' | 'slimrender' }>} */
  const toggles = [
    { element: toggleProfilingCheckbox, param: PARAMS.profiling, key: 'profiling' },
    { element: toggleJsDebugCheckbox, param: PARAMS.jsdebug, key: 'jsdebug' },
    { element: toggleSlimrenderCheckbox, param: PARAMS.slimrender, key: 'slimrender' },
  ];

  const activeTabId = tab?.id;
  if (typeof activeTabId !== 'number') {
    throw new Error('No active tab available for session parameter checks.');
  }

  /** @type {number} */
  const safeTabId = activeTabId;

  /**
   * Evaluates the active tab DOM to retrieve the current session parameter states.
   * @returns {Promise<{ profiling: boolean, jsdebug: boolean, slimrender: boolean }>}
   */
  async function getSessionParamStates() {
    const result = await executeInTab(safeTabId, () => {
      // Profiling check
      const isProfiling = [...document.querySelectorAll('body table th')].some(
        (th) => th.textContent?.trim() === 'Profiling results'
      );

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
    });

    if (!result) {
      throw new Error('Session parameter check returned no result.');
    }
    return result;
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
      try {
        const success = await updateSessionWithParam(paramKey, targetState);

        if (success) {
          await reloadInvocationTab(tab);
        } else {
          // Revert GUI state if the network request failed
          checkbox.checked = !targetState;
        }
      } catch (error) {
        checkbox.checked = !targetState;
        getRequiredElement('#error').textContent = `Error: ${getErrorMessage(error)}`;
      } finally {
        checkbox.indeterminate = false; // Note: This is purely a visual change.
        checkbox.disabled = false;
      }
    });
  }

  const sessionStates = await getSessionParamStates();
  for (const { element, param, key } of toggles) {
    if (!element) continue;
    element.checked = Boolean(sessionStates[key]);
    element.disabled = false;
    bindSessionToggle(element, param);
  }
}
