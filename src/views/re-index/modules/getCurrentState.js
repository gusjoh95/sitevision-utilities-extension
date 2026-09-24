/**
 * Reads the current view state from the URL querystring.
 * `URLSearchParams.get()` returns strings, so `anchorTabId` and `rootNodeId`
 * are strings here.
 *
 * @returns {{ origin: string, anchorTabId: string, rootNodeId: string }}
 */
export function getCurrentState() {
  const params = new URLSearchParams(window.location.search);
  return {
    origin: params.get('origin') || '',
    anchorTabId: params.get('anchorTabId') || '',
    rootNodeId: params.get('rootNodeId') || '',
  };
}
