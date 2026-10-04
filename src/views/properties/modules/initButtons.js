import { dom, errors, options } from '../../../api/index.js';

/**
 * Initializes the properties-page control buttons.
 * @param {() => string} getPropertiesText
 */
export async function initButtons(getPropertiesText) {
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

  const propertiesWordWrap = await options.getOption('propertiesWordWrap');

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

  window.addEventListener('popstate', updateHistoryButtons);
  window.addEventListener('nodeChanged', updateHistoryButtons);

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

  applyWrapState(Boolean(propertiesWordWrap));
  updateHistoryButtons();
}
