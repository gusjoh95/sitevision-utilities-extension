/** @typedef {{ id: string, type: string, displayName: string, robotsIndex: boolean }} DiscoveredNode */

/**
 * @typedef {Object} ReindexQueueOptions
 * @property {boolean} includeRobotsIndexFalse - Reindex eligible nodes even when robotsIndex is false.
 * @property {number | (() => number)} reindexDelayMs - Delay between Edit API reindex calls.
 * @property {number | (() => number)} apiDelayMs - Delay between REST child-list API calls.
 */

export {};
