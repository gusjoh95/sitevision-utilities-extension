import { dom, errors, targetPermissions, theme } from '../../../api/index.js';
import { initButtons } from './initButtons.js';
import { getCurrentState } from './getCurrentState.js';
import { getCurrentPropertiesText, navigateToNode } from './renderUI.js';

// Re-fetch the state represented by the restored URL on browser Back / Forward.
window.addEventListener('popstate', (event) => {
  const urlState = getCurrentState();
  const historyState = event.state;
  const node = typeof historyState?.node === 'string' ? historyState.node : urlState.node;
  const version =
    historyState?.version === '0' || historyState?.version === '1'
      ? historyState.version
      : urlState.version;

  void navigateToNode(node, { version, historyAction: 'none' }).catch((error) => {
    dom.getRequiredElement('.json-holder pre').textContent = `Error: ${errors.messageOf(error)}`;
  });
});

// Entrypoint
export async function initPropertiesView() {
  const state = getCurrentState();
  /** @type {HTMLLinkElement} */
  const jsonLinkElement = dom.getRequiredElement('#json-theme');
  theme.assignJsonTheme(jsonLinkElement);

  /** @type {HTMLPreElement} */
  const preElement = dom.getRequiredElement('.json-holder pre');
  const errorElement = dom.getRequiredElement('#error');

  if (!state.origin || !state.node || !state.anchorTabId) {
    preElement.textContent = 'Error: Missing required URL parameters (origin/node/anchorTabId).';
    return;
  }

  targetPermissions.registerTargetPermissionListener({
    tabId: Number(state.anchorTabId),
    origin: state.origin,
    onLost: ({ message }) => {
      errorElement.textContent = `Warning: ${message}`;
    },
  });

  // Keep route state in history, but never store cached response data.
  const currentHistoryState = window.history.state;
  const historyIndex =
    typeof currentHistoryState?.index === 'number' ? currentHistoryState.index : 0;
  window.history.replaceState(
    { index: historyIndex, node: state.node, version: state.version },
    ''
  );

  if (typeof currentHistoryState?.index !== 'number') {
    sessionStorage.setItem('maxHistoryIndex', '0');
  }

  await initButtons(getCurrentPropertiesText, navigateToNode);
  await navigateToNode(state.node, { version: state.version, historyAction: 'replace' });
}
