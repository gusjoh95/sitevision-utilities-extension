import { reindexSingleNode } from './editApi.js';
import { fetchRestSubNodes } from './restApi.js';
import { INDEXABLE_NODE_TYPES, TRAVERSABLE_NODE_TYPES } from './nodeTypes.js';
import { setStatus } from './status.js';
import { walkNodeTree } from './treeWalker.js';

/** @typedef {import('./types.js').DiscoveredNode} DiscoveredNode */
/** @typedef {import('./types.js').ReindexQueueOptions} ReindexQueueOptions */

export const DEFAULT_REINDEX_DELAY_MS = 125;
export const DEFAULT_API_DELAY_MS = 125;
let isCancelled = false;

/**
 * Cache of the last completed preview, reused by `runReindexQueue` so a real run can replay the
 * exact list the user was shown instead of re-walking the tree. Invalidated after being consumed
 * once, and whenever a preview is cancelled.
 *
 * @type {{ tabId: number, origin: string, rootNodeId: string, includeRobotsIndexFalse: boolean, nodes: DiscoveredNode[] } | null}
 */
let cachedPreview = null;

/**
 * Creates a wait function that delays every call after the first one.
 *
 * @param {number | (() => number)} delayMs - Delay in milliseconds, or a getter for a live value.
 * @returns {() => Promise<boolean>} Waits between calls, or returns false when cancelled.
 */
function createCallDelay(delayMs) {
  let isFirstCall = true;

  return async () => {
    if (isCancelled) return false;

    if (isFirstCall) {
      isFirstCall = false;
      return true;
    }

    const startedAt = performance.now();
    while (!isCancelled) {
      const currentDelayMs = typeof delayMs === 'function' ? delayMs() : delayMs;
      const delay = Number.isFinite(currentDelayMs) ? Math.max(0, currentDelayMs) : 0;
      const remainingMs = delay - (performance.now() - startedAt);

      if (remainingMs <= 0) return true;

      await new Promise((resolve) => setTimeout(resolve, Math.min(remainingMs, 50)));
    }

    return false;
  };
}

/**
 * Requests cancellation of the active reindex operation.
 *
 * @returns {void}
 */
export function cancelReindex() {
  isCancelled = true;
}

/**
 * @typedef {Object} ReindexQueueParams
 * @property {number} tabId - ID of the tab containing the Sitevision page.
 * @property {string} origin - Sitevision origin.
 * @property {DiscoveredNode} rootNode - Normalized root node.
 * @property {string} csrfToken - CSRF token required by the Edit API.
 * @property {import('../../../api/types.js').Logger} logger - Logger for diagnostic output.
 * @property {boolean} includeRobotsIndexFalse - Reindex eligible nodes even when robotsIndex is false.
 * @property {number | (() => number)} reindexDelayMs - Delay between Edit API reindex calls.
 * @property {number | (() => number)} apiDelayMs - Delay between REST child-list API calls.
 */

/**
 * Fetches a node's children (restricted to `TRAVERSABLE_NODE_TYPES`) as `{ id, type, displayName, robotsIndex }`.
 *
 * @param {number} tabId - ID of the tab in which the request runs.
 * @param {string} origin - Sitevision origin.
 * @param {string} nodeId - Node whose children should be resolved.
 * @param {() => Promise<boolean>} waitBeforeApiCall - Paces REST calls and reports cancellation.
 * @returns {Promise<DiscoveredNode[] | null>} The direct child nodes, or null when cancelled.
 */
