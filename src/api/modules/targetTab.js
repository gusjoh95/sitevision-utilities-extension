import { messageOf } from './errors.js';
import { getOptions } from './options.js';

/**
 * @typedef {Object} ExecuteScriptOptions
 * @property {'ISOLATED' | 'MAIN'} [world] - Execution world for the injected function.
 */

/**
 * @template Result
 * @overload
 * @param {number} tabId - Target tab ID.
 * @param {() => Result} func - A self-contained function with no arguments.
 * @param {[]} [args] - Empty argument tuple.
 * @param {ExecuteScriptOptions} [options] - Injection options.
 * @returns {Promise<Awaited<Result> | undefined>}
 */
/**
 * @template {any[]} Args
 * @template Result
 * @overload
 * @param {number} tabId - Target tab ID.
 * @param {(...args: Args) => Result} func - A self-contained function with arguments.
 * @param {Args} args - Arguments to pass to `func`.
 * @param {ExecuteScriptOptions} [options] - Injection options.
 * @returns {Promise<Awaited<Result> | undefined>}
 */
/**
 * Executes a self-contained function inside a target tab's scripting context.
 *
 * @param {number} tabId
 * @param {(...args: any[]) => any} func
 * @param {any[]} [args=[]]
 * @param {ExecuteScriptOptions} [options={}]
 * @returns {Promise<any>}
 */
export async function executeScript(tabId, func, args = [], options = {}) {
  if (typeof tabId !== 'number' || !Number.isInteger(tabId) || tabId <= 0) {
    throw new Error('Missing or invalid Tab ID.');
  }

  let injectionResults;
  try {
    injectionResults = await browser.scripting.executeScript({
      target: { tabId },
      func,
      args,
      ...(options.world ? { world: options.world } : {}),
    });
  } catch (error) {
    throw new Error(messageOf(error), { cause: error });
  }

  return /** @type {Awaited<Result> | undefined} */ (injectionResults?.[0]?.result);
}

/**
 * @template [CallbackResult=never]
 * @typedef {Object} FetchOptions
 * @property {RequestInit} [reqOptions] - Fetch options (e.g., method, headers, credentials, body).
 * @property {'text' | 'json'} [responseType='text'] - How to parse the response body.
 * @property {((res: FetchResult) => CallbackResult)} [callback] - Optional callback to process the result.
 */

/**
 * @typedef {Object} FetchResult
 * @property {boolean} ok - True if HTTP status is 200-299.
 * @property {number} status - HTTP status code.
 * @property {string} statusText - HTTP status text.
 * @property {Record<string, string>} headers - Normalized response headers (lowercase keys).
 * @property {any} data - Parsed response body (string, parsed JSON object, or null).
 * @property {string} finalUrl - Final URL after any redirects.
 */

/** @typedef {{ __isError: true, errorMessage: string }} FetchExecutionError */

/**
 * Executes a fetch request inside the scripting context of a target browser tab.
 *
 * @template [CallbackResult=never]
 * @param {number} tabId - Target tab ID.
 * @param {string} url - Target URL to fetch.
 * @param {FetchOptions<CallbackResult>} [options] - Configuration options.
 * @returns {Promise<FetchResult | CallbackResult>} The response, or the callback's return value.
 */
export async function fetch(tabId, url, options = {}) {
  const { reqOptions = {}, responseType = 'text', callback } = options;

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

      const response = await globalThis.fetch(targetUrl, {
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
      return /** @type {FetchExecutionError} */ ({
        __isError: true,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const res = await executeScript(tabId, fetchTask, [url, reqOptions, responseType]);

  if (!res) {
    throw new Error('No response returned from target tab.');
  }
  if ('__isError' in res) {
    throw new Error(messageOf(res.errorMessage));
  }

  if (typeof callback === 'function') {
    return callback(res);
  }

  return res;
}

/**
 * Retrieves the tab in which the extension action was invoked.
 *
 * @returns {Promise<chrome.tabs.Tab | undefined>}
 */
export async function getInvocationTab() {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  return tab;
}

/**
 * Reloads the tab where the extension was invoked using browser.scripting, provided it's not in edit mode.
 *
 * @param {chrome.tabs.Tab} invocationTab - The tab where the extension was invoked.
 * @param {boolean} [respectOption=true] - Whether to respect the "reloadOnChange" user option.
 * @returns {Promise<void>} Resolves when the script has been executed on the tab.
 */
export async function reloadInvocationTab(invocationTab, respectOption = true) {
  if (invocationTab.url && !invocationTab.url.includes('/edit')) {
    const { reloadOnChange } = respectOption ? await getOptions() : { reloadOnChange: true };
    if (reloadOnChange) {
      if (typeof invocationTab?.id !== 'number') {
        throw new Error('No active tab available for reload.');
      }
      await executeScript(invocationTab.id, () => window.location.reload());
    }
  }
}

/**
 * Register a callback for active-tab update completion.
 * The callback is invoked once the updated tab is still the active tab and the load cycle is complete.
 *
 * @param {() => void | Promise<void>} [onTabComplete] - Optional callback after the active tab finishes loading.
 * @returns {void}
 */
export function registerCurrentTabChangeListener(onTabComplete) {
  browser.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    try {
      const activeTab = await getInvocationTab();
      if (!activeTab) return;

      if (tabId === activeTab.id && changeInfo.status === 'complete') {
        if (typeof onTabComplete === 'function') {
          await onTabComplete();
        }
      }
    } catch (error) {
      console.error('Failed to handle active tab update:', error);
    }
  });
}
