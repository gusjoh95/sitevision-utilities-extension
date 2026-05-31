import { updateSessionWithParam, reloadCurrentTab, getActiveTab } from "../../shared/api.js";

export async function initParamButtons() {

	const PARAMS = { profiling: 'profiling', jsdebug: 'jsdebug', slimrender: 'slimRender' };

	/** @type {HTMLInputElement} */
	const toggleProfilingCheckbox = document.querySelector("#toggle-profiling");
	/** @type {HTMLInputElement} */
	const toggleJsDebugCheckbox = document.querySelector("#toggle-jsdebug");
	/** @type {HTMLInputElement} */
	const toggleSlimrenderCheckbox = document.querySelector("#toggle-slimrender");

	const tab = await getActiveTab();

	async function getProfilingState() {
		const [{ result }] = await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: () =>
				[...document.querySelectorAll("body table th")]
					.some(th => th.textContent.trim() === "Profiling results")
		});
		return result;
	}

	async function getJsdebugState() {
		const [{ result }] = await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: () => {
				// TODO Improve
				const minifiedTemplateAssetsSelector = 'script[src$="/sv-template-asset.js"], link[href$="/sv-template-asset.css"]';
				const minifiedWebappAssetsSelector = 'script[src$="/webapp-assets.js"]';
				const count1 = document.querySelectorAll(minifiedTemplateAssetsSelector)?.length;
				const count2 = document.querySelectorAll(minifiedWebappAssetsSelector)?.length;
				const minifiedAssetCount = count1 + count2;
				// Jsdebug is considered on if no minified assets
				return minifiedAssetCount === 0;
			}
		});
		return result;
	}

	async function getSlimrenderState() {
		const [{ result }] = await chrome.scripting.executeScript({
			target: { tabId: tab.id },
			func: () => document.querySelectorAll('head link[as="script"][href$="slim.js"]')?.length > 0
		});
		return result;
	}
	toggleProfilingCheckbox.checked = await getProfilingState();
	toggleJsDebugCheckbox.checked = await getJsdebugState();
	toggleSlimrenderCheckbox.checked = await getSlimrenderState();


	toggleProfilingCheckbox.addEventListener("change", async () => {
		const success = await updateSessionWithParam(PARAMS.profiling, toggleProfilingCheckbox.checked);
		if (success) {
			reloadCurrentTab()
		}
	});

	toggleJsDebugCheckbox.addEventListener("change", async () => {
		const success = await updateSessionWithParam(PARAMS.jsdebug, toggleJsDebugCheckbox.checked);
		if (success) {
			reloadCurrentTab()
		}
	});

	toggleSlimrenderCheckbox.addEventListener("change", async () => {
		const success = await updateSessionWithParam(PARAMS.slimrender, toggleSlimrenderCheckbox.checked);
		if (success) {
			reloadCurrentTab()
		}
	});
}