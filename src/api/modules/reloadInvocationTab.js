import { getOptions } from './options.js';
import executeInTab from './executeInTab.js';

/**
 * Reloads the tab where the extension was invoked using browser.scripting, provided it's not in edit mode.
 *
 * @param {chrome.tabs.Tab} invocationTab - The tab where the extension was invoked.
 * @param {boolean} [respectOption=true] - Whether to respect the "reloadOnChange" user option.
 * @returns {Promise<void>} Resolves when the script has been executed on the tab.
 */
export async function reloadInvocationTab(invocationTab, respectOption = true) {
  if (invocationTab.url && !invocationTab.url.includes('/edit')) {
    const { reloadOnChange } = respectOption ? await getOptions() : { reloadOnChange: true };
    if (reloadOnChange) {
      if (typeof invocationTab?.id !== 'number') {
        throw new Error('No active tab available for reload.');
      }
      await executeInTab(invocationTab.id, () => window.location.reload());
    }
  }
}