async function getChildNodes(tabId, origin, nodeId, waitBeforeApiCall) {
  if (!(await waitBeforeApiCall())) return null;
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
 * its children. Requires an indexable type and, unless overridden, `robotsIndex` not explicitly disabled.
 *
 * @param {{ type: string, robotsIndex: boolean }} node - Node to check.
 * @param {boolean} includeRobotsIndexFalse - Whether to override a false robotsIndex value.
 * @returns {boolean} True if `reindexSingleNode` should be called for this node.
 */
function isIndexable(node, includeRobotsIndexFalse = false) {
  return INDEXABLE_NODE_TYPES.includes(node.type) && (node.robotsIndex || includeRobotsIndexFalse);
}

/**
 * Reindexes a node if it's indexable, otherwise just logs that it's being skipped.
 *
 * @param {number} tabId - ID of the tab in which the request runs.
 * @param {string} origin - Sitevision origin.
 * @param {DiscoveredNode} node - Node to conditionally reindex.
 * @param {string} csrfToken - CSRF token required by the Edit API.
 * @param {import('../../../api/types.js').Logger} logger - Logger for diagnostic output.
 * @param {boolean} includeRobotsIndexFalse - Whether to override a false robotsIndex value.
 * @param {() => Promise<boolean>} waitBeforeReindexCall - Paces Edit API calls and reports cancellation.
 * @returns {Promise<boolean>} True if the node was actually reindexed.
 */
async function maybeReindexNode(
  tabId,
  origin,
  node,
  csrfToken,
  logger,
  includeRobotsIndexFalse,
  waitBeforeReindexCall
) {
  if (!isIndexable(node, includeRobotsIndexFalse)) {
    logger.log(
      'info',
      `Skipping ${node.displayName} (${node.id}, ${node.type}), traversing children...`
    );
    return false;
  }

  if (!(await waitBeforeReindexCall())) return false;
  logger.log('info', `Reindexing ${node.displayName} (${node.id}, ${node.type})...`);
  await reindexSingleNode(tabId, origin, node.id, csrfToken);
  logger.append('-> OK');
  return true;
}

/**
 * Runs a depth-first reindex of a Sitevision node tree.
 *
 * If a completed preview for the same tab/origin/root is cached, that discovered node list is
 * replayed directly instead of re-walking the tree, so a user can trust that what they previewed
 * is exactly what gets reindexed. Sub nodes are otherwise listed via the REST API (online
 * version); reindexing itself still goes through the internal Edit API. Container types
 * (sv:archive, sv:folder) and nodes with `robotsIndex: false` are traversed for their children
 * but are never reindexed themselves. Nodes with `robotsIndex: false` are skipped unless the
 * caller enables the override.
 *
 * @param {ReindexQueueParams} params - Traversal parameters.
 * @returns {Promise<void>} Resolves when the operation finishes or is cancelled.
 */
export async function runReindexQueue({
  tabId,
  origin,
  rootNode,
  csrfToken,
  logger,
  includeRobotsIndexFalse = false,
  reindexDelayMs = DEFAULT_REINDEX_DELAY_MS,
  apiDelayMs = DEFAULT_API_DELAY_MS,
}) {
  if (typeof rootNode.id !== 'string') {
    throw new Error('Root node is missing an ID.');
  }

  const rootNodeId = rootNode.id;
  isCancelled = false;

  const preview =
    cachedPreview?.tabId === tabId &&
    cachedPreview?.origin === origin &&
    cachedPreview?.rootNodeId === rootNodeId &&
    cachedPreview?.includeRobotsIndexFalse === includeRobotsIndexFalse
      ? cachedPreview
      : null;
  cachedPreview = null;

  let processedCount = 0;
  let indexedCount = 0;
  const waitBeforeReindexCall = createCallDelay(reindexDelayMs);
  const waitBeforeApiCall = createCallDelay(apiDelayMs);
  /** @type {'completed' | 'cancelled'} */
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

      const wasIndexed = await maybeReindexNode(
        tabId,
        origin,
        node,
        csrfToken,
        logger,
        includeRobotsIndexFalse,
        waitBeforeReindexCall
      );
      if (isCancelled) {
        reason = 'cancelled';
        break;
      }
      if (wasIndexed) {
        indexedCount++;
      }
      processedCount++;
      setStatus('running', `Processed ${processedCount} nodes; indexed ${indexedCount}...`);
    }
  } else {
    logger.log('info', `Fetching subnodes of root ${rootNodeId}...`);

    ({ reason } = await walkNodeTree({
      rootNode,
      getChildren: (nodeId) => getChildNodes(tabId, origin, nodeId, waitBeforeApiCall),
      isCancelled: () => isCancelled,
      onNode: async (node) => {
        const wasIndexed = await maybeReindexNode(
          tabId,
          origin,
          node,
          csrfToken,
          logger,
          includeRobotsIndexFalse,
          waitBeforeReindexCall
        );
        if (isCancelled) return;
        if (wasIndexed) {
          indexedCount++;
        }
        processedCount++;
        setStatus('running', `Processed ${processedCount} nodes; indexed ${indexedCount}...`);
      },
    }));
  }

  if (reason === 'cancelled') {
    logger.log('warn', 'Reindex operation cancelled by user.');
    setStatus('warn', `Cancelled. Processed ${processedCount} nodes; indexed ${indexedCount}.`);
    return;
  }
  logger.log('success', `Finished! Processed ${processedCount} nodes; indexed ${indexedCount}.`);
  setStatus('success', `Completed. Processed ${processedCount} nodes; indexed ${indexedCount}.`);
}

