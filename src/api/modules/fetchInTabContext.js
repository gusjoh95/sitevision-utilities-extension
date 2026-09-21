import { getErrorMessage } from './getErrorMessage.js';

/**
 * @typedef {Object} FetchInTabOptions
 * @property {RequestInit} [reqOptions] - Fetch options (e.g., method, headers, credentials, body).
 * @property {'text' | 'json'} [responseType='text'] - How to parse the response body.
 * @property {((res: FetchInTabResult) => any)} [callback] - Optional callback to process the result.
 */

/**
 * @typedef {Object} FetchInTabResult
 * @property {boolean} ok - True if HTTP status is 200-299.
 * @property {number} status - HTTP status code.
 * @property {string} statusText - HTTP status text.
 * @property {Record<string, string>} headers - Normalized response headers (lowercase keys).
 * @property {any} data - Parsed response body (string, parsed JSON object, or null).
 * @property {string} finalUrl - Final URL after any redirects.
 */

/**
 * Executes a fetch request inside the scripting context of a target browser tab.
 *
 * @param {number} tabId - Target tab ID.
 * @param {string} url - Target URL to fetch.
 * @param {FetchInTabOptions} [options] - Configuration options.
 * @returns {Promise<any>} Returns the callback's return value if provided, otherwise the FetchInTabResult object.
 */
export default async function fetchInTabContext(tabId, url, options = {}) {
  if (typeof tabId !== 'number' || !Number.isInteger(tabId) || tabId <= 0) {
    throw new Error('Missing or invalid Tab ID.');
  }

  const targetTabId = tabId;

  const { reqOptions = {}, responseType = 'text', callback } = options;

  /** @type {any} */
  const fetchTask = async (
    /** @type {string} */ targetUrl,
    /** @type {RequestInit} */ customReqOptions,
    /** @type {'text' | 'json'} */ parsingType
  ) => {
    try {
      const inputHeaders = customReqOptions.headers || {};
      const normalizedInputHeaders =
        typeof inputHeaders.entries === 'function'
          ? Object.fromEntries(inputHeaders.entries())
          : inputHeaders;

      const mergedHeaders = {
        'X-Requested-With': 'Sitevision-Utilities-Extension',
        ...normalizedInputHeaders,
      };

      const response = await fetch(targetUrl, {
        ...customReqOptions,
        headers: mergedHeaders,
      });

      /** @type {Record<string, string>} */
      const extractedHeaders = {};
      response.headers.forEach((value, key) => {
        extractedHeaders[key.toLowerCase()] = value;
      });

      let parsedData = null;
      if (response.status !== 204) {
        if (parsingType === 'json') {
          const rawText = await response.text();
          parsedData = rawText ? JSON.parse(rawText) : null;
        } else {
          parsedData = await response.text();
        }
      }

      return {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: extractedHeaders,
        data: parsedData,
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
    injectionResults = await browser.scripting.executeScript({
      target: { tabId: targetTabId },
      func: fetchTask,
      args: [url, reqOptions, responseType],
    });
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }

  const res = injectionResults?.[0]?.result;

  if (res?.__isError) {
    throw new Error(getErrorMessage(res.errorMessage));
  }

  if (typeof callback === 'function') {
    return callback(res);
  }

  return res;
}
