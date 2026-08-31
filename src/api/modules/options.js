const DEFAULT_OPTIONS = {
  useSyntaxHighlighting: true,
  reloadOnChange: true,
  propertiesWordWrap: false, // TODO: Easily accessed/changed through GUI, should be stored in unsynced settings
  jsonTheme: '',
};

/**
 * @typedef {typeof DEFAULT_OPTIONS} Options
 * @typedef {keyof Options} OptionKey
 */

/**
 * Retrieves a single option value by key.
 *
 * @template {OptionKey} K
 * @param {K} key - The option key to retrieve ('useSyntaxHighlighting' | 'reloadOnChange' | 'propertiesWordWrap' | 'jsonTheme').
 * @returns {Promise<Options[K]>} A promise that resolves to the value of the specified option key.
 * @throws {TypeError} Throws synchronously if an invalid key is provided.
 */
export async function getOption(key) {
  if (!(key in DEFAULT_OPTIONS)) {
    throw new TypeError(
      `Invalid option key "${String(key)}". Allowed keys: ${Object.keys(DEFAULT_OPTIONS).join(', ')}`
    );
  }

  const defaultValue = DEFAULT_OPTIONS[key];
  const items = await chrome.storage.sync.get({ [key]: defaultValue });
  return items[key];
}

/**
 * Retrieves all stored options merged with defaults.
 *
 * @returns {Promise<Options>} A promise that resolves to the full options object.
 */
export async function getOptions() {
  const items = await chrome.storage.sync.get(DEFAULT_OPTIONS);

  return {
    useSyntaxHighlighting: Boolean(items?.useSyntaxHighlighting),
    reloadOnChange: Boolean(items?.reloadOnChange),
    propertiesWordWrap: Boolean(items?.propertiesWordWrap),
    jsonTheme: String(items?.jsonTheme ?? DEFAULT_OPTIONS.jsonTheme),
  };
}

/**
 * Saves one or more options to storage.
 *
 * @param {Partial<Options>} [options={}] - An object containing option key-value pairs to set.
 * @returns {Promise<boolean>} A promise that resolves to true when storage update completes.
 * @throws {Error} Throws if options argument is invalid or contains unrecognized keys.
 */
export async function setOptions(options = {}) {
  if (typeof options !== 'object' || options === null) {
    throw new Error('options must be an object');
  }

  const providedKeys = Object.keys(options);
  const allowedKeys = Object.keys(DEFAULT_OPTIONS);
  const invalid = providedKeys.filter((k) => !allowedKeys.includes(k));

  if (invalid.length) {
    throw new Error('Invalid option key(s): ' + invalid.join(', '));
  }

  // Only store the provided keys (do not write defaults)
  await chrome.storage.sync.set(options);
  return true;
}
