/**
 * Retrieves a required HTML element from the DOM and casts it to the expected type.
 * @template {HTMLElement} T
 * @param {string} selector - CSS selector for the target element.
 * @returns {T}
 * @throws {Error} If the element is not found in the DOM.
 */
export function getRequiredElement(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return /** @type {T} */ (element);
}

/**
 * Adds copies of the node ID button template after highlighted node IDs.
 * @param {HTMLPreElement} preElement
 * @param {HTMLButtonElement} buttonTemplate
 */
export function addNodeIdCopyButtons(preElement, buttonTemplate) {
  for (const idElement of preElement.querySelectorAll('.json-id')) {
    const nodeId = JSON.parse(idElement.textContent ?? '""');
    const button = /** @type {HTMLButtonElement} */ (buttonTemplate.cloneNode(true));
    button.removeAttribute('id');
    button.dataset.copyId = nodeId;
    button.setAttribute('aria-label', 'Copy node ID');

    const nextNode = idElement.nextSibling;
    if (nextNode instanceof Text && nextNode.data.startsWith(',')) {
      const textAfterComma = nextNode.splitText(1);
      nextNode.parentNode?.insertBefore(button, textAfterComma);
    } else {
      idElement.after(button);
    }
  }
}

/**
 * @typedef {Object} MatchOptions
 * @property {string} [selector='*'] - CSS selector to target specific elements (e.g., 'script', 'meta').
 * @property {RegExp | string} [pattern] - The regex pattern to match against element content.
 */

/**
 * Tests HTML content against a CSS selector and a regular expression pattern.
 * @param {string} html - The raw HTML string to parse and check.
 * @param {MatchOptions} [options={}] - Matching configuration options.
 * @returns {boolean} True if the HTML yields matching content, otherwise false.
 */
export function matchDOM(html, { selector = '*', pattern = '' } = {}) {
  if (!html) {
    return false;
  }

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const elements = doc.querySelectorAll(selector);

  const patternSource = pattern instanceof RegExp ? pattern.source : pattern;
  const patternFlags = pattern instanceof RegExp ? pattern.flags : 'i';
  const regex = new RegExp(patternSource, patternFlags);

  for (const el of elements) {
    const targetText = el.textContent || el.getAttribute('content') || '';
    if (regex.test(targetText)) {
      return true;
    }
  }

  return false;
}
