import { getActiveTab, getErrorMessage, getPageContext, getRequiredElement } from "../../../api/index.js";

export async function initProperties() {
	/** @type {HTMLFormElement} */
	const form = getRequiredElement("#properties-form");
	/** @type {HTMLInputElement} */
	const nodeIdInput = getRequiredElement("#node-id-input");
	nodeIdInput.focus();
	/** @type {HTMLInputElement} */
	const currentPageId = getRequiredElement("#current-page-id");
	/** @type {HTMLInputElement} */
	const currentUserId = getRequiredElement("#current-user-id");
	const { pageId, userIdentityId } = await getPageContext();
	if (pageId) {
		currentPageId.value = pageId;
		getRequiredElement("button[type='submit'][value='getCurrentPage']").removeAttribute("disabled");
	}

	if (userIdentityId) {
		currentUserId.value = userIdentityId;
		getRequiredElement("button[type='submit'][value='getCurrentUser']").removeAttribute("disabled");
	}

	/** @param {SubmitEvent} event */
	async function onPropertiesSubmit(event) {
		event.preventDefault();


		/** @type {HTMLInputElement} */
		const checkedRadio = getRequiredElement('input[name="radio"]:checked');
		const version = checkedRadio.value;

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
			/** @type {HTMLDivElement} */
			const errEl = getRequiredElement("#error");
			errEl.textContent = `Error: ${msg}`;
		}

	}
	form.addEventListener("submit", onPropertiesSubmit);
};
