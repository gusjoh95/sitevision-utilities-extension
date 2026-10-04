/** @typedef {import('./types.js').DiscoveredNode} DiscoveredNode */

/**
 * @typedef {Object} TreeWalkerParams
 * @property {DiscoveredNode} rootNode - Root node to visit first.
 * @property {(nodeId: string) => Promise<DiscoveredNode[] | null>} getChildren - Resolves direct children, or null when cancelled.
 * @property {() => boolean} isCancelled - Checks whether traversal should stop.
 * @property {(node: DiscoveredNode) => Promise<void> | void} onNode - Handles each node in depth-first order.
 */

/**
 * Walks a node tree depth-first without recursion, skipping already visited node IDs.
 *
 * @param {TreeWalkerParams} params - Traversal callbacks and root node.
 * @returns {Promise<{ reason: 'completed' | 'cancelled' }>} Why the walk stopped.
 */
export async function walkNodeTree({ rootNode, getChildren, isCancelled, onNode }) {
  if (typeof rootNode.id !== 'string') {
    throw new Error('Root node is missing an ID.');
  }

  const visited = new Set([rootNode.id]);
  await onNode(rootNode);
  if (isCancelled()) return { reason: 'cancelled' };

  const rootChildren = await getChildren(rootNode.id);
  if (rootChildren === null || isCancelled()) return { reason: 'cancelled' };

  /** @type {Array<{ children: DiscoveredNode[], index: number }>} */
  const stack = [{ children: rootChildren, index: 0 }];

  while (stack.length > 0) {
    if (isCancelled()) return { reason: 'cancelled' };

    const frame = stack[stack.length - 1];
    if (frame.index >= frame.children.length) {
      stack.pop();
      continue;
    }

    const child = frame.children[frame.index++];
    if (visited.has(child.id)) continue;
    visited.add(child.id);

    await onNode(child);
    if (isCancelled()) return { reason: 'cancelled' };

    const children = await getChildren(child.id);
    if (children === null || isCancelled()) return { reason: 'cancelled' };

    stack.push({ children, index: 0 });
  }

  return { reason: 'completed' };
}
