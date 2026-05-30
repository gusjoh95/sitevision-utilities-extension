import { getActiveTab, registerCurrentTabChangeListener, reloadCurrentTab, updateSessionWithParam } from "../shared/api.js";

let tab = null;

async function getPageContext() {
  // https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts#isolated_world

  // Accessing window-properties is probably efficient but maybe not a good idea security-wise.
  // Reminder: CSP applies in main world, might break or not work on certain sites.
  const [res] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    world: "MAIN",
    func: () => window['sv']?.PageContext
  });

  return res?.result;
}

async function initProperties() {
  const form = document.getElementById("properties-form");

  /** @type {HTMLInputElement} */
  const nodeIdInput = document.querySelector("#node-id-input");
  nodeIdInput.focus();

  /** @type {HTMLInputElement} */
  const currentPageId = document.querySelector("#current-page-id");
  /** @type {HTMLInputElement} */
  const currentUserId = document.querySelector("#current-user-id");
  const { pageId, userIdentityId } = await getPageContext();
  if (pageId) {
    currentPageId.value = pageId;
    document.querySelector("button[type='submit'][value='getCurrentPage']").removeAttribute("disabled");
  }

  if (userIdentityId) {
    currentUserId.value = userIdentityId;
    document.querySelector("button[type='submit'][value='getCurrentUser']").removeAttribute("disabled");
  }

  /** @param {SubmitEvent} event */
  async function onPropertiesSubmit(event) {
    event.preventDefault();


    const version =
      /** @type {HTMLInputElement | null} */ (
        document.querySelector('input[name="radio"]:checked')
      )?.value;

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


    const origin = new URL(tab?.url).origin;
    const anchorTabId = tab.id;
    try {
      chrome.windows.create({
        url: "/views/properties/properties.html?origin=" + origin + "&version=" + version + "&node=" + node + '&anchorTabId=' + anchorTabId,
        type: "popup",
        width: 1000,
        height: 600
      });

    } catch (error) {

      document.getElementById("properties-error").textContent =
        `Error: ${error.message}`;
    }

  }
  form.addEventListener("submit", onPropertiesSubmit);
};



async function initParamButtons() {

  const PARAMS = { profiling: 'profiling', jsdebug: 'jsdebug', slimrender: 'slimRender' };

  /** @type {HTMLInputElement} */
  const toggleProfilingCheckbox = document.querySelector("#toggle-profiling");
  /** @type {HTMLInputElement} */
  const toggleJsDebugCheckbox = document.querySelector("#toggle-jsdebug");
  /** @type {HTMLInputElement} */
  const toggleSlimrenderCheckbox = document.querySelector("#toggle-slimrender");

  async function getProfilingState() {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () =>
        [...document.querySelectorAll("body table th")]
          .some(th => th.textContent.trim() === "Profiling results")
    });
    return result;
  }

  async function getJsdebugState() {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // TODO Improve
        const minifiedTemplateAssetsSelector = 'script[src$="/sv-template-asset.js"], link[href$="/sv-template-asset.css"]';
        const minifiedWebappAssetsSelector = 'script[src$="/webapp-assets.js"]';
        const count1 = document.querySelectorAll(minifiedTemplateAssetsSelector)?.length;
        const count2 = document.querySelectorAll(minifiedWebappAssetsSelector)?.length;
        const minifiedAssetCount = count1 + count2;
        // Jsdebug is considered on if no minified assets
        return minifiedAssetCount === 0;
      }
    });
    return result;
  }

  async function getSlimrenderState() {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.querySelectorAll('head link[as="script"][href$="slim.js"]')?.length > 0
    });
    return result;
  }
  toggleProfilingCheckbox.checked = await getProfilingState();
  toggleJsDebugCheckbox.checked = await getJsdebugState();
  toggleSlimrenderCheckbox.checked = await getSlimrenderState();


  toggleProfilingCheckbox.addEventListener("change", async () => {
    const success = await updateSessionWithParam(PARAMS.profiling, toggleProfilingCheckbox.checked);
    if (success) {
      reloadCurrentTab()
    }
  });

  toggleJsDebugCheckbox.addEventListener("change", async () => {
    const success = await updateSessionWithParam(PARAMS.jsdebug, toggleJsDebugCheckbox.checked);
    if (success) {
      reloadCurrentTab()
    }
  });

  toggleSlimrenderCheckbox.addEventListener("change", async () => {
    const success = await updateSessionWithParam(PARAMS.slimrender, toggleSlimrenderCheckbox.checked);
    if (success) {
      reloadCurrentTab()
    }
  });
}