/**
 * @typedef {Object} PreviewQueueParams
 * @property {number} tabId - ID of the tab containing the Sitevision page.
 * @property {string} origin - Sitevision origin.
 * @property {DiscoveredNode} rootNode - Normalized root node.
 * @property {import('../../../api/types.js').Logger} logger - Logger for diagnostic output.
 * @property {boolean} includeRobotsIndexFalse - Include eligible nodes with robotsIndex false.
 * @property {number | (() => number)} apiDelayMs - Delay between REST child-list API calls.
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
 * @returns {Promise<{ nodes: DiscoveredNode[], reason: 'completed' | 'cancelled' }>} Discovered nodes and why the walk stopped.
 */
export async function previewReindexQueue({
  tabId,
  origin,
  rootNode,
  logger,
  includeRobotsIndexFalse = false,
  apiDelayMs = DEFAULT_API_DELAY_MS,
}) {
  if (typeof rootNode.id !== 'string') {
    throw new Error('Root node is missing an ID.');
  }

  const rootNodeId = rootNode.id;
  isCancelled = false;
  cachedPreview = null;
  logger.log('info', `Previewing reindex tree from root ${rootNodeId}...`);

  /** @type {DiscoveredNode[]} */
  const nodes = [];
  const waitBeforeApiCall = createCallDelay(apiDelayMs);

  const { reason } = await walkNodeTree({
    rootNode,
    getChildren: (nodeId) => getChildNodes(tabId, origin, nodeId, waitBeforeApiCall),
    isCancelled: () => isCancelled,
    onNode: (node) => {
      nodes.push(node);
      logger.log(
        'info',
        `${isIndexable(node, includeRobotsIndexFalse) ? '[index]' : '[skip] '} ${node.displayName} (${node.id}, ${node.type})`
      );
    },
  });

  const indexableCount = nodes.filter((node) => isIndexable(node, includeRobotsIndexFalse)).length;

  if (reason === 'cancelled') {
    logger.log('warn', 'Preview cancelled by user.');
    setStatus('warn', `Preview cancelled. Discovered ${nodes.length} nodes.`);
  } else if (reason === 'completed') {
    cachedPreview = { tabId, origin, rootNodeId, includeRobotsIndexFalse, nodes };
    logger.log(
      'success',
      `Preview complete: ${indexableCount} of ${nodes.length} discovered nodes would be reindexed.`
    );
    setStatus('idle', `Preview: ${indexableCount} of ${nodes.length} nodes would be reindexed.`);
  }

  return { nodes, reason };
}
