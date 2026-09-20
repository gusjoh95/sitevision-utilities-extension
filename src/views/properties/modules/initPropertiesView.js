import {
  assignJsonTheme,
  getErrorMessage,
  getRequiredElement,
  registerTargetPermissionListener,
} from '../../../api/index.js';
import { initButtons } from './initButtons.js';
import { getCurrentState } from './getCurrentState.js';
import { navigateToNode, renderUI } from './renderUI.js';

// Handle Browser Back / Forward buttons instantly using the history payload
window.addEventListener('popstate', (event) => {
  void (
    event.state && event.state.cachedData
      ? navigateToNode(event.state.node, event.state.cachedData, 'none')
      : navigateToNode(getCurrentState().node, null, 'replace')
  ).catch((error) => {
    getRequiredElement('.json-holder pre').textContent = `Error: ${getErrorMessage(error)}`;
  });
});

// Entrypoint
export async function initPropertiesView() {
  const state = getCurrentState();
  /** @type {HTMLLinkElement} */
  const jsonLinkElement = getRequiredElement('#json-theme');
  assignJsonTheme(jsonLinkElement);

  /** @type {HTMLPreElement} */
  const preElement = getRequiredElement('.json-holder pre');
  const errorElement = getRequiredElement('#error');

  if (!state.origin || !state.node || !state.anchorTabId) {
    preElement.textContent = 'Error: Missing required URL parameters (origin/node/anchorTabId).';
    return;
  }

  registerTargetPermissionListener({
    tabId: Number(state.anchorTabId),
    origin: state.origin,
    onLost: ({ message }) => {
      errorElement.textContent = `Warning: ${message}`;
    },
  });

  // Ensure initial history state has an index tracker
  if (!window.history.state || typeof window.history.state.index !== 'number') {
    const initialState = window.history.state ?? {};
    window.history.replaceState({ ...initialState, index: 0 }, '');
    sessionStorage.setItem('maxHistoryIndex', '0');
  }

  await initButtons();

  const useCacheOnReload = false;

  if (useCacheOnReload && window.history.state && window.history.state.cachedData) {
    renderUI(window.history.state.cachedData, state);
  } else {
    await navigateToNode(state.node, null, 'replace');
  }
}
