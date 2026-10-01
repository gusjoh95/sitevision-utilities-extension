import { messageOf } from './errors.js';
import { executeScript, getInvocationTab } from './targetTab.js';

/**
 * Updates a session state on the active page by making a GET request with a query parameter.
 *
 * @param {string} param - The query parameter name to set.
 * @param {boolean} value - The boolean state value for the parameter.
 * @returns {Promise<boolean>} True if the request succeeds or lands on a valid Sitevision view; otherwise false.
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
    const checkUrlTask = async (/** @type {string} */ urlToFetch) => {
      try {
        const response = await fetch(urlToFetch, {
          method: 'GET',
          headers: { Accept: 'text/plain' },
        });
        if (response.status >= 500) {
          return {
            ok: false,
            error: `Server error HTTP ${response.status} ${response.statusText}`.trim(),
          };
        }
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    };

    const result = await executeScript(tab.id, checkUrlTask, [reqUrl]);
    if (!result?.ok) {
      const errorMessage = result?.error || 'Unknown script execution error';
      console.error(
        `Error updating session with param "${param}" in tab ${tab.id}: ${errorMessage}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      `Error updating session with param "${param}" in tab ${tab.id}: ${messageOf(error)}`
    );
    return false;
  }
}
