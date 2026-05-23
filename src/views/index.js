import { getActiveTab, setProfiling } from "./api.js";

let tab = null;

function initProperties() {
  const form = document.getElementById("form");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("input");

    const version = document.querySelector(
      'input[name="radio"]:checked'
    )?.value;

    const node = input.value;

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