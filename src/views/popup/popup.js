import { getActiveTab, getPageContext, registerCurrentTabChangeListener } from "../shared/api.js";
import { initProperties } from "./modules/properties.js";
import { initParamButtons } from "./modules/params.js";
import { initCookieConsent } from "./modules/cookie.js";
try {
  const tab = await getActiveTab();
  if (!tab?.url.startsWith("http") && !tab?.url.startsWith("https")) {
    throw new Error("Wrong protocol on active tab. Please navigate to a page with http or https protocol and try again.");
  }
  const isSitevision = await getPageContext();
  if (!isSitevision) {
    throw new Error("Active tab is not a Sitevision site. Please navigate to a Sitevision page and try again.");
  }
  await initProperties();
  await initParamButtons();
  await initCookieConsent();

  //Reloads extension-popup if active tab is reloaded
  registerCurrentTabChangeListener();

} catch (e) {
  document.getElementById("error").textContent = `Error: ${e.message}`;
}
