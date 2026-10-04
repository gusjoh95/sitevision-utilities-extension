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
      void navigateToNode(nextNode, null, 'push').catch((error) => {
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
 * @param {any} [cachedData=null]
 * @param {"push" | "replace" | "none"} [historyAction="push"]
 */
export async function navigateToNode(nextNode, cachedData = null, historyAction = 'push') {
  const state = getCurrentState();
  state.node = nextNode;

  const params = new URLSearchParams(state);
  const newUrlString = `${window.location.pathname}?${params.toString()}`;

  let data = cachedData;
  const previousPreContent = preElem.cloneNode(true);
  const previousPropertiesText = currentPropertiesText;

  if (!data) {
    try {
      await targetPermissions.assertTargetTabAccessible(Number(state.anchorTabId), state.origin);
      preElem.textContent = 'Loading...';
      currentPropertiesText = 'Loading...';
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

      if (!res.ok) {
        const payload = res.data
          ? JSON.stringify(res.data)
          : `HTTP ${res.status} ${res.statusText}`;
        throw new Error(payload);
      }

      data = res.data;
    } catch (error) {
      const msg = errors.messageOf(error);
      const targetAccessErrorMessage = targetPermissions.getTargetAccessErrorMessage(msg);
      let errorData;

      if (targetAccessErrorMessage) {
        preElem.replaceChildren(...previousPreContent.childNodes);
        currentPropertiesText = previousPropertiesText;
        errorElem.textContent = `Warning: ${targetAccessErrorMessage}`;
        return;
      } else {
        // Safely check if the thrown error message is a JSON payload from the API
        try {
          const parsed = JSON.parse(msg);
          errorData = {
            error: 'API Error',
            message: JSON.stringify(parsed, null, 2),
          };
        } catch {
          errorData = { error: 'Fetch failed', message: msg };
        }
      }
      data = errorData;
    }
  }

  renderUI(data, state);

  const currentIndex = window.history.state?.index ?? 0;

  if (historyAction === 'push') {
    const nextIndex = currentIndex + 1;
    sessionStorage.setItem('maxHistoryIndex', String(nextIndex));
    window.history.pushState(
      { node: nextNode, cachedData: data, index: nextIndex },
      '',
      newUrlString
    );
  } else if (historyAction === 'replace') {
    window.history.replaceState(
      { node: nextNode, cachedData: data, index: currentIndex },
      '',
      newUrlString
    );
  }

  // Dispatch event AFTER history state has been updated
  window.dispatchEvent(new CustomEvent('nodeChanged'));
}
