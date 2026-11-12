import * as targetTab from './targetTab.js';

/**
 * @typedef {Object} NodeNode
 * @property {string} id
 * @property {string} name
 * @property {string} path
 * @property {string} type
 * @property {{ robotsIndex?: boolean, displayName?: string }} [properties]
 */
/** @typedef {{ 'jcr:uuid': string, 'jcr:primaryType': string, displayName?: string, robotsIndex?: boolean }} NodeProperties */
/** @typedef {'0' | '1'} ModelVersion */

/** @type {readonly ['properties', 'nodes', 'contentnodes']} */
export const NODE_ENDPOINTS = Object.freeze(['properties', 'nodes', 'contentnodes']);

/** @typedef {typeof NODE_ENDPOINTS[number]} NodeEndpoint */

/**
 * @param {unknown} endpoint
 * @returns {endpoint is NodeEndpoint}
 */
function isNodeEndpoint(endpoint) {
  return (
    typeof endpoint === 'string' &&
    NODE_ENDPOINTS.some((supportedEndpoint) => supportedEndpoint === endpoint)
  );
}

/**
 * @param {unknown} endpoint
 * @returns {asserts endpoint is NodeEndpoint}
 */
function assertNodeEndpoint(endpoint) {
  if (!isNodeEndpoint(endpoint)) {
    throw new Error(
      `Unsupported node endpoint "${endpoint}". Supported endpoints: ${NODE_ENDPOINTS.join(', ')}.`
    );
  }
}

/**
 * Throws a concise error for an unsuccessful REST API response.
 * @param {{ ok: boolean, status: number }} response
 */
function assertOk(response) {
  if (response.ok) return;
  if (response.status === 401 || response.status === 403) {
    throw new Error(`Access denied (HTTP ${response.status}).`);
  }
  throw new Error(`REST API error (HTTP ${response.status}).`);
}

/**
 * @param {number} tabId
 * @param {URL} url
 * @returns {Promise<unknown>}
 */
async function fetchJson(tabId, url) {
  const response = await targetTab.fetch(tabId, url.toString(), { responseType: 'json' });
  assertOk(response);
  return response.data;
}

/**
 * Fetches a node resource from the selected REST endpoint.
 * @param {number} tabId
 * @param {string} origin
 * @param {string} nodeId
 * @param {{ modelVersion: ModelVersion, endpoint: NodeEndpoint }} options
 * @returns {Promise<unknown>}
 */
export async function fetchNodeResource(tabId, origin, nodeId, { modelVersion, endpoint }) {
  return fetchJson(tabId, getNodeEndpointUrl(origin, nodeId, { modelVersion, endpoint }));
}

/**
 * Fetches a node's properties through the Sitevision Model REST API.
 * @param {number} tabId
 * @param {string} origin
 * @param {string} nodeId
 * @param {{ modelVersion: ModelVersion }} options
 * @returns {Promise<NodeProperties>}
 */
export async function fetchNodeProperties(tabId, origin, nodeId, { modelVersion }) {
  const data = await fetchNodeResource(tabId, origin, nodeId, {
    modelVersion,
    endpoint: 'properties',
  });
  return /** @type {NodeProperties} */ (data);
}

/**
 * Builds the URL for the selected REST endpoint on a node.
 * @param {string} origin
 * @param {string} nodeId
 * @param {{ modelVersion: ModelVersion, endpoint: NodeEndpoint }} options
 * @returns {URL}
 */
export function getNodeEndpointUrl(origin, nodeId, { modelVersion, endpoint }) {
  assertNodeEndpoint(endpoint);
  return new URL(`/rest-api/1/${modelVersion}/${encodeURIComponent(nodeId)}/${endpoint}`, origin);
}

/**
 * Fetches a node's direct children through the Sitevision Model REST API.
 * @param {number} tabId
 * @param {string} origin
 * @param {string} nodeId
 * @param {{ modelVersion: ModelVersion, includes: string[], properties: string[] }} options
 * @returns {Promise<NodeNode[]>}
 */
export async function fetchNodeNodes(
  tabId,
  origin,
  nodeId,
  { modelVersion, includes, properties }
) {
  const url = getNodeEndpointUrl(origin, nodeId, { modelVersion, endpoint: 'nodes' });
  url.searchParams.set('format', 'json');
  url.searchParams.set('json', JSON.stringify({ includes, properties }));

  const data = await fetchJson(tabId, url);
  return Array.isArray(data) ? /** @type {NodeNode[]} */ (data) : [];
}
