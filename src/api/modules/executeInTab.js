import { getErrorMessage } from './getErrorMessage.js';

/**
 * @typedef {Object} ExecuteInTabOptions
 * @property {'ISOLATED' | 'MAIN'} [world] - Execution world for the injected function.
 */

/**
 * Runs a self-contained function inside a target tab's scripting context and returns its result.
 *
 * @param {number} tabId - Target tab ID.
 * @param {(...args: any[]) => any} func - Function to execute in the tab. Must not close over outer scope.
 * @param {any[]} [args] - Arguments to pass to `func`.
 * @param {ExecuteInTabOptions} [options] - Injection options.
 * @returns {Promise<any>} The return value of `func` as executed in the tab.
 */
export default async function executeInTab(tabId, func, args = [], options = {}) {
  if (typeof tabId !== 'number' || !Number.isInteger(tabId) || tabId <= 0) {
    throw new Error('Missing or invalid Tab ID.');
  }

  const { world } = options;

  /** @type {any} */
  const injectedFunc = func;

  let injectionResults;
  try {
    injectionResults = await browser.scripting.executeScript({
      target: { tabId },
      func: injectedFunc,
      args,
      ...(world ? { world } : {}),
    });
  } catch (error) {
    throw new Error(getErrorMessage(error), { cause: error });
  }

  return injectionResults?.[0]?.result;
}
