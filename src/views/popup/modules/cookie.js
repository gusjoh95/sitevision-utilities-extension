import { getActiveTab, reloadCurrentTab } from "../../../api/api.js";

export async function initCookieConsent() {
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
      promptBtn.textContent = `Grant permissions`;
      const p = document.createElement("p");
      p.textContent = `Host permissions for ${origin}, is required to read cookies. Please grant permissions by clicking the button below.`;
      consentWrapper.appendChild(p);
      consentWrapper.appendChild(promptBtn);

      promptBtn.addEventListener("click", async () => {
        await requestCookiePermission().then(() => {
          p.remove();
          promptBtn.remove();
        });
      });
    }
  });
}