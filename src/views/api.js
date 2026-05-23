export async function getActiveTab() {
	const [tab] = await chrome.tabs.query({
		active: true,
		currentWindow: true
	});

	return tab;
}


export async function setProfiling(bool) {
	const tab = await getActiveTab();

	if (!tab?.id) return;

	const url = new URL(tab.url);
	const origin = url.origin;
	// Possible issue if missing access to sitepage?
	try {
		const res = await fetch(`${origin}/?profiling=${bool}`, {
			credentials: "include"
		});

		const ok = res.ok; 

		return ok;
	} catch (e) {
		return false;
	}
}