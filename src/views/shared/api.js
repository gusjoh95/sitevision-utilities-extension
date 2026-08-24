export async function getActiveTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return tab;
}

/**
 * Update the current page session by adding a query parameter.
 * @param {string} param - The query parameter name to set (e.g. "jsdebug").
 * @param {boolean} value - The boolean value to set for the parameter.
 * @returns {Promise<boolean>} Resolves true when the injected fetch returned OK, otherwise false.
 */
export async function updateSessionWithParam(param, value) {
  if (!param || typeof value !== 'boolean') {
    throw new Error('Missing param or value when trying to update session');
  }
  const tab = await getActiveTab();
  if (!tab.id || !tab.url) return false;

  const url = new URL(tab.url);
  const origin = url.origin;
  const reqUrl = `${origin}?${param}=${encodeURIComponent(String(Boolean(value)))}`;

  // Cant figure out a way to perform request within extension context without erroneous log-entries.
  // Execute the fetch within the context of the active tab as solution.
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (/** @type {string} */ urlToFetch) => {
        try {
          const r = await fetch(urlToFetch, {
            method: "GET",
            headers: { "Accept": "text/plain" }
          });
          return Boolean(r.ok);
        } catch {
          return false;
        }
      },
      args: [reqUrl]
    });

    return Boolean(results?.[0]?.result);
  } catch {
    return false;
  }
}

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

/**
 * Asynchronously loads and applies the user-selected JSON theme to a given link element.
 * @param {HTMLLinkElement} linkElement - The HTML link element whose href will be updated.
 * @returns {void}
 */
export function assignJsonTheme(linkElement) {
  getOptions().then(opts => {
    const themeFile = opts?.jsonTheme;
    if (!themeFile) return;
    linkElement.href = chrome.runtime.getURL(`views/shared/json-themes/${themeFile}`);
  });
}

/**
 * Reloads the currently active tab using chrome.scripting, provided it's not in edit mode.
 * Can optionally bypass the "reloadOnChange" user setting.
 * @param {boolean} [respectOption=true] - Whether to respect the "reloadOnChange" user option.
 * @returns {Promise<void>} Resolves when the script has been executed on the tab.
 */
export async function reloadCurrentTab(respectOption = true) {
  const tab = await getActiveTab();
  if (tab.url && !tab.url.includes("/edit")) {
    const { reloadOnChange } = respectOption ? await getOptions() : { reloadOnChange: true };
    if (reloadOnChange) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.location.reload()
      });
    }
  }
}


/**
 * Parse a JSON string or object and return a DocumentFragment with syntax highlighting applied.
 * @param {string|JSON} input - The JSON string or object to highlight.
 * @returns {DocumentFragment} Highlighted JSON as a DocumentFragment ready for DOM insertion.
 */
export function highlightJson(input) {
  const json = typeof input === "string" ? input : JSON.stringify(input, null, 2);

  const svIdPattern = /^\d{1,3}\.[0-9a-z]+(?:_.+)?$/;

  // Group 1: Matches the entire quoted string
  // Group 2 (\s*:): Optional capturing group to check for trailing whitespace + colon
  const tokenRe = /("(?:\\u[0-9a-fA-F]{4}|\\[^u]|[^\\"])*")(\s*:)?|\b(?:true|false|null)\b|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/gu;

  const frag = document.createDocumentFragment();

  const createSpan = (className, text) => {
    const el = document.createElement("span");
    el.className = className;
    el.textContent = text;
    return el;
  };

  let lastIndex = 0;
  let m;

  while ((m = tokenRe.exec(json)) !== null) {
    const idx = m.index;

    // Append punctuation or whitespace between tokens
    if (idx > lastIndex) {
      frag.appendChild(document.createTextNode(json.slice(lastIndex, idx)));
    }

    const token = m[0];

    // If the first group (the quoted string) matched...
    if (m[1] !== undefined) {
      const stringLiteral = m[1];
      const hasColon = m[2] !== undefined; // If Group 2 exists, it's a JSON key!

      if (hasColon) {
        // Append the string and its trailing colon/whitespace together as the key
        frag.appendChild(createSpan("json-key", token));
      } else {
        const inner = stringLiteral.slice(1, -1);
        const className = svIdPattern.test(inner) ? "json-id" : "json-string";
        frag.appendChild(createSpan(className, stringLiteral));
      }
    }
    else if (token === "true" || token === "false") {
      frag.appendChild(createSpan("json-boolean", token));
    }
    else if (token === "null") {
      frag.appendChild(createSpan("json-null", token));
    }
    else {
      frag.appendChild(createSpan("json-number", token));
    }

    lastIndex = tokenRe.lastIndex;
  }

  if (lastIndex < json.length) {
    frag.appendChild(document.createTextNode(json.slice(lastIndex)));
  }

  return frag;
}

/**
 * Reload extension popup when active tab is updated, but only after the update is complete and only if the updated tab is the active one.
 * @returns {void} Highlighted JSON as a DocumentFragment ready for DOM insertion.
 */
export function registerCurrentTabChangeListener() {
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    const activeTab = await getActiveTab();
    if (!activeTab) return;

    // Wait for the tab update to complete and check if the updated tab is the active one before reloading the popup
    if (tabId === activeTab.id && changeInfo.status === 'complete') {
      console.log("Reloading popup due to active tab update...");
      window.location.reload();
    }
  });
}

/**
 * Retrieves the Sitevision PageContext object from the active tab.
 * @description Executes a script in the page's MAIN world context to access the global
 * page metadata object, which is inaccessible from the standard ISOLATED world.
 * @note
 * - CSP: Running in the MAIN world means the script is subject to the page's Content Security Policy.
 * @returns {Promise<any>} Resolves to the PageContext object, or undefined if unavailable.
 */
export async function getPageContext() {
  // https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#isolated_world
  // Reminder: CSP applies in main world, might break or not work on certain sites.

  const tab = await getActiveTab();
  const [res] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: () => {
      /** @type {HTMLIFrameElement} */
      const editFrame = document.querySelector('#content-frame');
      const editFrameWindow = editFrame?.contentWindow;
      return window['sv']?.PageContext || editFrameWindow['sv']?.PageContext
    }
  });

  return res?.result;
}
