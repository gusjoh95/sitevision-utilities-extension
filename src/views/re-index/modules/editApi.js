import { fetchInTabContext } from '../../../api/index.js';

/**
 * Triggers reindex on a single node via the Sitevision Edit API.
 *
 * @param {number} tabId - ID of the tab in which the request runs.
 * @param {string} origin - Sitevision origin.
 * @param {string} nodeId - Node to reindex.
 * @param {string} csrfToken - CSRF token required by the Edit API.
 * @returns {Promise<import('../../../api/modules/fetchInTabContext.js').FetchInTabResult>} The API response.
 */
export async function reindexSingleNode(tabId, origin, nodeId, csrfToken) {
  const url = `${origin}/edit-api/1/${nodeId}/${nodeId}/reindexNode/${nodeId}`;

  const res = await fetchInTabContext(tabId, url, {
    reqOptions: {
      method: 'PUT',
      headers: { 'x-csrf-token': csrfToken },
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} when reindexing node`);

  return res;
}
