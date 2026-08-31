import { getErrorMessage, getOption, getRequiredElement, setOptions } from '../../../api/index.js';

/**
 * Initializes the properties-page control buttons.
 */
export async function initButtons() {
  /** @type {HTMLPreElement} */
  const preElem = getRequiredElement('.json-holder pre');
  /** @type {HTMLButtonElement} */
  const backBtn = getRequiredElement('#back');
  /** @type {HTMLButtonElement} */
  const forwardBtn = getRequiredElement('#forward');
  /** @type {HTMLButtonElement} */
  const copyBtn = getRequiredElement('#copy');
  /** @type {HTMLButtonElement} */
  const wrapBtn = getRequiredElement('#wrap');

  const propertiesWordWrap = await getOption('propertiesWordWrap');

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
      const text = preElem.textContent ?? '';
      await navigator.clipboard.writeText(text);
      copyBtn.classList.add('copied');
      copyBtn.title = 'Copied';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.title = 'Copy properties to clipboard';
      }, 1200);
    } catch (error) {
      const msg = getErrorMessage(error);
      console.error('Failed to copy properties:', msg);
    }
  });

  wrapBtn.addEventListener('click', async () => {
    const isActive = !wrapBtn.classList.contains('active');
    applyWrapState(isActive);

    try {
      await setOptions({ propertiesWordWrap: isActive });
    } catch (error) {
      const msg = getErrorMessage(error);
      console.error('Failed to save propertiesWordWrap option:', msg);
      applyWrapState(!isActive);
    }
  });

  applyWrapState(Boolean(propertiesWordWrap));
  updateHistoryButtons();
}
