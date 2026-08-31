import { assignJsonTheme, getRequiredElement } from '../../../api/index.js';
import { initButtons } from './initButtons.js';
import { getCurrentState } from './getCurrentState.js';
import { navigateToNode, renderUI } from './renderUI.js';

// Handle Browser Back / Forward buttons instantly using the history payload
window.addEventListener('popstate', (event) => {
  if (event.state && event.state.cachedData) {
    navigateToNode(event.state.node, event.state.cachedData, 'none');
  } else {
    const state = getCurrentState();
    navigateToNode(state.node, null, 'replace');
  }
});

// Entrypoint
export async function initPropertiesView() {
  const state = getCurrentState();
  /** @type {HTMLLinkElement} */
  const jsonLinkElement = getRequiredElement('#json-theme');
  assignJsonTheme(jsonLinkElement);

  /** @type {HTMLPreElement} */
  const preElement = getRequiredElement('.json-holder pre');

  if (!state.origin || !state.node) {
    preElement.textContent = 'Error: Missing required URL parameters (origin/node).';
    return;
  }

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
    navigateToNode(state.node, null, 'replace');
  }
}
