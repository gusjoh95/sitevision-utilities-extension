import { getErrorMessage } from './getErrorMessage.js';

/**
 * Executes a scoped fetch script inside a browser tab to test fetched HTML
 * against a provided regular expression pattern.
 *
 * @param {chrome.tabs.Tab} tab - The target tab where the script should be executed.
 * @param {string | string[]} urls - Full URL or array of URLs to fetch and test.
 * @param {RegExp | string} pattern - The regex pattern to match against the fetched HTML.
 * @returns {Promise<boolean>} Resolves with true if any URL yields HTML matching the pattern, otherwise false.
 * @throws {Error} Throws if tab/tab ID is missing or if script injection fails.
 */
export default async function matchDOM(tab, urls, pattern) {
  const targetTabId = Number(tab?.id);
  if (!targetTabId) {
    throw new Error('Missing originating Tab ID.');
  }

  /** @type {string[]} */
  const urlsToCheck = Array.isArray(urls) ? urls : [urls];
  const patternSource = pattern instanceof RegExp ? pattern.source : pattern;
  const patternFlags = pattern instanceof RegExp ? pattern.flags : 'i';

  // Overriding TS signature with `@type {any}` due to chrome.scripting API limitation with `args`.
  /** @type {any} */
  const checkUrlsTask = async (
    /** @type {string[]} */ targetUrls,
    /** @type {string} */ source,
    /** @type {string} */ flags
  ) => {
    try {
      const regex = new RegExp(source, flags);

      for (const url of targetUrls) {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `Fetch failed for ${url}: HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`
          );
        }

        const html = await response.text();

        if (regex.test(html)) {
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
      func: checkUrlsTask,
      args: [urlsToCheck, patternSource, patternFlags],
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
