import { getActiveTab, setProfiling } from "./api.js";

let tab = null;

async function getPageContext() {
  // https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#isolated_world

  // Accessing window-properties is probably efficient but maybe not a good idea security-wise.
  // Reminder: CSP applies in main world, might break or not work on certain sites.
  const [res] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: () => window.sv?.PageContext
  });

  return res?.result;
}

async function initProperties() {
  const form = document.getElementById("form");
  const nodeIdInput = document.getElementById("node-id-input");
  nodeIdInput.focus();

  const currentPageId = document.querySelector("#current-page-id");
  const currentUserId = document.querySelector("#current-user-id");
  const { pageId, userIdentityId } = await getPageContext();
  if(pageId) {
    currentPageId.value = pageId;
    document.querySelector("button[type='submit'][value='getCurrentPage']").removeAttribute("disabled");
  }

  if(userIdentityId) {
    currentUserId.value = userIdentityId;
    document.querySelector("button[type='submit'][value='getCurrentUser']").removeAttribute("disabled");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const version = document.querySelector(
      'input[name="radio"]:checked'
    )?.value;

    let node = "";
    const submitAction = event.submitter.value;

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


    const origin = new URL(tab?.url).origin;
    try {
      chrome.windows.create({
        url: "/views/properties/properties.html?origin=" + origin + "&version=" + version + "&node=" + node,
        type: "popup",
        width: 1000,
        height: 600
      });

    } catch (error) {

      document.getElementById("properties-error").textContent =
        `Error: ${error.message}`;
    }

  });
};



async function initProfilingButton() {
  const toggleProfilingCheckbox = document.getElementById("toggle-profiling");

  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () =>
      [...document.querySelectorAll("body table th")]
        .some(th => th.textContent.trim() === "Profiling results")
  });

  toggleProfilingCheckbox.checked = result;

  toggleProfilingCheckbox.addEventListener("change", async (event) => {
    const isChecked = event.target.checked;
    const success = await setProfiling(isChecked);

    if (success) {
      // TODO, add reload as an extension-option 
      if (tab.url && !tab.url.includes("/edit")) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.location.reload()
        });
      }
    }
  });
}

try {
  tab = await getActiveTab();
  if (!tab?.url.startsWith("http") && !tab?.url.startsWith("https")) {
    throw new Error("Wrong protocol on active tab. Please navigate to a page with http or https protocol and try again.");
  }
  initProperties();
  initProfilingButton();
} catch (e) {
  document.getElementById("error").textContent = `Error: ${e.message}`;
}