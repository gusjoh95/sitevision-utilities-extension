import { restApiPath } from "../properties.js";

/**
 * Fetches Sitevision property data for the selected node through the originating tab.
 *
 * @param {{ origin: string, version: string, node: string, anchorTabId: string|number }} state
 *   The current page state containing the origin URL, version, node ID, and the anchored source tab ID.
 *   It is passed as a query string from the popup and converted here with Number() before use as a Chrome tab ID.
 * @returns {Promise<Object>} The JSON response returned by the Sitevision properties endpoint.
 * @throws {Error} If the anchored tab ID is missing or the injected fetch fails.
 */
export async function fetchFromTab(state) {
  const targetTabId = Number(state.anchorTabId);
  if (!targetTabId) {
    throw new Error("Missing originating Tab ID.");
  }

  // Inject the fetch execution directly into opening background tab
  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    args: [state.origin, restApiPath, state.version, state.node],
    func: async (origin, restApiPath, version, node) => {
      const url = `${origin}${restApiPath}/${version}/${node}/properties`;
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(JSON.stringify(errorJson) || `HTTP ${response.status}`);
      }
      return await response.json();
    }
  });

  return injectionResults[0].result;
}
