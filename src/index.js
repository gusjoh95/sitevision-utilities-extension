// import tabUrl from "./scripts/globals";

import { getActiveTab } from "./api/getActiveTab.js";

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
    console.error("Fetch failed:", error);

    // valfritt: visa i UI
    document.getElementById("error-message").textContent =
      `Error: ${error.message}`;
  }

});

const checkbox = document.getElementById("toggle-jsdebug");

checkbox.addEventListener("change", (event) => {
  const isChecked = event.target.checked;

  console.log("Checkbox state:", isChecked);
});


