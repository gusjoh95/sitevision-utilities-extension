const DEFAULT_OPTIONS = {
  useSyntaxHighlighting: true,
  reloadOnChange: false,
  jsonTheme: ""
};

export async function getOptions() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_OPTIONS, (items) => {
      resolve({
        useSyntaxHighlighting: Boolean(items?.useSyntaxHighlighting),
        reloadOnChange: Boolean(items?.reloadOnChange),
        jsonTheme: String(items?.jsonTheme)
      });
    });
  });
}

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
      reject(new Error("Invalid option keys: " + invalid.join(", ")));
      return;
    }

    // Only store the provided keys (do not write defaults)
    chrome.storage.sync.set(options, () => {
      resolve(true);
    });
  });
}
