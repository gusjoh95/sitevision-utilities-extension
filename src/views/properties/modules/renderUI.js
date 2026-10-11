import {
  dom,
  errors,
  jsonRenderer,
  options,
  spinner,
  targetPermissions,
  targetTab,
} from '../../../api/index.js';
import { restApiPath } from '../properties.js';
import { getCurrentState } from './getCurrentState.js';

const useSyntaxHighlighting = await options.getOption('useSyntaxHighlighting');

/** @type {HTMLPreElement} */
const preElem = dom.getRequiredElement('.json-holder pre');
/** @type {HTMLButtonElement} */
const copyButtonTemplate = dom.getRequiredElement('#json-id-copy-template');
const errorElem = dom.getRequiredElement('#error');
let currentPropertiesText = '';
let activeNavigationId = 0;

export function getCurrentPropertiesText() {
  return currentPropertiesText;
}

if (useSyntaxHighlighting) {
  // Event Delegation: Set up click listener once on the parent container
  preElem.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    const copyButton = event.target.closest('.json-id-copy[data-copy-id]');
    if (copyButton instanceof HTMLButtonElement) {
      const nodeId = copyButton.dataset.copyId;
      if (nodeId) {
        void navigator.clipboard.writeText(nodeId).catch((error) => {
          console.error('Failed to copy node ID:', errors.messageOf(error));
        });
      }
      return;
    }

    const target = event.target.closest('.json-id');
    if (target) {
      const nextNode = target.textContent.replace(/"/g, '');
      void navigateToNode(nextNode).catch((error) => {
        currentPropertiesText = `Error: ${errors.messageOf(error)}`;
        preElem.textContent = currentPropertiesText;
      });
    }
  });

  preElem.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || !(event.target instanceof Element)) {
      return;
    }

    const target = /** @type {HTMLElement | null} */ (
      event.target.closest('.json-id[role="link"]')
    );
    if (target) {
      event.preventDefault();
      target.click();
    }
  });
}

/**
 * @param {any} data
 * @param {{ origin: string, version: string, node: string, anchorTabId: string }} state
 */
export function renderUI(data, state) {
  document.title = `${state.origin}${restApiPath}/${state.version}/${state.node}/properties`;

  if (!data) {
    currentPropertiesText = 'Error: No data available to render';
    preElem.textContent = currentPropertiesText;
    return;
  }

  if (data.error) {
    currentPropertiesText = `${data.error}: ${data.message}`;
    preElem.textContent = currentPropertiesText;
    return;
  }

  errorElem.textContent = '';
  currentPropertiesText = JSON.stringify(data, null, 2) ?? '';

  if (!useSyntaxHighlighting) {
    preElem.textContent = currentPropertiesText;
    return;
  }

  preElem.replaceChildren(jsonRenderer.highlight(data));
  const nodeIds = /** @type {NodeListOf<HTMLSpanElement>} */ (preElem.querySelectorAll('.json-id'));
  for (const nodeId of nodeIds) {
    nodeId.setAttribute('role', 'link');
    nodeId.tabIndex = 0;
  }
  dom.addNodeIdCopyButtons(preElem, copyButtonTemplate);
}

/**
 * @param {string} nextNode
 * @param {{ version?: string, historyAction?: "push" | "replace" | "none" }} [navigationOptions={}]
 * @returns {Promise<boolean>} Whether this navigation remained current and completed.
 */
export async function navigateToNode(nextNode, navigationOptions = {}) {
  const navigationId = ++activeNavigationId;
  const { version, historyAction = 'push' } = navigationOptions;
  const state = getCurrentState();
  state.node = nextNode;
  state.version = version ?? state.version;

  const params = new URLSearchParams(state);
  const newUrlString = `${window.location.pathname}?${params.toString()}`;

  const currentIndex = window.history.state?.index ?? 0;
  let historyIndex = currentIndex;
  if (historyAction === 'push') {
    historyIndex += 1;
    sessionStorage.setItem('maxHistoryIndex', String(historyIndex));
    window.history.pushState(
      { index: historyIndex, node: state.node, version: state.version },
      '',
      newUrlString
    );
  } else {
    window.history.replaceState(
      { index: historyIndex, node: state.node, version: state.version },
      '',
      newUrlString
    );
  }
  window.dispatchEvent(new CustomEvent('nodeChanged'));

  errorElem.textContent = '';
  preElem.style.minHeight = `${preElem.getBoundingClientRect().height}px`;
  preElem.textContent = 'Loading...';
  currentPropertiesText = 'Loading...';

  try {
    await targetPermissions.assertTargetTabAccessible(Number(state.anchorTabId), state.origin);
    if (navigationId !== activeNavigationId) {
      return false;
    }

    const url = new URL(
      `${restApiPath}/${state.version}/${state.node}/properties`,
      state.origin
    ).toString();
    const res = await spinner.withDeferredSpinner(
      () => targetTab.fetch(Number(state.anchorTabId), url, { responseType: 'json' }),
      {
        spinnerEl: dom.getRequiredElement('#spinner'),
        delayMs: 250,
      }
    );

    if (navigationId !== activeNavigationId) {
      return false;
    }

    if (!res.ok) {
      const payload = res.data ? JSON.stringify(res.data) : `HTTP ${res.status} ${res.statusText}`;
      throw new Error(payload);
    }
    renderUI(res.data, state);
  } catch (error) {
    if (navigationId !== activeNavigationId) {
      return false;
    }

    const msg = errors.messageOf(error);
    const targetAccessErrorMessage = targetPermissions.getTargetAccessErrorMessage(msg);

    if (targetAccessErrorMessage) {
      errorElem.textContent = `Warning: ${targetAccessErrorMessage}`;
      renderUI({ error: 'Target access unavailable', message: targetAccessErrorMessage }, state);
      return true;
    }

    // Safely check if the thrown error message is a JSON payload from the API.
    let errorData;
    try {
      const parsed = JSON.parse(msg);
      errorData = {
        error: 'API Error',
        message: JSON.stringify(parsed, null, 2),
      };
    } catch {
      errorData = { error: 'Fetch failed', message: msg };
    }
    renderUI(errorData, state);
  } finally {
    if (navigationId === activeNavigationId) {
      preElem.style.removeProperty('min-height');
    }
  }

  return navigationId === activeNavigationId;
}
