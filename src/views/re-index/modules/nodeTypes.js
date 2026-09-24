/**
 * Node types requested from the REST API when listing a node's children during reindex.
 * Extend this list as more content types need to be reachable during traversal.
 *
 * @type {string[]}
 */
export const TRAVERSABLE_NODE_TYPES = [
  'sv:site',
  'sv:sitePage',
  'sv:page',
  'sv:archive',
  'sv:article',
  'sv:folder',
];

/**
 * Node types that can actually be reindexed. sv:archive and sv:folder are pure containers -
 * they must be traversed to reach their children, but reindexNode can't be called on them.
 *
 * @type {string[]}
 */
export const INDEXABLE_NODE_TYPES = ['sv:site', 'sv:sitePage', 'sv:page', 'sv:article'];
