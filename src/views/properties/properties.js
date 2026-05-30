import { getOptions } from "../shared/api.js";
import { highlightJson } from "../shared/api.js";

// Constants
export const restApiPath = '/rest-api/1';

// Global Configuration
const { useSyntaxHighlighting } = await getOptions();
const el = document.querySelector(".json-holder pre");

/**
 * 1. STATE & HISTORY MANAGEMENT
 * Parses the current URL to get the layout context.
 */
function getCurrentState() {
  const params = new URLSearchParams(window.location.search);
  return {
    origin: params.get("origin") || "",
    version: params.get("version") || "",
    node: params.get("node") || "",
    anchorTabId: params.get("anchorTabId") || ""
  };
}

/**
 * 2. DATA UTILITY
 * Performs the actual script injection to grab fresh data from the origin tab.
 */
async function fetchFromTab(state) {
  const targetTabId = Number(state.anchorTabId);
  if (!targetTabId) {
    throw new Error("Missing originating Tab ID.");
  }

  // Inject the fetch execution directly into opening background tab
  const injectionResults = await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    args: [state.origin, restApiPath, state.version, state.node],
    func: async (origin, restApiPath, version, node) => {
      const url = `${origin}${restApiPath}/${version}/${node}/properties`;
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(JSON.stringify(errorJson) || `HTTP ${response.status}`);
      }
      return await response.json();
    }
  });

  return injectionResults[0].result;
}

/**
 * 3. UI RENDERING & EVENT ATTACHMENT
 */
function renderUI(data, state) {
  document.title = `${state.origin}${restApiPath}/${state.version}/${state.node}/properties`;

  if (!data) {
    el.textContent = "Error: No data available to render";
    return;
  }

  if (data.error) {
    el.textContent = `Error: ${data.message}`;
    return;
  }

  if (!useSyntaxHighlighting) {
    el.textContent = JSON.stringify(data, null, 2);
    return;
  }

  el.replaceChildren(highlightJson(data));

  el.querySelectorAll(".json-id").forEach(item => {
    item.addEventListener("click", () => {
      const nextNode = item.textContent.replace(/"/g, "");
      navigateToNode(nextNode, null, "push");
    });
  });
}

/**
 * 4. ROUTING & NAVIGATION
 * Handles pushing history, state caching, and coordinating renders.
 */
async function navigateToNode(nextNode, cachedData = null, historyAction = "push") {
  const state = getCurrentState();
  state.node = nextNode;

  const params = new URLSearchParams(state);
  const newUrlString = `${window.location.pathname}?${params.toString()}`;

  if (cachedData) {
    renderUI(cachedData, state);
    return;
  }

  el.textContent = "Loading...";
  try {
    const data = await fetchFromTab(state);
    
    if (historyAction === "push") {
      window.history.pushState({ node: nextNode, cachedData: data }, "", newUrlString);
    } else if (historyAction === "replace") {
      window.history.replaceState({ node: nextNode, cachedData: data }, "", newUrlString);
    }
    
    renderUI(data, state);
  } catch (error) {
    let errorData;
    if (error.message.includes("No tab with id") || error.message.includes("is not a valid tab ID")) {
      errorData = {
        error: "Tab Disconnected",
        message: "The original website tab was closed. Please open this view again from an active page."
      };
    } else {
      errorData = { error: "Fetch failed", message: error.message };
    }
    renderUI(errorData, state);
  }
}

/**
 * 5. INITIALIZATION & LIFECYCLE LISTENERS
 */

// Handle Browser Back / Forward buttons instantly using the history payload
window.addEventListener("popstate", (event) => {
  const state = getCurrentState();

  if (event.state && event.state.cachedData) {
    navigateToNode(event.state.node, event.state.cachedData, "none");
  } else {
    navigateToNode(state.node, null, "replace");
  }
});

// Entrypoint
async function init() {
  const state = getCurrentState();

  if (!state.origin || !state.node) {
    el.textContent = "Error: Missing required URL parameters (origin/node).";
    return;
  }

  const useCacheOnReload = false;

  if (useCacheOnReload && window.history.state && window.history.state.cachedData) {
    renderUI(window.history.state.cachedData, state);
  } else {
    navigateToNode(state.node, null, "replace");
  }
}

init();