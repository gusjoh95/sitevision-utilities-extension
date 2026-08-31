export function getCurrentState() {
  const params = new URLSearchParams(window.location.search);
  return {
    origin: params.get('origin') || '',
    version: params.get('version') || '',
    node: params.get('node') || '',
    anchorTabId: params.get('anchorTabId') || '',
  };
}
