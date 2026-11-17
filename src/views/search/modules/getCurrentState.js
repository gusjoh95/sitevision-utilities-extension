/**
 * @returns {{ origin: string, anchorTabId: number, siteId: string, version: import('../../../api/types.js').ModelVersion }}
 */
export function getCurrentState() {
  const params = new URLSearchParams(window.location.search);
  return {
    origin: params.get('origin') ?? '',
    anchorTabId: Number(params.get('anchorTabId')),
    siteId: params.get('siteId') ?? '',
    version: params.get('version') === '0' ? '0' : '1',
  };
}
