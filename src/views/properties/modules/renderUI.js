import {
  dom,
  errors,
  i18n,
  jsonRenderer,
  options,
  sitevisionRest,
  spinner,
  targetPermissions,
} from '../../../api/index.js';
import { restApiPath } from '../properties.js';
import { getCurrentState } from './getCurrentState.js';

/** @typedef {import('./endpointOptions.js').ApiEndpoint} ApiEndpoint */
/** @typedef {import('../../../api/types.js').ModelVersion} ModelVersion */

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
        currentPropertiesText = i18n.getMessage('common_errorPrefix', [errors.messageOf(error)]);
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
 * @param {{ origin: string, version: ModelVersion, node: string, anchorTabId: string, endpoint: ApiEndpoint }} state
 */
export function renderUI(data, state) {
  document.title = `${state.origin}${restApiPath}/${state.version}/${state.node}/${state.endpoint}`;

  if (!data) {
    currentPropertiesText = i18n.getMessage('properties_noDataToRender');
    preElem.textContent = currentPropertiesText;
    return;
  }

  if (data.error) {
    const errorLabel =
      data.error === 'API Error'
        ? i18n.getMessage('properties_apiError')
        : data.error === 'Fetch failed'
          ? i18n.getMessage('properties_fetchFailed')
          : data.error;
    currentPropertiesText = `${errorLabel}: ${data.message}`;
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
 * @param {{ version?: ModelVersion, endpoint?: ApiEndpoint, historyAction?: "push" | "replace" | "none" }} [navigationOptions={}]
 * @returns {Promise<boolean>} Whether this navigation remained current and completed.
 */
export async function navigateToNode(nextNode, navigationOptions = {}) {
  const navigationId = ++activeNavigationId;
  const { version, endpoint, historyAction = 'push' } = navigationOptions;
  const state = getCurrentState();
  state.node = nextNode;
  state.version = version ?? state.version;
  state.endpoint = endpoint ?? state.endpoint;

  const params = new URLSearchParams(state);
  const newUrlString = `${window.location.pathname}?${params.toString()}`;
  const requestUrl = sitevisionRest.getNodeEndpointUrl(state.origin, state.node, {
    modelVersion: state.version,
    endpoint: state.endpoint,
  }).href;
  const requestUrlLink = /** @type {HTMLAnchorElement} */ (dom.getRequiredElement('#request-url'));
  requestUrlLink.href = requestUrl;
  requestUrlLink.textContent = requestUrl;

  const currentIndex = window.history.state?.index ?? 0;
  let historyIndex = currentIndex;
  if (historyAction === 'push') {
    historyIndex += 1;
    sessionStorage.setItem('maxHistoryIndex', String(historyIndex));
    window.history.pushState(
      { index: historyIndex, node: state.node, version: state.version, endpoint: state.endpoint },
      '',
      newUrlString
    );
  } else {
    window.history.replaceState(
      { index: historyIndex, node: state.node, version: state.version, endpoint: state.endpoint },
      '',
      newUrlString
    );
  }
  window.dispatchEvent(new CustomEvent('nodeChanged'));

  errorElem.textContent = '';
  preElem.style.minHeight = `${preElem.getBoundingClientRect().height}px`;
  preElem.textContent = i18n.getMessage('common_loading');
  currentPropertiesText = i18n.getMessage('common_loading');

  try {
    await targetPermissions.assertTargetTabAccessible(Number(state.anchorTabId), state.origin);
    if (navigationId !== activeNavigationId) {
      return false;
    }

    const res = await spinner.withDeferredSpinner(
      () =>
        sitevisionRest.fetchNodeResource(Number(state.anchorTabId), state.origin, state.node, {
          modelVersion: state.version,
          endpoint: state.endpoint,
        }),
      {
        spinnerEl: dom.getRequiredElement('#spinner'),
        delayMs: 250,
      }
    );

    if (navigationId !== activeNavigationId) {
      return false;
    }

    renderUI(res, state);
  } catch (error) {
    if (navigationId !== activeNavigationId) {
      return false;
    }

    const msg = errors.messageOf(error);
    const targetAccessErrorMessage = targetPermissions.getTargetAccessErrorMessage(error);

    if (targetAccessErrorMessage) {
      errorElem.textContent = i18n.getMessage('common_warningPrefix', [targetAccessErrorMessage]);
      renderUI(
        {
          error: i18n.getMessage('common_targetAccessUnavailable'),
          message: targetAccessErrorMessage,
        },
        state
      );
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
