import { DEFAULT_API_ENDPOINT, isApiEndpoint } from './endpointOptions.js';

/** @typedef {import('./endpointOptions.js').ApiEndpoint} ApiEndpoint */
/** @typedef {import('../../../api/types.js').ModelVersion} ModelVersion */

/**
 * Reads the current view state from the URL querystring.
 * `URLSearchParams.get()` returns strings, so `anchorTabId` is a string here.
 *
 * @returns {{ origin: string, version: ModelVersion, node: string, anchorTabId: string, endpoint: ApiEndpoint }}
 */
export function getCurrentState() {
  const params = new URLSearchParams(window.location.search);
  const endpoint = params.get('endpoint');

  return {
    origin: params.get('origin') || '',
    version: params.get('version') === '0' ? '0' : '1',
    node: params.get('node') || '',
    anchorTabId: params.get('anchorTabId') || '',
    endpoint: isApiEndpoint(endpoint) ? endpoint : DEFAULT_API_ENDPOINT,
  };
}
