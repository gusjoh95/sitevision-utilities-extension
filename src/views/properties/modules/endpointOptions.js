export const DEFAULT_API_ENDPOINT = 'properties';

export const API_ENDPOINTS = {
  [DEFAULT_API_ENDPOINT]: 'properties_properties',
  nodes: 'properties_endpointNodes',
  contentnodes: 'properties_endpointContentNodes',
};

/** @typedef {keyof typeof API_ENDPOINTS} ApiEndpoint */

/**
 * @param {unknown} endpoint
 * @returns {endpoint is ApiEndpoint}
 */
export function isApiEndpoint(endpoint) {
  return typeof endpoint === 'string' && Object.hasOwn(API_ENDPOINTS, endpoint);
}
