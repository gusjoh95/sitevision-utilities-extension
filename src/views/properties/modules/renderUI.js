import { getErrorMessage, getOptions, highlightJson } from "../../../api/index.js";
import { restApiPath } from "../properties.js";
import { fetchFromTab } from "./fetchFromTab.js";
import { getCurrentState } from "./getCurrentState.js";

const { useSyntaxHighlighting } = await getOptions();

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

  el.querySelectorAll(".json-id").forEach(item => {
    item.addEventListener("click", () => {
      const nextNode = item.textContent.replace(/"/g, "");
      navigateToNode(nextNode, null, "push");
    });
  });
}

export async function navigateToNode(nextNode, cachedData = null, historyAction = "push") {
  const state = getCurrentState();
  state.node = nextNode;

  const params = new URLSearchParams(state);
  const newUrlString = `${window.location.pathname}?${params.toString()}`;

  const el = document.querySelector(".json-holder pre");
  if (!el) {
    return;
  }

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
    const msg = getErrorMessage(error);
    if (msg.includes("No tab with id") || msg.includes("is not a valid tab ID")) {
      errorData = {
        error: "Tab Disconnected",
        message: "The original website tab was closed. Please open this view again from an active page."
      };
    } else {
      errorData = { error: "Fetch failed", message: msg };
    }
    renderUI(errorData, state);
  }
}
