import { getErrorMessage, getOptions, highlightJson } from "../../../api/index.js";
import { restApiPath } from "../properties.js";
import { fetchFromTab } from "./fetchFromTab.js";
import { getCurrentState } from "./getCurrentState.js";

const { useSyntaxHighlighting } = await getOptions();

/**
 * @param {any} data
 * @param {{ origin: string, version: string, node: string }} state
 */
export function renderUI(data, state) {
  const el = document.querySelector(".json-holder pre");
  if (!el) {
    return;
  }

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
}

if (useSyntaxHighlighting) {
  // Event Delegation: Set up click listener once on the parent container
  const jsonHolder = document.querySelector(".json-holder pre");
  if (jsonHolder) {
    jsonHolder.addEventListener("click", (event) => {
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
}

/**
 * @param {string} nextNode
 * @param {any} [cachedData=null]
 * @param {"push" | "replace"} [historyAction="push"]
 */
export async function navigateToNode(nextNode, cachedData = null, historyAction = "push") {
  const el = document.querySelector(".json-holder pre");
  if (!el) {
    return;
  }

  const state = getCurrentState();
  state.node = nextNode;

  const params = new URLSearchParams(state);
  const newUrlString = `${window.location.pathname}?${params.toString()}`;

  if (cachedData) {
    renderUI(cachedData, state);
    return;
  }

  el.textContent = "Loading...";
  let data;
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
  } finally {
    renderUI(data, state);
    if (historyAction === "push") {
      window.history.pushState({ node: nextNode, cachedData: data }, "", newUrlString);
    } else if (historyAction === "replace") {
      window.history.replaceState({ node: nextNode, cachedData: data }, "", newUrlString);
    }
  }
}
