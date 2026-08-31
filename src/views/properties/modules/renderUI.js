import { getErrorMessage, getOption, getRequiredElement, highlightJson } from "../../../api/index.js";
import { restApiPath } from "../properties.js";
import { fetchFromTab } from "./fetchFromTab.js";
import { getCurrentState } from "./getCurrentState.js";

const useSyntaxHighlighting = await getOption("useSyntaxHighlighting");

/** @type {HTMLPreElement} */
const preElem = getRequiredElement(".json-holder pre");

if (useSyntaxHighlighting) {
  // Event Delegation: Set up click listener once on the parent container
  preElem.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const target = event.target.closest(".json-id");
    if (target) {
      const nextNode = target.textContent.replace(/"/g, "");
      navigateToNode(nextNode, null, "push");
    }
  });
}

/**
 * @param {any} data
 * @param {{ origin: string, version: string, node: string }} state
 */
export function renderUI(data, state) {
  document.title = `${state.origin}${restApiPath}/${state.version}/${state.node}/properties`;

  if (!data) {
    preElem.textContent = "Error: No data available to render";
    return;
  }

  if (data.error) {
    preElem.textContent = `Error: ${data.message}`;
    return;
  }

  if (!useSyntaxHighlighting) {
    preElem.textContent = JSON.stringify(data, null, 2);
    return;
  }

  preElem.replaceChildren(highlightJson(data));
}

/**
 * @param {string} nextNode
 * @param {any} [cachedData=null]
 * @param {"push" | "replace" | "none"} [historyAction="push"]
 */
export async function navigateToNode(nextNode, cachedData = null, historyAction = "push") {
  const state = getCurrentState();
  state.node = nextNode;

  const params = new URLSearchParams(state);
  const newUrlString = `${window.location.pathname}?${params.toString()}`;

  let data = cachedData;

  if (!data) {
    preElem.textContent = "Loading...";
    try {
      data = await fetchFromTab(state);
    } catch (error) {
      const msg = getErrorMessage(error);
      let errorData;

      if (msg.includes("No tab with id") || msg.includes("is not a valid tab ID")) {
        errorData = {
          error: "Tab Disconnected",
          message: "The original website tab was closed. Please open this view again from an active page."
        };
      } else {
        // Safely check if the thrown error message is a JSON payload from the API
        try {
          const parsed = JSON.parse(msg);
          errorData = { error: "API Error", message: JSON.stringify(parsed, null, 2) };
        } catch {
          errorData = { error: "Fetch failed", message: msg };
        }
      }
      data = errorData;
    }
  }

  renderUI(data, state);

  const currentIndex = window.history.state?.index ?? 0;

  if (historyAction === "push") {
    const nextIndex = currentIndex + 1;
    sessionStorage.setItem("maxHistoryIndex", String(nextIndex));
    window.history.pushState({ node: nextNode, cachedData: data, index: nextIndex }, "", newUrlString);
  } else if (historyAction === "replace") {
    window.history.replaceState({ node: nextNode, cachedData: data, index: currentIndex }, "", newUrlString);
  }

  // Dispatch event AFTER history state has been updated
  window.dispatchEvent(new CustomEvent("nodeChanged"));
}
