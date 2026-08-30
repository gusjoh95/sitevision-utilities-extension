import { assignJsonTheme, getRequiredElement } from "../../../api/index.js";
import { getCurrentState } from "./getCurrentState.js";
import { navigateToNode, renderUI } from "./renderUI.js";

// Handle Browser Back / Forward buttons instantly using the history payload
window.addEventListener("popstate", (event) => {
  
  if (event.state && event.state.cachedData) {
    navigateToNode(event.state.node, event.state.cachedData, "none");
  } else {
    const state = getCurrentState();
    navigateToNode(state.node, null, "replace");
  }
});

// Entrypoint
export async function initPropertiesView() {
  const state = getCurrentState();
  /** @type {HTMLLinkElement} */
  const jsonLinkElement = getRequiredElement("#json-theme");
  assignJsonTheme(jsonLinkElement);

  const el = document.querySelector(".json-holder pre");
  if (!state.origin || !state.node) {
    if (el) {
      el.textContent = "Error: Missing required URL parameters (origin/node).";
    }
    return;
  }

  const useCacheOnReload = false;

  if (useCacheOnReload && window.history.state && window.history.state.cachedData) {
    renderUI(window.history.state.cachedData, state);
  } else {
    navigateToNode(state.node, null, "replace");
  }
}
