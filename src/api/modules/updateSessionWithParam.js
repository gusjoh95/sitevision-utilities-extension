import { getActiveTab } from './getActiveTab.js';

/**
 * Updates a session state on the active page by making a background HTTP GET request
 * with the specified query parameter set.
 *
 * To avoid cookie/CORS mismatches and erroneous log entries when fetching within
 * the extension context, this function executes the fetch request inside the target
 * tab's content script context (via `chrome.scripting.executeScript`).
 *
 * @param {string} param - The query parameter name to set (e.g., "jsdebug" or "profiling").
 * @param {boolean} value - The boolean state value for the parameter.
 * @returns {Promise<boolean>} Resolves to `true` if the injected fetch returns an HTTP 200 OK status, otherwise `false`.
 * @throws {Error} If `param` is empty or `value` is not a boolean.
 */
export async function updateSessionWithParam(param, value) {
  if (!param || typeof value !== 'boolean') {
    throw new Error('Missing param or value when trying to update session');
  }

  const tab = await getActiveTab();
  if (!tab?.id || !tab?.url) return false;

  const pageUrl = new URL(tab.url);
  pageUrl.searchParams.set(param, String(value));
  const reqUrl = pageUrl.toString();

  try {
    // Injected task executed in the target tab's context.
    // Overriding TS signature with `@type {any}` due to chrome.scripting API limitation with `args`.
    /** @type {any} */
    const checkUrlTask = async (/** @type {string} */ urlToFetch) => {
      try {
        const response = await fetch(urlToFetch, {
          method: 'GET',
          headers: { Accept: 'text/plain' },
        });
        return response.ok;
      } catch {
        return false;
      }
    };

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: checkUrlTask,
      args: [reqUrl],
    });

    return Boolean(results?.[0]?.result);
  } catch {
    return false;
  }
}
