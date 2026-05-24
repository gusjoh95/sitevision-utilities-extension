import { getOptions } from "../api.js";
import { renderJSON } from "./renderJson.js";

export let restApiPath = '/rest-api/1';

const params = new URLSearchParams(window.location.search);

const origin = params.get("origin");
const version = params.get("version");
let node = params.get("node");


const el = document.getElementById("properties");
const { useSyntaxHighlighting } = await getOptions();

async function init() {
	let data = null;
	try {
		let url = `${origin}${restApiPath}/${version}/${node}/properties`;
		async function getJson() {
			try {
				url = `${origin}${restApiPath}/${version}/${node}/properties`;
				// CORS ERROR in firefox when fetch is performed within extension context...
				const response = await fetch(url, {
					credentials: "include"
				});

				if (!response.ok) {
					const errorJson = await response.json();
					throw new Error(JSON.stringify(errorJson));
				}
				data = await response.json();
			} catch (error) {
				data = { error: 'Failed to fetch data.', message: error.message || 'No error message provided' };
			}
		}
		async function render(fromHistory = false) {
			try {
				document.title = url;

				if (!data) {
					throw new Error("No data to render");
				}
				if (useSyntaxHighlighting) {
					el.replaceChildren(renderJSON(data));
					el.querySelectorAll(".json-id").forEach(el => {
						el.addEventListener("click", async () => {
							node = el.textContent.replace(/"/g, "");
							await getJson();
							render();
						});
					});
				} else {
					el.textContent = JSON.stringify(data, null, 2);
				}
				if (!fromHistory) {
					history.pushState({ data, url }, "");
				}
			} catch (error) {
				el.textContent = `Error during rendering: ${error.message}`;
			}
		}

		window.addEventListener("popstate", (event) => {
			if (event.state) {
				data = event.state.data;
				url = event.state.url;
				render(true);
			}
		});
		await getJson();
		render();
	}
	catch (e) {
		document.getElementById("properties").textContent = `Error: ${e.message}`;
	}
}

init();
