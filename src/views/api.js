export async function getActiveTab() {
	const [tab] = await chrome.tabs.query({
		active: true,
		currentWindow: true
	});

	return tab;
}


export async function setProfiling(bool) {
	const tab = await getActiveTab();
	if (!tab.id || !tab.url) return false;

	const url = new URL(tab.url);
	const origin = url.origin;
	const reqUrl = `${origin}?profiling=${encodeURIComponent(String(Boolean(bool)))}`;

	// Cant figure out a way to perform request within extension context without erroneous log-entries. 
	// Execute the fetch within the context of the active tab as solution.
	try {
		const results = await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: async (urlToFetch) => {
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
	} catch (e) {
		return false;
	}
}