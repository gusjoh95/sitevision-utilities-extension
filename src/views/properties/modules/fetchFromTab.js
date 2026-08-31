import { restApiPath } from '../properties.js';

/**
 * Fetches Sitevision property data for a given node by executing a scoped fetch script
 * within the context of the originating browser tab.
 *
 * @param {Object} state - The view state parameters.
 * @param {string} state.origin - The base URL/origin of the originating browser tab.
 * @param {string} state.version - The Sitevision REST API version identifier (e.g., "1" or "0").
 * @param {string} state.node - The target Sitevision node ID.
 * @param {string|number} state.anchorTabId - The ID of the tab through which the fetch request is executed.
 * @returns {Promise<Record<string, unknown>>} Resolves with the parsed JSON properties object returned by the Sitevision API.
 * @throws {Error} Throws if `anchorTabId` is missing/invalid, if script injection fails, or if the HTTP fetch inside the target tab returns an error.
 */
export async function fetchFromTab(state) {
  const targetTabId = Number(state.anchorTabId);
  if (!targetTabId) {
    throw new Error('Missing originating Tab ID.');
  }

  // Overriding TS signature with `@type {any}` due to chrome.scripting API limitation with `args`.
  /** @type {any} */
  const fetchPropertiesTask = async (
    /** @type {string} */ origin,
    /** @type {string} */ apiPath,
    /** @type {string} */ version,
    /** @type {string} */ node
  ) => {
    try {
      const url = `${origin}${apiPath}/${version}/${node}/properties`;
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        const errorPayload = errorJson
          ? JSON.stringify(errorJson)
          : `HTTP ${response.status} ${response.statusText}`;

        return { __isError: true, payload: errorPayload };
      }

      return await response.json();
    } catch (err) {
      return {
        __isError: true,
        payload: err instanceof Error ? err.message : String(err),
      };
    }
  };

  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    func: fetchPropertiesTask,
    args: [state.origin, restApiPath, state.version, state.node],
  });

  const res = injectionResults?.[0]?.result;

  if (res?.__isError) {
    throw new Error(res.payload);
  }

  if (!res) {
    throw new Error('Unexpected empty response from tab.');
  }

  return res;
}
