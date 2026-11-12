import { dom, errors, i18n, options } from '../../../api/index.js';
import { API_ENDPOINTS, isApiEndpoint } from './endpointOptions.js';
import { getCurrentState } from './getCurrentState.js';

/** @typedef {import('./endpointOptions.js').ApiEndpoint} ApiEndpoint */
/** @typedef {import('../../../api/types.js').ModelVersion} ModelVersion */

/**
 * Initializes the properties-page control buttons.
 * @param {() => string} getPropertiesText
 * @param {(node: string, navigationOptions?: { version?: ModelVersion, endpoint?: ApiEndpoint, historyAction?: 'push' | 'replace' | 'none' }) => Promise<boolean>} navigateToNode
 */
export async function initButtons(getPropertiesText, navigateToNode) {
  /** @type {HTMLPreElement} */
  const preElem = dom.getRequiredElement('.json-holder pre');
  /** @type {HTMLButtonElement} */
  const backBtn = dom.getRequiredElement('#back');
  /** @type {HTMLButtonElement} */
  const forwardBtn = dom.getRequiredElement('#forward');
  /** @type {HTMLButtonElement} */
  const copyBtn = dom.getRequiredElement('#copy');
  /** @type {HTMLButtonElement} */
  const wrapBtn = dom.getRequiredElement('#wrap');
  /** @type {HTMLButtonElement} */
  const versionToggleBtn = dom.getRequiredElement('#version-toggle');
  const endpointSelector = dom.getRequiredElement('#endpoint-selector');
  for (const [value, text] of Object.entries(API_ENDPOINTS)) {
    const label = document.createElement('label');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'endpoint';
    radio.value = value;
    label.append(radio, document.createTextNode(i18n.getMessage(text)));
    endpointSelector.append(label);
  }
  /** @type {NodeListOf<HTMLInputElement>} */
  const endpointRadios = endpointSelector.querySelectorAll('input[name="endpoint"]');

  const propertiesWordWrapPromise = options.getOption('propertiesWordWrap');

  /**
   * Applies the word-wrap state to the rendered JSON area and the wrap button.
   * @param {boolean} isActive
   */
  function applyWrapState(isActive) {
    wrapBtn.classList.toggle('active', isActive);
    wrapBtn.setAttribute('aria-pressed', String(isActive));
    preElem.classList.toggle('wrap', isActive);
  }

  /**
   * Applies the selected REST API version to the mode toggle.
   * @param {ModelVersion} version
   */
  function applyVersionState(version) {
    const isOnline = version === '1';
    versionToggleBtn.setAttribute('aria-pressed', String(isOnline));
    versionToggleBtn.classList.toggle('active', isOnline);
  }

  /**
   * Applies the selected REST endpoint to the radio group.
   * @param {ApiEndpoint} endpoint
   */
  function applyEndpointState(endpoint) {
    for (const radio of endpointRadios) {
      radio.checked = radio.value === endpoint;
    }
  }

  /**
   * Updates disabled status for back and forward buttons based on history index.
   */
  function updateHistoryButtons() {
    const currentIndex = window.history.state?.index ?? 0;
    const maxIndex = Number(sessionStorage.getItem('maxHistoryIndex') ?? '0');

    backBtn.disabled = currentIndex <= 0;
    forwardBtn.disabled = currentIndex >= maxIndex;
  }

  function syncNavigationControls() {
    const state = getCurrentState();
    applyVersionState(state.version);
    applyEndpointState(state.endpoint);
    updateHistoryButtons();
  }

  backBtn.addEventListener('click', () => {
    window.history.back();
  });

  forwardBtn.addEventListener('click', () => {
    window.history.forward();
  });

  window.addEventListener('popstate', syncNavigationControls);
  window.addEventListener('nodeChanged', syncNavigationControls);
  syncNavigationControls();

  copyBtn.addEventListener('click', async () => {
    try {
      const text = getPropertiesText();
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const msg = errors.messageOf(error);
      console.error('Failed to copy properties:', msg);
    }
  });

  wrapBtn.addEventListener('click', async () => {
    const isActive = !wrapBtn.classList.contains('active');
    applyWrapState(isActive);

    try {
      await options.setOptions({ propertiesWordWrap: isActive });
    } catch (error) {
      const msg = errors.messageOf(error);
      console.error('Failed to save propertiesWordWrap option:', msg);
      applyWrapState(!isActive);
    }
  });

  versionToggleBtn.addEventListener('click', async () => {
    const currentState = getCurrentState();
    const nextVersion = currentState.version === '1' ? '0' : '1';
    applyVersionState(nextVersion);

    try {
      const navigated = await navigateToNode(currentState.node, { version: nextVersion });
      if (!navigated) {
        applyVersionState(getCurrentState().version);
      }
    } catch (error) {
      console.error('Failed to switch properties version:', errors.messageOf(error));
      applyVersionState(getCurrentState().version);
    }
  });

  for (const radio of endpointRadios) {
    radio.addEventListener('change', async () => {
      if (!radio.checked || !isApiEndpoint(radio.value)) {
        return;
      }

      const currentState = getCurrentState();
      try {
        const navigated = await navigateToNode(currentState.node, { endpoint: radio.value });
        if (!navigated) {
          applyEndpointState(getCurrentState().endpoint);
        }
      } catch (error) {
        console.error('Failed to switch properties endpoint:', errors.messageOf(error));
        applyEndpointState(getCurrentState().endpoint);
      }
    });
  }

  const propertiesWordWrap = await propertiesWordWrapPromise;
  applyWrapState(Boolean(propertiesWordWrap));
  updateHistoryButtons();
}
