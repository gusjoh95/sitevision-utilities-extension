import { dom, errors, options } from '../../../api/index.js';
import { getCurrentState } from './getCurrentState.js';

/**
 * Initializes the properties-page control buttons.
 * @param {() => string} getPropertiesText
 * @param {(node: string, navigationOptions?: { version?: string, historyAction?: 'push' | 'replace' | 'none' }) => Promise<boolean>} navigateToNode
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
   * @param {string} version
   */
  function applyVersionState(version) {
    const isOnline = version === '1';
    versionToggleBtn.setAttribute('aria-pressed', String(isOnline));
    versionToggleBtn.classList.toggle('active', isOnline);
  }

  applyVersionState(getCurrentState().version);

  /**
   * Updates disabled status for back and forward buttons based on history index.
   */
  function updateHistoryButtons() {
    const currentIndex = window.history.state?.index ?? 0;
    const maxIndex = Number(sessionStorage.getItem('maxHistoryIndex') ?? '0');

    backBtn.disabled = currentIndex <= 0;
    forwardBtn.disabled = currentIndex >= maxIndex;
  }

  backBtn.addEventListener('click', () => {
    window.history.back();
  });

  forwardBtn.addEventListener('click', () => {
    window.history.forward();
  });

  window.addEventListener('popstate', (event) => {
    const version = event.state?.version ?? getCurrentState().version;
    applyVersionState(version);
    updateHistoryButtons();
  });
  window.addEventListener('nodeChanged', () => {
    applyVersionState(getCurrentState().version);
    updateHistoryButtons();
  });

  updateHistoryButtons();

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

  const propertiesWordWrap = await propertiesWordWrapPromise;
  applyWrapState(Boolean(propertiesWordWrap));
  updateHistoryButtons();
}
