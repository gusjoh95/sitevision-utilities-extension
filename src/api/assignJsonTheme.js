import { getOptions } from "./options.js";

/**
 * Asynchronously loads and applies the user-selected JSON theme to a given link element.
 * @param {HTMLLinkElement} linkElement - The HTML link element whose href will be updated.
 * @returns {void}
 */
export function assignJsonTheme(linkElement) {
  getOptions().then(opts => {
    const themeFile = opts?.jsonTheme;
    if (!themeFile) return;
    linkElement.href = chrome.runtime.getURL(`resources/style/json-themes/${themeFile}`);
  });
}