async function initCookieConsent() {
  const tab = await getActiveTab();
  const url = new URL(tab.url);
  const origin = `${url.protocol}//${url.hostname}/`;

  const cookieName = 'sv-cookie-consent';

  async function readSitevisionCookie() {
    chrome.cookies.get({
      url: tab.url,
      name: cookieName
    }, (cookie) => {
      const wrapper = document.getElementById("cookie-consent-wrapper");
      if (cookie) {
        /* 
        If I've understood correctly there are potentially two base64 encoded parts in the cookie, separated by a dot.
        The dot separates consented cookie and denied. I.e "Accept all" ends with a dot. 
        */
        const parts = cookie.value.split('.');
        const accepted = atob(parts[0] || '');
        const denied = atob(parts[1] || '');

        const acceptedCookieArr = accepted.split(',').filter(Boolean);
        const deniedCookieArr = denied.split(',').filter(Boolean);
        const acceptedPre = document.createElement("pre");
        acceptedPre.textContent = acceptedCookieArr.join('\n');
        const deniedPre = document.createElement("pre");
        deniedPre.textContent = deniedCookieArr.join('\n');
        wrapper.appendChild(document.createTextNode(`Accepted cookies (${acceptedCookieArr.length}):`));
        wrapper.appendChild(acceptedPre);
        wrapper.appendChild(document.createTextNode(`Denied cookies (${deniedCookieArr.length}):`));
        wrapper.appendChild(deniedPre);

        const deleteConsentCookieBtn = document.createElement("button");
        deleteConsentCookieBtn.textContent = "Delete consent cookie";
        wrapper.appendChild(deleteConsentCookieBtn);
        deleteConsentCookieBtn.addEventListener("click", () => {
          chrome.cookies.remove({
            url: tab.url,
            name: cookieName
          }, async (details) => {
            console.log(`Deleted cookie: ${details}`);
            reloadCurrentTab(false);
          });
        });
      } else {
        wrapper.appendChild(document.createTextNode(`Cookie "${cookieName}" not found`));
      }
    });
  }
  async function requestCookiePermission() {
    chrome.permissions.request({
      permissions: ['cookies'],
      origins: [origin]
    }, (granted) => {
      if (granted) {
        readSitevisionCookie();
      } else {
        console.log("User denied cookie permission.");
      }
    });
  }

  chrome.permissions.contains({ permissions: ['cookies'], origins: [origin] }, (hasPermission) => {
    if (hasPermission) {
      readSitevisionCookie();
    } else {
      const consentWrapper = document.getElementById("cookie-consent-wrapper");
      const promptBtn = document.createElement("button");
      promptBtn.id = "cookie-consent-prompt";
      promptBtn.textContent = `Host permission to read "${cookieName}" required`;
      consentWrapper.appendChild(promptBtn);

      promptBtn.addEventListener("click", async () => {
        await requestCookiePermission().then(() => {
          promptBtn.remove();
        });
      });
    }
  });
}

try {
  tab = await getActiveTab();
  if (!tab?.url.startsWith("http") && !tab?.url.startsWith("https")) {
    throw new Error("Wrong protocol on active tab. Please navigate to a page with http or https protocol and try again.");
  }
  // Add check if sitevision site?
  initProperties();
  initParamButtons();
  initCookieConsent();
  registerCurrentTabChangeListener();

} catch (e) {
  document.getElementById("error").textContent = `Error: ${e.message}`;
}
