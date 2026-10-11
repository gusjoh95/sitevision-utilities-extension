/** @type {string[]} */
export const TRAVERSABLE_NODE_TYPES = [
  'sv:site',
  'sv:sitePage',
  'sv:page',
  'sv:structurePage',
  'sv:collaborationGroupPage',
  'sv:archive',
  'sv:article',
  'sv:folder',
  'sv:imageRepository',
  'sv:fileRepository',
];

/**
 * Node types that can actually be reindexed. Container and repository types are traversal-only.
 *
 * @type {string[]}
 */
export const INDEXABLE_NODE_TYPES = [
  'sv:sitePage',
  'sv:page',
  'sv:structurePage',
  'sv:collaborationGroupPage',
  'sv:article',
  'sv:image',
  'sv:file',
];

/**
 * Node types requested from the REST API when listing a node's children.
 *
 * @type {string[]}
 */
export const DISCOVERABLE_NODE_TYPES = [
  ...new Set([...TRAVERSABLE_NODE_TYPES, ...INDEXABLE_NODE_TYPES]),
];
