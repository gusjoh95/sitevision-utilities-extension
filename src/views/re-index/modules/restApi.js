import { fetchInTabContext } from '../../../api/index.js';

/** Model version segment for published/online content (see Sitevision REST API docs). */
const ONLINE_MODEL_VERSION = '1';

/** @typedef {{ id: string, type: string, properties?: { robotsIndex?: boolean, displayName?: string } }} RestNode */

/**
 * Fetches the direct child nodes of a node via the Sitevision Model REST API.
 *
 * GET requests with complex input can't carry a body in the browser, so the input JSON is
 * passed as a query param instead: `?format=json&json=<encodeURIComponent(JSON.stringify(input))>`.
 * Requests the `robotsIndex` and `displayName` properties alongside each node so callers can
 * skip reindexing excluded nodes and show a readable name without an extra edit-api round trip.
 *
 * @param {number} tabId - ID of the tab in which the request runs.
 * @param {string} origin - Sitevision origin.
 * @param {string} nodeId - Identifier of the parent node.
 * @param {string[]} includes - Node types to include in the result (e.g. ["sv:page"]).
 * @returns {Promise<RestNode[]>} The direct child nodes matching `includes`.
 */
export async function fetchRestSubNodes(tabId, origin, nodeId, includes) {
  const json = encodeURIComponent(
    JSON.stringify({ includes, properties: ['robotsIndex', 'displayName'] })
  );
  const url = `${origin}/rest-api/1/${ONLINE_MODEL_VERSION}/${nodeId}/nodes?format=json&json=${json}`;

  const res = await fetchInTabContext(tabId, url, { responseType: 'json' });
  if (!res.ok) throw new Error(`HTTP ${res.status} when fetching REST subnodes`);

  return Array.isArray(res.data) ? res.data : [];
}

/**
 * Fetches a node's complete properties via the offline Model REST API.
 *
 * @param {number} tabId - ID of the tab in which the request runs.
 * @param {string} origin - Sitevision origin.
 * @param {string} nodeId - Identifier of the node to retrieve.
 * @returns {Promise<{
 *   'jcr:uuid': string,
 *   'jcr:primaryType': string,
 *   displayName?: string,
 *   robotsIndex?: boolean
 * }>} The node properties.
 */
export async function fetchNodeProperties(tabId, origin, nodeId) {
  const url = `${origin}/rest-api/1/${ONLINE_MODEL_VERSION}/${nodeId}/properties`;
  const res = await fetchInTabContext(tabId, url, { responseType: 'json' });
  if (!res.ok) throw new Error(`HTTP ${res.status} when fetching REST root properties`);

  return res.data;
}
