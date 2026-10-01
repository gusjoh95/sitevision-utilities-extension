import { errors, logger } from '../../../api/index.js';
import { BEFORE_UNLOAD_GUARD_MESSAGE } from '../../../background/messages.js';
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
  const installResult = await browser.runtime.sendMessage({
    type: BEFORE_UNLOAD_GUARD_MESSAGE,
    action: 'install',
    tabId,
    guardId,
  });
  if (!installResult?.installed) {
    throw new Error('Could not install the navigation guard in the Sitevision tab.');
  }

  logger.log(
    'info',
    'Navigation guard active: leaving or reloading the Sitevision tab may show a browser confirmation.'
  );

  let isViewExiting = false;
  const handleViewExit = () => {
    isViewExiting = true;
    logger.log('info', 'Re-index view is closing; requesting navigation-guard cleanup.');
    void browser.runtime
      .sendMessage({ type: BEFORE_UNLOAD_GUARD_MESSAGE, action: 'remove', tabId, guardId })
      .catch(() => {});
  };
  window.addEventListener('pagehide', handleViewExit, { once: true });

  try {
    return await operation();
  } finally {
    window.removeEventListener('pagehide', handleViewExit);
    if (!isViewExiting) {
      try {
        const result = await browser.runtime.sendMessage({
          type: BEFORE_UNLOAD_GUARD_MESSAGE,
          action: 'remove',
          tabId,
          guardId,
        });
        if (result?.removed) {
          logger.log('info', 'Navigation guard removed from the Sitevision tab.');
        } else {
          logger.log('warn', 'Navigation guard cleanup could not find the active guard.');
        }
      } catch (err) {
        logger.log('error', `Navigation guard cleanup failed: ${errors.messageOf(err)}`);
      }
    }
  }
}

/**
 * Creates the view logger, announces an operation, and shares its error handling.
 *
 * @param {number} tabId - ID of the Sitevision tab.
 * @param {string} origin - Sitevision origin.
 * @param {import('./types.js').DiscoveredNode} rootNode - Normalized root node.
 * @param {string} startingMessage - Operation-specific starting status.
 * @param {string} errorPrefix - Operation-specific error message prefix.
 * @param {(logger: import('../../../api/types.js').Logger) => Promise<unknown>} operation
 * @returns {Promise<void>}
 */
async function runLoggedOperation(
  tabId,
  origin,
  rootNode,
  startingMessage,
  errorPrefix,
  operation
) {
  const logContainer = document.getElementById('log-container');
  if (!logContainer) return;

  const loggerInstance = logger.create(logContainer);
  loggerInstance.clear();
  setStatus('running', startingMessage);
  loggerInstance.log('info', `Target origin: ${origin}`);

  try {
    await operation(loggerInstance);
  } catch (err) {
    const message = `${errorPrefix}: ${errors.messageOf(err)}`;
    loggerInstance.log('error', message);
    setStatus('error', message);
  }
}

/**
 * Runs a recursive reindex of a Sitevision node tree, reporting progress via the
 * view's log and status badge.
 *
 * @param {number} tabId - ID of the tab containing the Sitevision page.
 * @param {string} origin - Sitevision origin.
 * @param {import('./types.js').DiscoveredNode} rootNode - Normalized root node.
 * @param {string} csrfToken - CSRF token from window.bootstrapData.
 * @param {import('./types.js').ReindexQueueOptions} options - Queue settings.
 * @returns {Promise<void>} Resolves when the operation finishes or is cancelled.
 */
export async function runReindex(tabId, origin, rootNode, csrfToken, options) {
  await runLoggedOperation(
    tabId,
    origin,
    rootNode,
    `Starting tree reindex from root: ${rootNode.id}`,
    'Reindex failed',
    (logger) =>
      withBeforeUnloadGuard(tabId, logger, () =>
        runReindexQueue({ tabId, origin, rootNode, csrfToken, logger, ...options })
      )
  );
}

/**
 * Walks a Sitevision node tree without reindexing anything, reporting which nodes would be
 * reindexed. Uses the same REST listing calls as `runReindex`, just skips the Edit API step.
 *
 * @param {number} tabId - ID of the tab containing the Sitevision page.
 * @param {string} origin - Sitevision origin.
 * @param {import('./types.js').DiscoveredNode} rootNode - Normalized root node.
 * @param {import('./types.js').ReindexQueueOptions} options - Queue settings.
 * @returns {Promise<void>} Resolves when the preview finishes or is cancelled.
 */
export async function previewReindex(tabId, origin, rootNode, options) {
  await runLoggedOperation(
    tabId,
    origin,
    rootNode,
    `Previewing tree from root: ${rootNode.id}`,
    'Preview failed',
    (logger) =>
      withBeforeUnloadGuard(tabId, logger, () =>
        previewReindexQueue({ tabId, origin, rootNode, logger, ...options })
      )
  );
}
