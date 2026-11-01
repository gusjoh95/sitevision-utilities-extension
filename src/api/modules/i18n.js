import { getOption } from './options.js';

/** @typedef {{ message: string }} LocalizationMessage */

/** @type {Record<string, LocalizationMessage> | null} */
let activeMessages = null;
let activeLocale = 'en';

export async function initialize() {
  const storedPreference = await getOption('locale');
  const preference =
    storedPreference === 'en' || storedPreference === 'sv' ? storedPreference : 'auto';
  const browserLocale = browser.i18n.getUILanguage().toLowerCase().split(/[-_]/)[0];
  activeLocale = preference === 'auto' ? (browserLocale === 'sv' ? 'sv' : 'en') : preference;
  const response = await fetch(browser.runtime.getURL(`_locales/${activeLocale}/messages.json`));

  if (!response.ok) {
    throw new Error(`Failed to load ${activeLocale} localization: HTTP ${response.status}`);
  }

  activeMessages = await response.json();
}

export function getLocale() {
  return activeLocale;
}

/**
 * @param {string} messageName
 * @param {string[]} [substitutions=[]]
 * @returns {string}
 */
export function getMessage(messageName, substitutions = []) {
  const message = activeMessages?.[messageName]?.message ?? browser.i18n.getMessage(messageName);
  if (!message) return messageName;

  return substitutions.reduce(
    (result, substitution, index) => result.replaceAll(`$${index + 1}`, () => String(substitution)),
    message
  );
}

export function localizeDocument(root = document) {
  root.documentElement.lang = activeLocale;
  /** @type {NodeListOf<HTMLElement>} */ (root.querySelectorAll('[data-i18n]')).forEach(
    (element) => {
      const messageName = element.dataset.i18n;
      if (messageName) {
        element.textContent = getMessage(messageName);
      }
    }
  );

  const attributes = [
    ['data-i18n-aria-label', 'aria-label'],
    ['data-i18n-placeholder', 'placeholder'],
    ['data-i18n-title', 'title'],
    ['data-i18n-tooltip', 'data-tooltip'],
  ];

  for (const [sourceAttribute, targetAttribute] of attributes) {
    root.querySelectorAll(`[${sourceAttribute}]`).forEach((element) => {
      const messageName = element.getAttribute(sourceAttribute);
      if (messageName) {
        element.setAttribute(targetAttribute, getMessage(messageName));
      }
    });
  }
}
