import {
  BEFORE_UNLOAD_GUARD_CLEANUP_MESSAGE,
  removeBeforeUnloadGuard,
} from '../../api/index.js';

/**
 * Handles beforeunload guard cleanup requests when the owning view exits.
 *
 * @returns {void}
 */
export function registerBeforeUnloadGuardCleanup() {
  browser.runtime.onMessage.addListener((message) => {
    if (message?.type !== BEFORE_UNLOAD_GUARD_CLEANUP_MESSAGE) return undefined;
    if (typeof message.tabId !== 'number' || typeof message.guardId !== 'string') {
      return undefined;
    }

    void removeBeforeUnloadGuard(message.tabId, message.guardId).catch(() => {});
    return undefined;
  });
}