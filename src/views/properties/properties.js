import { getRequiredElement } from "../../api/index.js";
import { initPropertiesView } from "./modules/initPropertiesView.js";

export const restApiPath = "/rest-api/1";

async function init() {
  /** @type {HTMLPreElement} */
  const jsonHolder = getRequiredElement(".json-holder pre");
  void jsonHolder;

  await initPropertiesView();
}

init();
