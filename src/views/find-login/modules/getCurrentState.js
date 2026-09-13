export function getCurrentState() {
  const params = new URLSearchParams(window.location.search);
  return {
    origin: params.get('origin') || '',
    anchorTabId: Number(params.get('anchorTabId')),
  };
}
