import { renderJSON } from "./renderJson.js";

export let restApiPath = '/rest-api/1';

const params = new URLSearchParams(window.location.search);

const origin = params.get("origin");
const version = params.get("version");
const node = params.get("node");


const url = `${origin}${restApiPath}/${version}/${node}/properties`;
const el = document.getElementById("properties");
let useSyntaxHighlighting = chrome.storage.sync.get({ useSyntaxHighlighting: true }, (items) => {
	useSyntaxHighlighting = Boolean(items.useSyntaxHighlighting);
});

document.title = url;

let data = null;

try {
	async function getJson() {
		const response = await fetch(url);

		if (!response.ok) {
			const errorJson = await response.json();
			throw new Error(`HTTP error! status: ${response.status} \nMessage: ${JSON.stringify(errorJson) || "No error message provided"}`);
		}
		return await response.json();
	}


	data = await getJson();

	async function render() {
		if (!data) {
			throw new Error("No data to render");
		}
		if (useSyntaxHighlighting) {
			el.innerHTML = renderJSON(data);
		} else {
			el.textContent = JSON.stringify(data, null, 2);
		}
	}

	render();

}
catch (e) {
	document.getElementById("properties").textContent = `Error: ${e.message}`;
}
