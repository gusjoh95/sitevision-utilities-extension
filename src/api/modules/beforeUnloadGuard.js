import executeInTab from './executeInTab.js';

export const BEFORE_UNLOAD_GUARD_CLEANUP_MESSAGE = 'REMOVE_BEFORE_UNLOAD_GUARD';

/**
 * Installs a beforeunload confirmation handler in the target tab.
 *
 * @param {number} tabId - ID of the target tab.
 * @param {string} guardId - Unique ID for the guarded operation.
 * @returns {Promise<void>}
 */
export async function installBeforeUnloadGuard(tabId, guardId) {
  await executeInTab(tabId, addBeforeUnloadGuard, [guardId]);
}

/**
 * Removes one operation's beforeunload handler from the target tab.
 *
 * @param {number} tabId - ID of the target tab.
 * @param {string} guardId - Unique ID for the guarded operation.
 * @returns {Promise<void>}
 */
export async function removeBeforeUnloadGuard(tabId, guardId) {
  await executeInTab(tabId, removeBeforeUnloadGuardFromPage, [guardId]);
}

/** @param {string} guardId */
function addBeforeUnloadGuard(guardId) {
  const pageGlobal = /** @type {any} */ (globalThis);
  const guardStoreKey = '__sitevisionUtilitiesBeforeUnloadGuards';
  const guards = pageGlobal[guardStoreKey] ?? new Map();
  if (guards.has(guardId)) return;

  /** @param {BeforeUnloadEvent} event */
  function handler(event) {
    event.preventDefault();
    event.returnValue = '';
  }

  window.addEventListener('beforeunload', handler);
  guards.set(guardId, handler);
  pageGlobal[guardStoreKey] = guards;
}

/** @param {string} guardId */
function removeBeforeUnloadGuardFromPage(guardId) {
  const pageGlobal = /** @type {any} */ (globalThis);
  const guardStoreKey = '__sitevisionUtilitiesBeforeUnloadGuards';
  const guards = pageGlobal[guardStoreKey];
  const handler = guards?.get(guardId);
  if (!handler) return;

  window.removeEventListener('beforeunload', handler);
  guards.delete(guardId);
  if (guards.size === 0) delete pageGlobal[guardStoreKey];
}