import { reindexSingleNode } from './editApi.js';
import { fetchRestSubNodes } from './restApi.js';
import { INDEXABLE_NODE_TYPES, TRAVERSABLE_NODE_TYPES } from './nodeTypes.js';
import { setStatus } from './status.js';

/** @typedef {{ id: string, type: string, displayName: string, robotsIndex: boolean }} DiscoveredNode */

const SAFETY_LIMIT = 200;
const NODE_DELAY_MS = 125;
let isCancelled = false;

/**
 * Cache of the last completed preview, reused by `runReindexQueue` so a real run can replay the
 * exact list the user was shown instead of re-walking the tree. Invalidated after being consumed
 * once, and whenever a preview doesn't fully complete (cancelled or safety-limited).
 *
 * @type {{ tabId: number, origin: string, rootNodeId: string, nodes: DiscoveredNode[] } | null}
 */
let cachedPreview = null;

/**
 * Requests cancellation of the active reindex operation.
 *
 * @returns {void}
 */
export function cancelReindex() {
  isCancelled = true;
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
 * @typedef {Object} ReindexQueueParams
 * @property {number} tabId - ID of the tab containing the Sitevision page.
 * @property {string} origin - Sitevision origin.
 * @property {DiscoveredNode} rootNode - Normalized root node.
 * @property {string} csrfToken - CSRF token required by the Edit API.
 * @property {import('../../../api/modules/logger.js').default} logger - Logger for diagnostic output.
 */

/**
 * Fetches a node's children (restricted to `TRAVERSABLE_NODE_TYPES`) as `{ id, type, displayName, robotsIndex }`.
 *
 * @param {number} tabId - ID of the tab in which the request runs.
 * @param {string} origin - Sitevision origin.
 * @param {string} nodeId - Node whose children should be resolved.
 * @returns {Promise<DiscoveredNode[]>} The direct child nodes.
 */
async function getChildNodes(tabId, origin, nodeId) {
  const subNodes = await fetchRestSubNodes(tabId, origin, nodeId, TRAVERSABLE_NODE_TYPES);
  return subNodes.map(normalizeNode);
}

/**
 * Converts REST node data into the metadata used by the re-index queue.
 *
 * @param {import('./restApi.js').RestNode} node - Raw child node data from the REST API.
 * @returns {DiscoveredNode} Normalized queue node.
 */
function normalizeNode(node) {
  return {
    id: node.id,
    type: node.type,
    displayName: node.properties?.displayName ?? '',
    robotsIndex: node.properties?.robotsIndex !== false,
  };
}

/**
 * Determines whether a node should actually be reindexed, as opposed to only traversed for
 * its children. Requires both an indexable type and `robotsIndex` not explicitly disabled.
 *
 * @param {{ type: string, robotsIndex: boolean }} node - Node to check.
 * @returns {boolean} True if `reindexSingleNode` should be called for this node.
 */
function isIndexable(node) {
  return INDEXABLE_NODE_TYPES.includes(node.type) && node.robotsIndex;
}

/**
 * Reindexes a node if it's indexable, otherwise just logs that it's being skipped.
 *
 * @param {number} tabId - ID of the tab in which the request runs.
 * @param {string} origin - Sitevision origin.
 * @param {DiscoveredNode} node - Node to conditionally reindex.
 * @param {string} csrfToken - CSRF token required by the Edit API.
 * @param {import('../../../api/modules/logger.js').default} logger - Logger for diagnostic output.
 * @returns {Promise<boolean>} True if the node was actually reindexed.
 */
async function maybeReindexNode(tabId, origin, node, csrfToken, logger) {
  if (!isIndexable(node)) {
    logger.log(
      'info',
      `Skipping ${node.displayName} (${node.id}, ${node.type}), traversing children...`
    );
    return false;
  }

  logger.log('info', `Reindexing ${node.displayName} (${node.id}, ${node.type})...`);
  await reindexSingleNode(tabId, origin, node.id, csrfToken);
  logger.append('-> OK');
  return true;
}

/**
 * @typedef {Object} WalkTreeParams
 * @property {number} tabId - ID of the tab containing the Sitevision page.
 * @property {string} origin - Sitevision origin.
 * @property {DiscoveredNode} rootNode - Normalized root node.
 * @property {import('../../../api/modules/logger.js').default} logger - Logger for diagnostic output.
 * @property {(node: DiscoveredNode) => Promise<void> | void} onNode - Invoked once per discovered node, in traversal order.
 */

/**
 * Depth-first walk of the node tree, shared by `runReindexQueue` (which reindexes indexable
 * nodes via `onNode`) and `previewReindexQueue` (which only records them via `onNode`).
 *
 * Depth-first mirrors how the Sitevision edit GUI's tree is browsed, which makes it easier for
 * a user to figure out where to restart from if they need to reposition themselves in the tree.
 *
 * @param {WalkTreeParams} params - Traversal parameters.
 * @returns {Promise<{ reason: 'completed' | 'cancelled' | 'limit' }>} Why the walk stopped.
 */
async function walkReindexTree({ tabId, origin, rootNode, logger, onNode }) {
  if (typeof rootNode.id !== 'string') {
    throw new Error('Root node is missing an ID.');
  }

  const rootNodeId = rootNode.id;
  const visited = new Set();
  visited.add(rootNodeId);
  let visitedCount = 1;
  /** @type {'cancelled' | 'limit' | null} */
  let stopReason = null;

  /**
   * @param {string} nodeId - Node whose children should be visited, depth-first.
   * @returns {Promise<void>}
   */
  async function visitChildren(nodeId) {
    const children = await getChildNodes(tabId, origin, nodeId);

    for (const child of children) {
      if (stopReason) return;

      if (isCancelled) {
        stopReason = 'cancelled';
        return;
      }

      if (visited.has(child.id)) continue;

      if (visitedCount >= SAFETY_LIMIT) {
        const message = `Safety limit reached: stopped after ${SAFETY_LIMIT} nodes.`;
        logger.log('error', message);
        setStatus('error', message);
        stopReason = 'limit';
        return;
      }

      visited.add(child.id);
      visitedCount++;

      await onNode(child);
      await waitBetweenNodes();

      await visitChildren(child.id);
      if (stopReason) return;
    }
  }

  await onNode(rootNode);

  if (isCancelled) {
    return { reason: 'cancelled' };
  }

  await waitBetweenNodes();
  await visitChildren(rootNodeId);

  return { reason: stopReason ?? 'completed' };
}

/**
 * Runs a depth-first reindex of a Sitevision node tree.
 *
 * If a completed preview for the same tab/origin/root is cached, that discovered node list is
 * replayed directly instead of re-walking the tree, so a user can trust that what they previewed
 * is exactly what gets reindexed. Sub nodes are otherwise listed via the REST API (online
 * version); reindexing itself still goes through the internal Edit API. Container types
 * (sv:archive, sv:folder) and nodes with `robotsIndex: false` are traversed for their children
 * but are never reindexed themselves.
 *
 * @param {ReindexQueueParams} params - Traversal parameters.
 * @returns {Promise<void>} Resolves when the operation finishes, is cancelled, or is stopped by the safety limit.
 */
export async function runReindexQueue({ tabId, origin, rootNode, csrfToken, logger }) {
  if (typeof rootNode.id !== 'string') {
    throw new Error('Root node is missing an ID.');
  }

  const rootNodeId = rootNode.id;
  isCancelled = false;

  const preview =
    cachedPreview?.tabId === tabId &&
    cachedPreview?.origin === origin &&
    cachedPreview?.rootNodeId === rootNodeId
      ? cachedPreview
      : null;
  cachedPreview = null;

  let processedCount = 0;
  /** @type {'completed' | 'cancelled' | 'limit'} */
  let reason;

  if (preview) {
    logger.log(
      'info',
      `Reusing preview: reindexing ${preview.nodes.length} previously discovered nodes...`
    );
    reason = 'completed';

    for (const node of preview.nodes) {
      if (isCancelled) {
        reason = 'cancelled';
        break;
      }

      if (await maybeReindexNode(tabId, origin, node, csrfToken, logger)) {
        processedCount++;
        setStatus('running', `Reindexed ${processedCount} subnodes...`);
      }

      await waitBetweenNodes();
    }
  } else {
    logger.log('info', `Fetching subnodes of root ${rootNodeId}...`);

    ({ reason } = await walkReindexTree({
      tabId,
      origin,
      rootNode,
      logger,
      onNode: async (node) => {
        if (await maybeReindexNode(tabId, origin, node, csrfToken, logger)) {
          processedCount++;
          setStatus('running', `Reindexed ${processedCount} subnodes...`);
        }
      },
    }));
  }

  if (reason === 'cancelled') {
    logger.log('warn', 'Reindex operation cancelled by user.');
    setStatus('warn', `Cancelled. Processed ${processedCount} nodes.`);
    return;
  }
  if (reason === 'limit') {
    return;
  }

  logger.log('success', `Finished! Successfully processed ${processedCount} subnodes.`);
  setStatus('success', `Completed. Reindexed ${processedCount} subnodes.`);
}

/**
 * @typedef {Object} PreviewQueueParams
 * @property {number} tabId - ID of the tab containing the Sitevision page.
 * @property {string} origin - Sitevision origin.
 * @property {DiscoveredNode} rootNode - Normalized root node.
 * @property {import('../../../api/modules/logger.js').default} logger - Logger for diagnostic output.
 */

/**
 * Walks the node tree without reindexing anything, reporting every node that `runReindexQueue`
 * would visit and whether it would actually be reindexed. Costs the same number of REST list
 * calls as a real run - only the Edit API reindex calls are skipped.
 *
 * When the walk completes fully, the discovered node list is cached so a subsequent
 * `runReindexQueue` call for the same tab/origin/root replays it exactly instead of re-walking.
 *
 * @param {PreviewQueueParams} params - Traversal parameters.
 * @returns {Promise<{ nodes: DiscoveredNode[], reason: 'completed' | 'cancelled' | 'limit' }>} Discovered nodes and why the walk stopped.
 */
export async function previewReindexQueue({ tabId, origin, rootNode, logger }) {
  if (typeof rootNode.id !== 'string') {
    throw new Error('Root node is missing an ID.');
  }

  const rootNodeId = rootNode.id;
  isCancelled = false;
  cachedPreview = null;
  logger.log('info', `Previewing reindex tree from root ${rootNodeId}...`);

  /** @type {DiscoveredNode[]} */
  const nodes = [];

  const { reason } = await walkReindexTree({
    tabId,
    origin,
    rootNode,
    logger,
    onNode: (node) => {
      nodes.push(node);
      logger.log(
        'info',
        `${isIndexable(node) ? '[index]' : '[skip] '} ${node.displayName} (${node.id}, ${node.type})`
      );
    },
  });

  const indexableCount = nodes.filter(isIndexable).length;

  if (reason === 'cancelled') {
    logger.log('warn', 'Preview cancelled by user.');
    setStatus('warn', `Preview cancelled. Discovered ${nodes.length} nodes.`);
  } else if (reason === 'completed') {
    cachedPreview = { tabId, origin, rootNodeId, nodes };
    logger.log(
      'success',
      `Preview complete: ${indexableCount} of ${nodes.length} discovered nodes would be reindexed.`
    );
    setStatus('idle', `Preview: ${indexableCount} of ${nodes.length} nodes would be reindexed.`);
  }

  return { nodes, reason };
}
