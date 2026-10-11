import * as targetTab from './targetTab.js';

/** @typedef {{ id: string, type: string, properties?: { robotsIndex?: boolean, displayName?: string } }} RestNode */
/** @typedef {{ 'jcr:uuid': string, 'jcr:primaryType': string, displayName?: string, robotsIndex?: boolean }} NodeProperties */

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
 * @returns {Promise<any>}
 */
async function fetchJson(tabId, url) {
  const response = await targetTab.fetch(tabId, url.toString(), { responseType: 'json' });
  assertOk(response);
  return response.data;
}

/**
 * Fetches a node's properties through the Sitevision Model REST API.
 * @param {number} tabId
 * @param {string} origin
 * @param {string} nodeId
 * @param {{ modelVersion?: string }} [options={}]
 * @returns {Promise<NodeProperties>}
 */
export async function fetchNodeProperties(tabId, origin, nodeId, { modelVersion = '1' } = {}) {
  const url = new URL(
    `/rest-api/1/${modelVersion}/${encodeURIComponent(nodeId)}/properties`,
    origin
  );
  return fetchJson(tabId, url);
}

/**
 * Fetches a node's direct children through the Sitevision Model REST API.
 * @param {number} tabId
 * @param {string} origin
 * @param {string} nodeId
 * @param {{ modelVersion?: string, includes: string[], properties: string[] }} options
 * @returns {Promise<RestNode[]>}
 */
export async function fetchNodeChildren(
  tabId,
  origin,
  nodeId,
  { modelVersion = '1', includes, properties }
) {
  const url = new URL(`/rest-api/1/${modelVersion}/${encodeURIComponent(nodeId)}/nodes`, origin);
  url.searchParams.set('format', 'json');
  url.searchParams.set('json', JSON.stringify({ includes, properties }));

  const data = await fetchJson(tabId, url);
  return Array.isArray(data) ? data : [];
}
