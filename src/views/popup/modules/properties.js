import { getActiveTab, getErrorMessage, getPageContext, getRequiredElement } from "../../../api/index.js";

export async function initProperties() {
	/** @type {HTMLFormElement} */
	const form = getRequiredElement("#properties-form");
	/** @type {HTMLInputElement} */
	const propertiesIdInput = getRequiredElement("#properties-id-input");
	/** @type {HTMLInputElement} */
	const currentPageId = getRequiredElement("#current-page-id");
	/** @type {HTMLInputElement} */
	const currentUserId = getRequiredElement("#current-user-id");
  
	const { pageId, userIdentityId } = await getPageContext();

    propertiesIdInput.disabled = false;
  	propertiesIdInput.focus();

    /** @type {HTMLButtonElement} */ (getRequiredElement("button[type='submit'][value='getProperties']")).disabled = false;
    /** @type {HTMLInputElement} */ (getRequiredElement("#properties-online-mode")).disabled = false;
    /** @type {HTMLInputElement} */ (getRequiredElement("#properties-offline-mode")).disabled = false;

	if (pageId) {
		currentPageId.value = pageId;
		/** @type {HTMLButtonElement} */ (getRequiredElement("button[type='submit'][value='getCurrentPage']")).disabled = false;
	}

	if (userIdentityId) {
		currentUserId.value = userIdentityId;
		/** @type {HTMLButtonElement} */ (getRequiredElement("button[type='submit'][value='getCurrentUser']")).disabled = false;
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
				node = propertiesIdInput.value.trim();
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


    try {
      const tab = await getActiveTab();
      if (!tab?.url) {
        throw new Error("No active tab URL available for properties lookup.");
      }
      if(!node){
  	    propertiesIdInput.focus();
        return;
      }
      const origin = new URL(tab.url).origin;
      const anchorTabId = tab.id;
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
