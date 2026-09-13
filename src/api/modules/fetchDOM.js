import { getErrorMessage } from './getErrorMessage.js';

/**
 * Executes a fetch request inside the context of a browser tab.
 *
 * @param {number} tabId - The target tab ID.
 * @param {string} url - Full URL to fetch.
 * @returns {Promise<{ ok: boolean, status: number, html: string, finalUrl: string }>}
 * @throws {Error} Throws if tab ID is invalid or script injection fails.
 */
export default async function fetchDOM(tabId, url) {
  const targetTabId = Number(tabId);
  if (!targetTabId || Number.isNaN(targetTabId)) {
    throw new Error('Missing or invalid Tab ID.');
  }

  // Overriding TS signature with `@type {any}` due to chrome.scripting API limitation with `args`.
  /** @type {any} */
  const fetchTask = async (/** @type {string} */ targetUrl) => {
    try {
      const response = await fetch(targetUrl);
      const html = await response.text();
      return {
        ok: response.ok,
        status: response.status,
        html,
        finalUrl: response.url,
      };
    } catch (err) {
      return {
        __isError: true,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }
  };

  let injectionResults;

  try {
    injectionResults = await chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      func: fetchTask,
      args: [url],
    });
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }

  const res = injectionResults?.[0]?.result;

  if (res?.__isError) {
    throw new Error(getErrorMessage(res.errorMessage));
  }

  return res;
}
