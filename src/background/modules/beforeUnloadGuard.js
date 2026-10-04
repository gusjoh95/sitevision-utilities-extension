import { targetTab } from '../../api/index.js';
import { BEFORE_UNLOAD_GUARD_MESSAGE } from '../messages.js';

/**
 * Registers background-owned beforeunload guard install and removal requests.
 *
 * @returns {void}
 */
export function registerBeforeUnloadGuard() {
  browser.runtime.onMessage.addListener((message) => {
    if (message?.type !== BEFORE_UNLOAD_GUARD_MESSAGE) return undefined;
    if (
      typeof message.tabId !== 'number' ||
      typeof message.guardId !== 'string' ||
      !['install', 'remove'].includes(message.action)
    ) {
      return undefined;
    }

    const operation = message.action === 'install' ? addBeforeUnloadGuard : removeBeforeUnloadGuard;
    return targetTab.executeScript(message.tabId, operation, [message.guardId]).then(
      (result) => (message.action === 'install' ? { installed: true } : { removed: result }),
      (error) => {
        console.warn(`Failed to ${message.action} a beforeunload guard.`, error);
        return message.action === 'install' ? { installed: false } : { removed: false };
      }
    );
  });
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
  }

  window.addEventListener('beforeunload', handler);
  guards.set(guardId, handler);
  pageGlobal[guardStoreKey] = guards;
}

/** @param {string} guardId */
function removeBeforeUnloadGuard(guardId) {
  const pageGlobal = /** @type {any} */ (globalThis);
  const guardStoreKey = '__sitevisionUtilitiesBeforeUnloadGuards';
  const guards = pageGlobal[guardStoreKey];
  const handler = guards?.get(guardId);
  if (!handler) return false;

  window.removeEventListener('beforeunload', handler);
  guards.delete(guardId);
  if (guards.size === 0) delete pageGlobal[guardStoreKey];
  return true;
}
