const DEFAULT_OPTIONS = {
  useSyntaxHighlighting: true,
  reloadOnChange: true,
  propertiesWordWrap: false, // TODO: Easily accessed/changed through GUI, should be stored in unsynced settings
  jsonTheme: ""
};

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
      `Invalid option key "${String(key)}". Allowed keys: ${Object.keys(DEFAULT_OPTIONS).join(", ")}`
    );
  }

  const defaultValue = DEFAULT_OPTIONS[key];

  return new Promise((resolve) => {
    chrome.storage.sync.get({ [key]: defaultValue }, (items) => {
      resolve(items[key]);
    });
  });
}

/**
 * @typedef {typeof DEFAULT_OPTIONS} Options
 * @typedef {keyof Options} OptionKey
 */

/**
 * Retrieves all stored options merged with defaults.
 *
 * @returns {Promise<Options>} A promise that resolves to the full options object.
 */
export async function getOptions() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_OPTIONS, (items) => {
      resolve({
        useSyntaxHighlighting: Boolean(items?.useSyntaxHighlighting),
        reloadOnChange: Boolean(items?.reloadOnChange),
        propertiesWordWrap: Boolean(items?.propertiesWordWrap),
        jsonTheme: String(items?.jsonTheme)
      });
    });
  });
}

/**
 * Saves one or more options to storage.
 *
 * @param {Partial<Options>} [options={}] - An object containing option key-value pairs to set.
 * @returns {Promise<boolean>} A promise that resolves to true when storage update completes.
 * @throws {Error} Throws if options argument is invalid or contains unrecognized keys.
 */
export async function setOptions(options = {}) {
  return new Promise((resolve, reject) => {
    if (typeof options !== "object" || options === null) {
      reject(new Error("options must be an object"));
      return;
    }

    const providedKeys = Object.keys(options);
    const allowedKeys = Object.keys(DEFAULT_OPTIONS);
    const invalid = providedKeys.filter((k) => !allowedKeys.includes(k));
    if (invalid.length) {
      reject(new Error("Invalid option key(s): " + invalid.join(", ")));
      return;
    }

    // Only store the provided keys (do not write defaults)
    chrome.storage.sync.set(options, () => {
      resolve(true);
    });
  });
}
