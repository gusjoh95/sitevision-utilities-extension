import { getInvocationTab } from './getInvocationTab.js';
import { getErrorMessage } from './getErrorMessage.js';

/**
 * Updates a session state on the active page by making a background HTTP GET request
 * with the specified query parameter set.
 *
 * To avoid cookie/CORS mismatches and erroneous log entries when fetching within
 * the extension context, this function executes the fetch request inside the target
 * tab's content script context (via `browser.scripting.executeScript`).
 *
 * @param {string} param - The query parameter name to set (e.g., "jsdebug" or "profiling").
 * @param {boolean} value - The boolean state value for the parameter.
 * @returns {Promise<boolean>} Resolves to `true` if the request succeeds or lands on a valid Sitevision view (statuscode < 500), otherwise `false`.
 * @throws {Error} If `param` is empty or `value` is not a boolean.
 */
export async function updateSessionWithParam(param, value) {
  if (!param || typeof value !== 'boolean') {
    throw new Error('Missing param or value when trying to update session');
  }

  const tab = await getInvocationTab();
  if (!tab?.id || !tab?.url) return false;

  const pageUrl = new URL(tab.url);
  pageUrl.searchParams.set(param, String(value));
  const reqUrl = pageUrl.toString();

  try {
    // Injected task executed in the target tab's context.
    // Overriding TS signature with `@type {any}` due to browser.scripting API limitation with `args`.
    /** @type {any} */
    const checkUrlTask = async (/** @type {string} */ urlToFetch) => {
      try {
        const response = await fetch(urlToFetch, {
          method: 'GET',
          headers: { Accept: 'text/plain' },
        });

        // Sitevision updates session flags on valid page views (including 401, 403, 404).
        // Treat 5xx server errors as actual execution failures.
        if (response.status >= 500) {
          return {
            ok: false,
            error: `Server error HTTP ${response.status} ${response.statusText}`.trim(),
          };
        }

        return { ok: true };
      } catch (e) {
        return {
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    };

    const results = await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: checkUrlTask,
      args: [reqUrl],
    });

    const executionResult = results?.[0]?.result;

    if (!executionResult?.ok) {
      const errorMsg = executionResult?.error || 'Unknown script execution error';
      console.error(`Error updating session with param "${param}" in tab ${tab.id}: ${errorMsg}`);
      return false;
    }

    return true;
  } catch (e) {
    console.error(
      `Error updating session with param "${param}" in tab ${tab.id}: ${getErrorMessage(e)}`
    );
    return false;
  }
}
