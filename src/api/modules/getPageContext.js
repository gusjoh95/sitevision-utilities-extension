import { getActiveTab } from "./getActiveTab.js";

/**
 * Retrieves the Sitevision PageContext object from the active tab.
 * @description Executes a script in the page's MAIN world context to access the global
 * page metadata object, which is inaccessible from the standard ISOLATED world.
 * @note
 * - CSP: Running in the MAIN world means the script is subject to the page's Content Security Policy.
 * @returns {Promise<any>} Resolves to the PageContext object, or undefined if unavailable.
 */
export async function getPageContext() {
  // https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#isolated_world
  // Reminder: CSP applies in main world, might break or not work on certain sites.

  const tab = await getActiveTab();
  const [res] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: () => {
      /** @type {HTMLIFrameElement} */
      const editFrame = document.querySelector('#content-frame');
      const editFrameWindow = editFrame?.contentWindow;
      return window['sv']?.PageContext || editFrameWindow['sv']?.PageContext
    }
  });

  return res?.result;
}
