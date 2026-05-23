import { renderJSON } from "./renderJson.js";

export let restApiPath = '/rest-api/1';

const params = new URLSearchParams(window.location.search);

const origin = params.get("origin");
const version = params.get("version");
let node = params.get("node");


const el = document.getElementById("properties");
let useSyntaxHighlighting = chrome.storage.sync.get({ useSyntaxHighlighting: true }, (items) => {
	useSyntaxHighlighting = Boolean(items?.useSyntaxHighlighting);
});


let data = null;
try {
	async function getJson() {
		const url = `${origin}${restApiPath}/${version}/${node}/properties`;
		document.title = url;
		// CORS ERROR in firefox when fetch is performed within extension context...
		const response = await fetch(url, {
			credentials: "include"
		});

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
			el.replaceChildren(renderJSON(data));
			el.querySelectorAll(".json-id").forEach(el => {
				el.addEventListener("click", async () => {
					node = el.textContent.replace(/"/g, "");
					data = await getJson();
					render();
				});
			});
		} else {
			el.textContent = JSON.stringify(data, null, 2);
		}
	}

	render();

}
catch (e) {
	document.getElementById("properties").textContent = `Error: ${e.message}`;
}
