import { initPropertiesView } from "./modules/initPropertiesView.js";

export const restApiPath = "/rest-api/1";

async function init() {
  const jsonHolder = document.querySelector(".json-holder pre");
  if (!jsonHolder) {
    throw new Error("Missing required element: .json-holder pre");
  }

  await initPropertiesView();
}

init();