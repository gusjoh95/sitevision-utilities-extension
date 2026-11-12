export const DEFAULT_API_ENDPOINT = 'properties';

export const API_ENDPOINTS = {
  [DEFAULT_API_ENDPOINT]: 'Properties',
  nodes: 'Nodes',
  contentnodes: 'Content nodes',
};

/** @typedef {keyof typeof API_ENDPOINTS} ApiEndpoint */

/**
 * @param {unknown} endpoint
 * @returns {endpoint is ApiEndpoint}
 */
export function isApiEndpoint(endpoint) {
  return typeof endpoint === 'string' && Object.hasOwn(API_ENDPOINTS, endpoint);
}
