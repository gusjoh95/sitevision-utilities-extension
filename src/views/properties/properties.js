import { renderJSON } from "./renderJson.js";

export let restApiPath = '/rest-api/1';

const params = new URLSearchParams(window.location.search);

const origin = params.get("origin");
const version = params.get("version");
const node = params.get("node");


const url = `${origin}${restApiPath}/${version}/${node}/properties`;
const el = document.getElementById("properties");
const useSyntaxHighlightingToggle = document.getElementById("useSyntaxHighlighting");
const useDummyJsonToggle = document.getElementById("useDummyJson");

document.title = url;

let data = null;

try {
	async function getJson({dummy = false}) {
		if (dummy) {
			const response = await fetch(chrome.runtime.getURL("views/properties/dummydata/dummy.json"));
			if (!response.ok) {
				throw new Error(`Failed to fetch dummy JSON: ${response.statusText}`);
			}
			return await response.json();
		}

		const response = await fetch(url);

		if (!response.ok) {
			const errorJson = await response.json();
			throw new Error(`HTTP error! status: ${response.status} \nMessage: ${JSON.stringify(errorJson) || "No error message provided"}`);
		}
		return await response.json();
	}


	data = await getJson({useDummy: useDummyJsonToggle.checked});
	
	async function render() {
		

		if (useSyntaxHighlightingToggle.checked) {
			el.innerHTML = renderJSON(data);
		} else {
			el.textContent = JSON.stringify(data, null, 2);
		}
	}


	if (!data) {
		throw new Error("Empty response body");
	}
	render();
	useSyntaxHighlightingToggle.addEventListener("change", render);
	useDummyJsonToggle.addEventListener("change", async () => {
		data = await getJson({dummy: useDummyJsonToggle.checked});
		render();
	});

}
catch (e) {
	console.error("Fetch failed:", e);
	document.getElementById("properties").textContent = `Error: ${e.message}`;

}





// console.log(properties);