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
	await fetch(`${origin}/?profiling=${bool}`, {
		credentials: "include"
	});

	// TODO, add reload as an extension-option 
	if (!url.toString().includes("/edit")) {
		chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: () => window.location.reload()
		});
	}
}