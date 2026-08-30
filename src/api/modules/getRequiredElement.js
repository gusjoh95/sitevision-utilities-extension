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
