/**
 * Reads the current view state from the URL querystring.
 * `URLSearchParams.get()` returns strings, so `anchorTabId` is a string here.
 *
 * @returns {{ origin: string, anchorTabId: string }}
 */
export function getCurrentState() {
  const params = new URLSearchParams(window.location.search);
  return {
    origin: params.get('origin') || '',
    anchorTabId: params.get('anchorTabId') || '',
  };
}
