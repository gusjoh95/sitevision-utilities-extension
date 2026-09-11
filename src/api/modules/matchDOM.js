import { getErrorMessage } from './getErrorMessage.js';

/**
 * @typedef {Object} MatchOptions
 * @property {string} [selector='*'] - CSS selector to target specific elements (e.g., 'script', 'meta').
 * @property {RegExp | string} [pattern] - The regex pattern to match against element content.
 */

/**
 * Executes a scoped fetch script inside a browser tab to test elements matching
 * a CSS selector against a provided regular expression pattern.
 *
 * @param {chrome.tabs.Tab} tab - The target tab where the script should be executed.
 * @param {string} url - Full URL to fetch and test.
 * @param {MatchOptions} [options={}] - Matching configuration options.
 * @returns {Promise<boolean>} Resolves with true if the URL yields matching content, otherwise false.
 * @throws {Error} Throws if tab/tab ID is missing or if script injection fails.
 */
export default async function matchDOM(tab, url, { selector = '*', pattern = '' } = {}) {
  const targetTabId = Number(tab?.id);
  if (!targetTabId) {
    throw new Error('Missing originating Tab ID.');
  }

  const patternSource = pattern instanceof RegExp ? pattern.source : pattern;
  const patternFlags = pattern instanceof RegExp ? pattern.flags : 'i';

  // Overriding TS signature with `@type {any}` due to chrome.scripting API limitation with `args`.
  /** @type {any} */
  const checkUrlTask = async (
    /** @type {string} */ targetUrl,
    /** @type {string} */ sel,
    /** @type {string} */ source,
    /** @type {string} */ flags
  ) => {
    try {
      const response = await fetch(targetUrl);

      if (!response.ok) {
        throw new Error(
          `Fetch failed for ${targetUrl}: HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`
        );
      }

      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const elements = doc.querySelectorAll(sel);
      const regex = new RegExp(source, flags);

      for (const el of elements) {
        const targetText = el.textContent || el.getAttribute('content') || '';
        if (regex.test(targetText)) {
          return true;
        }
      }

      return false;
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
      func: checkUrlTask,
      args: [url, selector, patternSource, patternFlags],
    });
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }

  const res = injectionResults?.[0]?.result;

  if (res?.__isError) {
    throw new Error(getErrorMessage(res.errorMessage));
  }

  return Boolean(res);
}
