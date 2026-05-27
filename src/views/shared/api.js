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
	if(!param || typeof value !== 'boolean'){
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
    reloadOnChange: false
};

export async function getOptions() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(DEFAULT_OPTIONS, (items) => {
            resolve({
                useSyntaxHighlighting: Boolean(items?.useSyntaxHighlighting),
                reloadOnChange: Boolean(items?.reloadOnChange)
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