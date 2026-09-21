import { fetchInTabContext, getErrorMessage, getRequiredElement } from '../../../api/index.js';
import Logger from '../../find-login/modules/logger.js';

const SAFETY_LIMIT = 200;
const NODE_DELAY_MS = 125;
let isCancelled = false;

/**
 * Requests cancellation of the active reindex operation.
 *
 * @returns {void}
 */
export function cancelReindex() {
  isCancelled = true;
}

/**
 * Updates the status badge and summary text in the reindex view.
 *
 * @param {'idle' | 'running' | 'success' | 'warn' | 'error'} state - Status state.
 * @param {string} message - Summary message to display.
 * @returns {void}
 */
export function setStatus(state, message) {
  const summaryText = getRequiredElement('#summary-text');
  const badge = getRequiredElement('#status-summary').querySelector('.badge');

  if (summaryText) summaryText.textContent = message;
  if (badge) {
    badge.className = `badge badge-${state}`;
    badge.textContent = state.toUpperCase();
  }
}

/** @typedef {{key?: string}} SitevisionSubNode */

/**
 * Fetches subnodes from the Sitevision Edit API.
 *
 * @param {number} tabId - ID of the tab in which the request runs.
 * @param {string} origin - Sitevision origin.
 * @param {string} nodeId - Node whose children should be fetched.
 * @returns {Promise<SitevisionSubNode[]>} The direct child nodes.
 */
async function fetchSubNodes(tabId, origin, nodeId) {
  const timestamp = Date.now();
  const url = `${origin}/edit-api/1/${nodeId}/${nodeId}/navigationTreeSubNodes?_=${timestamp}`;

  const res = await fetchInTabContext(tabId, url, { reqOptions: { method: 'GET' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} when fetching subnodes`);

  const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
  return Array.isArray(data) ? data : [];
}

/**
 * Triggers reindex on a single node via the Sitevision Edit API.
 *
 * @param {number} tabId - ID of the tab in which the request runs.
 * @param {string} origin - Sitevision origin.
 * @param {string} nodeId - Node to reindex.
 * @param {string} csrfToken - CSRF token required by the Edit API.
 * @returns {Promise<import('../../../api/modules/fetchInTabContext.js').FetchInTabResult>} The API response.
 */
async function reindexSingleNode(tabId, origin, nodeId, csrfToken) {
  const url = `${origin}/edit-api/1/${nodeId}/${nodeId}/reindexNode/${nodeId}`;

  const res = await fetchInTabContext(tabId, url, {
    reqOptions: {
      method: 'PUT',
      headers: { 'x-csrf-token': csrfToken },
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} when reindexing node`);

  return res;
}

/**
 * Waits for the configured delay unless cancellation has been requested.
 *
 * @returns {Promise<void>} Resolves after the delay or immediately on cancellation.
 */
async function waitBetweenNodes() {
  await new Promise((resolve) => setTimeout(resolve, NODE_DELAY_MS));
}

/**
 * Executes a recursive breadth-first reindex of a Sitevision node tree.
 *
 * @param {number} tabId - ID of the tab containing the Sitevision page.
 * @param {string} origin - Sitevision origin.
 * @param {string} rootNodeId - ID of the root node to reindex.
 * @param {string} csrfToken - CSRF token from window.bootstrapData.
 * @returns {Promise<void>} Resolves when the operation finishes, is cancelled, or is stopped by the safety limit.
 */
export async function runReindex(tabId, origin, rootNodeId, csrfToken) {
  isCancelled = false;
  const logContainer = document.getElementById('log-container');
  if (!logContainer) return;

  const logger = new Logger(logContainer);
  logger.clear();

  setStatus('running', `Starting tree reindex from root: ${rootNodeId}`);
  logger.log('info', `Target origin: ${origin}`);

  try {
    logger.log('info', `Fetching subnodes of root ${rootNodeId}...`);
    const rootSubNodes = await fetchSubNodes(tabId, origin, rootNodeId);
    const queue = rootSubNodes
      .map((child) => child.key)
      .filter((key) => typeof key === 'string');

    if (queue.length > SAFETY_LIMIT) {
      const message = `Safety limit reached: root contains more than ${SAFETY_LIMIT} subnodes.`;
      logger.log('error', message);
      setStatus('error', message);
      return;
    }

    const visited = new Set();
    let processedCount = 0;
    let scheduledCount = queue.length;

    while (queue.length > 0) {
      if (isCancelled) {
        logger.log('warn', 'Reindex operation cancelled by user.');
        setStatus('warn', `Cancelled. Processed ${processedCount} nodes.`);
        return;
      }

      if (processedCount >= SAFETY_LIMIT) {
        const message = `Safety limit reached: stopped after ${SAFETY_LIMIT} nodes.`;
        logger.log('error', message);
        setStatus('error', message);
        return;
      }

      const currentNodeId = queue.shift();
      if (typeof currentNodeId !== 'string' || visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);

      logger.log('info', `[${processedCount + 1}] Reindexing ${currentNodeId}...`);
      await reindexSingleNode(tabId, origin, currentNodeId, csrfToken);
      logger.append('-> OK');
      processedCount++;
      setStatus('running', `Reindexed ${processedCount} subnodes...`);

      const subNodes = await fetchSubNodes(tabId, origin, currentNodeId);
      for (const child of subNodes) {
        if (child.key && !visited.has(child.key) && !queue.includes(child.key)) {
          if (scheduledCount >= SAFETY_LIMIT) {
            const message = `Safety limit reached: no more than ${SAFETY_LIMIT} nodes may run in one operation.`;
            logger.log('error', message);
            setStatus('error', message);
            return;
          }
          queue.push(child.key);
          scheduledCount++;
        }
      }

      await waitBetweenNodes();
    }

    logger.log('success', `Finished! Successfully processed ${processedCount} subnodes.`);
    setStatus('success', `Completed. Reindexed ${processedCount} subnodes.`);
  } catch (err) {
    logger.log('error', `Reindex failed: ${getErrorMessage(err)}`);
    setStatus('error', `Reindex failed: ${getErrorMessage(err)}`);
  }
}
