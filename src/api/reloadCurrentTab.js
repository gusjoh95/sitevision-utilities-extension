import { getActiveTab } from "./getActiveTab.js";
import { getOptions } from "./options.js";

/**
 * Reloads the currently active tab using chrome.scripting, provided it's not in edit mode.
 * Can optionally bypass the "reloadOnChange" user setting.
 * @param {boolean} [respectOption=true] - Whether to respect the "reloadOnChange" user option.
 * @returns {Promise<void>} Resolves when the script has been executed on the tab.
 */
export async function reloadCurrentTab(respectOption = true) {
  const tab = await getActiveTab();
  if (tab.url && !tab.url.includes("/edit")) {
    const { reloadOnChange } = respectOption ? await getOptions() : { reloadOnChange: true };
    if (reloadOnChange) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.location.reload()
      });
    }
  }
}