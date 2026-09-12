import { getErrorMessage, getRequiredElement, reloadInvocationTab } from '../../../api/index.js';

/**
 * @param {chrome.tabs.Tab} tab - The active tab.
 */
export async function initCookieConsent(tab) {
  const activeTabUrl = tab?.url;
  if (!activeTabUrl) {
    throw new Error('No active tab URL available for cookie consent checks.');
  }
  /** @type {string} */
  const safeTabUrl = activeTabUrl;
  const url = new URL(safeTabUrl);
  const origin = `${url.protocol}//${url.hostname}/`;

  const cookieName = 'sv-cookie-consent';

  function getRuntimeError() {
    /** @type {any} */
    const runtime = chrome.runtime;
    return runtime.lastError;
  }

  function readSitevisionCookie() {
    return new Promise((resolve, reject) => {
      chrome.cookies.get({ url: safeTabUrl, name: cookieName }, (cookie) => {
        const runtimeError = getRuntimeError();
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }

        try {
          /** @type {HTMLDivElement} */
          const wrapper = getRequiredElement('#cookie-consent-wrapper');
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

            const acceptedHeading = document.createElement('p');
            acceptedHeading.textContent = `Accepted cookies (${acceptedCookieArr.length}):`;

            const acceptedPre = document.createElement('pre');
            acceptedPre.textContent = acceptedCookieArr.join('\n');

            const deniedHeading = document.createElement('p');
            deniedHeading.textContent = `Denied cookies (${deniedCookieArr.length}):`;

            const deniedPre = document.createElement('pre');
            deniedPre.textContent = deniedCookieArr.join('\n');

            wrapper.appendChild(acceptedHeading);
            wrapper.appendChild(acceptedPre);
            wrapper.appendChild(deniedHeading);
            wrapper.appendChild(deniedPre);

            const deleteConsentCookieBtn = document.createElement('button');
            deleteConsentCookieBtn.textContent = 'Delete consent cookie';
            wrapper.appendChild(deleteConsentCookieBtn);
            deleteConsentCookieBtn.addEventListener('click', async () => {
              try {
                await new Promise((resolve, reject) => {
                  chrome.cookies.remove({ url: safeTabUrl, name: cookieName }, (details) => {
                    const runtimeError = getRuntimeError();
                    if (runtimeError) {
                      reject(new Error(runtimeError.message));
                      return;
                    }
                    console.log(`Deleted cookie: ${details}`);
                    resolve(undefined);
                  });
                });
                await reloadInvocationTab(tab, false);
              } catch (error) {
                getRequiredElement('#error').textContent = `Error: ${getErrorMessage(error)}`;
              }
            });
          } else {
            wrapper.appendChild(document.createTextNode(`Cookie "${cookieName}" not found`));
          }
          resolve(undefined);
        } catch (error) {
          reject(error);
        }
      });
    });
  }
  function requestCookiePermission() {
    return new Promise((resolve, reject) => {
      chrome.permissions.request({ permissions: ['cookies'], origins: [origin] }, (granted) => {
        const runtimeError = getRuntimeError();
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        if (!granted) {
          console.log('User denied cookie permission.');
          resolve(false);
          return;
        }
        readSitevisionCookie().then(() => resolve(true), reject);
      });
    });
  }

  await new Promise((resolve, reject) => {
    chrome.permissions.contains(
      { permissions: ['cookies'], origins: [origin] },
      (hasPermission) => {
        const runtimeError = getRuntimeError();
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        if (hasPermission) {
          readSitevisionCookie().then(resolve, reject);
        } else {
          /** @type {HTMLDivElement} */
          const consentWrapper = getRequiredElement('#cookie-consent-wrapper');
          const promptBtn = document.createElement('button');
          promptBtn.id = 'cookie-consent-prompt';
          promptBtn.textContent = `Grant permissions`;
          const p = document.createElement('p');
          p.textContent = `Host permissions for ${origin}, is required to read cookies. Please grant permissions by clicking the button below.`;
          consentWrapper.appendChild(p);
          consentWrapper.appendChild(promptBtn);

          promptBtn.addEventListener('click', async () => {
            try {
              if (await requestCookiePermission()) {
                p.remove();
                promptBtn.remove();
              }
            } catch (error) {
              getRequiredElement('#error').textContent = `Error: ${getErrorMessage(error)}`;
            }
          });
          resolve(undefined);
        }
      }
    );
  });
}
