import {
  BEFORE_UNLOAD_GUARD_CLEANUP_MESSAGE,
  getErrorMessage,
  installBeforeUnloadGuard,
  Logger,
  removeBeforeUnloadGuard,
} from '../../../api/index.js';
import { setStatus } from './status.js';
import { runReindexQueue, previewReindexQueue, cancelReindex } from './reindexQueue.js';

export { cancelReindex };

/**
 * Keeps the user from accidentally leaving the target tab while a re-index operation is active.
 *
 * @template T
 * @param {number} tabId - ID of the Sitevision tab.
 * @param {import('../../../api/types.js').Logger} logger - View logger for guard lifecycle messages.
 * @param {() => Promise<T>} operation - The operation protected by the guard.
 * @returns {Promise<T>}
 */
async function withBeforeUnloadGuard(tabId, logger, operation) {
  const guardId = crypto.randomUUID();
  await installBeforeUnloadGuard(tabId, guardId);
  logger.log(
    'info',
    'Navigation guard active: leaving or reloading the Sitevision tab may show a browser confirmation.'
  );

  const handleViewExit = () => {
    logger.log('info', 'Re-index view is closing; requesting navigation-guard cleanup.');
    void browser.runtime
      .sendMessage({ type: BEFORE_UNLOAD_GUARD_CLEANUP_MESSAGE, tabId, guardId })
      .catch(() => {});
  };
  window.addEventListener('pagehide', handleViewExit, { once: true });

  try {
    return await operation();
  } finally {
    window.removeEventListener('pagehide', handleViewExit);
    try {
      await removeBeforeUnloadGuard(tabId, guardId);
      logger.log('info', 'Navigation guard removed from the Sitevision tab.');
    } catch {
      // The target page may already have navigated, in which case its guard is gone with it.
    }
  }
}

/**
 * Runs a recursive reindex of a Sitevision node tree, reporting progress via the
 * view's log and status badge.
 *
 * @param {number} tabId - ID of the tab containing the Sitevision page.
 * @param {string} origin - Sitevision origin.
 * @param {import('./reindexQueue.js').DiscoveredNode} rootNode - Normalized root node.
 * @param {string} csrfToken - CSRF token from window.bootstrapData.
 * @param {import('./reindexQueue.js').ReindexQueueOptions} options - Queue settings.
 * @returns {Promise<void>} Resolves when the operation finishes or is cancelled.
 */
export async function runReindex(tabId, origin, rootNode, csrfToken, options) {
  const logContainer = document.getElementById('log-container');
  if (!logContainer) return;

  const logger = new Logger(logContainer);
  logger.clear();

  setStatus('running', `Starting tree reindex from root: ${rootNode.id}`);
  logger.log('info', `Target origin: ${origin}`);

  try {
    await withBeforeUnloadGuard(tabId, logger, () =>
      runReindexQueue({ tabId, origin, rootNode, csrfToken, logger, ...options })
    );
  } catch (err) {
    logger.log('error', `Reindex failed: ${getErrorMessage(err)}`);
    setStatus('error', `Reindex failed: ${getErrorMessage(err)}`);
  }
}

/**
 * Walks a Sitevision node tree without reindexing anything, reporting which nodes would be
 * reindexed. Uses the same REST listing calls as `runReindex`, just skips the Edit API step.
 *
 * @param {number} tabId - ID of the tab containing the Sitevision page.
 * @param {string} origin - Sitevision origin.
 * @param {import('./reindexQueue.js').DiscoveredNode} rootNode - Normalized root node.
 * @param {import('./reindexQueue.js').ReindexQueueOptions} options - Queue settings.
 * @returns {Promise<void>} Resolves when the preview finishes or is cancelled.
 */
export async function previewReindex(tabId, origin, rootNode, options) {
  const logContainer = document.getElementById('log-container');
  if (!logContainer) return;

  const logger = new Logger(logContainer);
  logger.clear();

  setStatus('running', `Previewing tree from root: ${rootNode.id}`);
  logger.log('info', `Target origin: ${origin}`);

  try {
    await withBeforeUnloadGuard(tabId, logger, () =>
      previewReindexQueue({ tabId, origin, rootNode, logger, ...options })
    );
  } catch (err) {
    logger.log('error', `Preview failed: ${getErrorMessage(err)}`);
    setStatus('error', `Preview failed: ${getErrorMessage(err)}`);
  }
}
