import { Logger, getErrorMessage } from '../../../api/index.js';
import { setStatus } from './status.js';
import { runReindexQueue, previewReindexQueue, cancelReindex } from './reindexQueue.js';

export { cancelReindex };

/**
 * Runs a recursive reindex of a Sitevision node tree, reporting progress via the
 * view's log and status badge.
 *
 * @param {number} tabId - ID of the tab containing the Sitevision page.
 * @param {string} origin - Sitevision origin.
 * @param {import('./reindexQueue.js').DiscoveredNode} rootNode - Normalized root node.
 * @param {string} csrfToken - CSRF token from window.bootstrapData.
 * @returns {Promise<void>} Resolves when the operation finishes, is cancelled, or is stopped by the safety limit.
 */
export async function runReindex(tabId, origin, rootNode, csrfToken) {
  const logContainer = document.getElementById('log-container');
  if (!logContainer) return;

  const logger = new Logger(logContainer);
  logger.clear();

  setStatus('running', `Starting tree reindex from root: ${rootNode.id}`);
  logger.log('info', `Target origin: ${origin}`);

  try {
    await runReindexQueue({ tabId, origin, rootNode, csrfToken, logger });
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
 * @returns {Promise<void>} Resolves when the preview finishes, is cancelled, or is stopped by the safety limit.
 */
export async function previewReindex(tabId, origin, rootNode) {
  const logContainer = document.getElementById('log-container');
  if (!logContainer) return;

  const logger = new Logger(logContainer);
  logger.clear();

  setStatus('running', `Previewing tree from root: ${rootNode.id}`);
  logger.log('info', `Target origin: ${origin}`);

  try {
    await previewReindexQueue({ tabId, origin, rootNode, logger });
  } catch (err) {
    logger.log('error', `Preview failed: ${getErrorMessage(err)}`);
    setStatus('error', `Preview failed: ${getErrorMessage(err)}`);
  }
}
