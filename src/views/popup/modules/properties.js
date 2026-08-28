import { getPageContext, getActiveTab, getErrorMessage } from "../../../api/index.js";

export async function initProperties() {
	const form = document.getElementById("properties-form");

	/** @type {HTMLInputElement} */
	const nodeIdInput = document.querySelector("#node-id-input");
	nodeIdInput.focus();

	/** @type {HTMLInputElement} */
	const currentPageId = document.querySelector("#current-page-id");
	/** @type {HTMLInputElement} */
	const currentUserId = document.querySelector("#current-user-id");
	const { pageId, userIdentityId } = await getPageContext();
	if (pageId) {
		currentPageId.value = pageId;
		document.querySelector("button[type='submit'][value='getCurrentPage']").removeAttribute("disabled");
	}

	if (userIdentityId) {
		currentUserId.value = userIdentityId;
		document.querySelector("button[type='submit'][value='getCurrentUser']").removeAttribute("disabled");
	}

	/** @param {SubmitEvent} event */
	async function onPropertiesSubmit(event) {
		event.preventDefault();


		const version =
			/** @type {HTMLInputElement | null} */ (
				document.querySelector('input[name="radio"]:checked')
			)?.value;

		let node;

		const submitter = /** @type {HTMLButtonElement | null} */ (event.submitter);
		const submitAction = submitter?.value;

		switch (submitAction) {
			case "getProperties":
				node = nodeIdInput.value.trim();
				break;
			case "getCurrentPage":
				node = currentPageId.value;
				break;
			case "getCurrentUser":
				node = currentUserId.value;
				break;
			default:
				console.warn("Unknown submit action", submitAction);
				return;
		}


		const tab = await getActiveTab();
		const origin = new URL(tab?.url).origin;
		const anchorTabId = tab.id;
		try {
			// const {useSyntaxHighlighting} = await getOptions();
			// const windowType = useSyntaxHighlighting ? "normal" : "popup";
			chrome.windows.create({
				url: "/views/properties/properties.html?origin=" + origin + "&version=" + version + "&node=" + node + '&anchorTabId=' + anchorTabId,
				type: "popup",
				width: 1000,
				height: 600
			});

		} catch (e) {
			const msg = getErrorMessage(e);
			const errEl = document.getElementById("error");
			errEl ? errEl.textContent = `Error: ${msg}` : console.error(msg);
		}

	}
	form.addEventListener("submit", onPropertiesSubmit);
};