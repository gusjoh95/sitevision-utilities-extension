import { getActiveTab, getErrorMessage, getPageContext, getRequiredElement, isFirefox, registerCurrentTabChangeListener } from "../../api/index.js";
import { initCookieConsent } from "./modules/cookie.js";
import { initParamButtons } from "./modules/params.js";
import { initProperties } from "./modules/properties.js";

/** @type {HTMLDivElement} */
const appEl = getRequiredElement("#app");
const initialHTML = appEl.innerHTML;
let tabReloadListenerRegistered = false;


async function init() {
  try {
    const tab = await getActiveTab();
    const activeUrl = tab?.url;
    if (!activeUrl || (!activeUrl.startsWith("http") && !activeUrl.startsWith("https"))) {
      throw new Error("Wrong protocol on active tab. Please navigate to a page with http or https protocol and try again.");
    }

    const isSitevision = await getPageContext();
    if (!isSitevision) {
      throw new Error("Active tab is not a Sitevision site. Please navigate to a Sitevision page and try again.");
    }

    await initProperties();
    await initParamButtons();
    await initCookieConsent();

    if (!tabReloadListenerRegistered) {
      registerCurrentTabChangeListener(handleTabReload);
      tabReloadListenerRegistered = true;
    }
  } catch (error) {
    const msg = getErrorMessage(error);
    /** @type {HTMLDivElement} */
    const errEl = getRequiredElement("#error");
    errEl.textContent = `Error: ${msg}`;
  }
}

async function handleTabReload() {
  const firefox = await isFirefox();

  // Firefox drops the temporary activeTab permission when the popup page itself is reloaded or navigated.
  // Closing the popup is more reliable than resetting the DOM in that browser, while Chrome can still recover
  // by rebuilding the popup state from the current tab.
  if (firefox) {
    window.close();
    return;
  }

  appEl.innerHTML = initialHTML;
  await init();
}

init();
