import { getActiveTab, setProfiling } from "./api.js";

const form = document.getElementById("form");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.getElementById("input");

  const version = document.querySelector(
    'input[name="radio"]:checked'
  )?.value;

  const node = input.value;

  const tab = await getActiveTab();
  const origin = new URL(tab?.url).origin;
  try {
    chrome.windows.create({
      url: "views/properties/properties.html?origin=" + origin + "&version=" + version + "&node=" + node,
      type: "popup",
      width: 1000,
      height: 600
    });

  } catch (error) {

    document.getElementById("properties-error").textContent =
      `Error: ${error.message}`;
  }

});



async function initProfilingButton() {
  const toggleProfilingCheckbox = document.getElementById("toggle-profiling");
  const tab = await getActiveTab();

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
      if (tab.url && !tab.url.toString().includes("/edit")) {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.location.reload()
        });
      }
    }
  });
}

initProfilingButton();
