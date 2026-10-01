import { dom, errors, targetTab } from '../../../api/index.js';

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
    const runtime = browser.runtime;
    return runtime.lastError;
  }

  function readSitevisionCookie() {
    return new Promise((resolve, reject) => {
      browser.cookies.get({ url: safeTabUrl, name: cookieName }, (cookie) => {
        const runtimeError = getRuntimeError();
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }

        try {
          /** @type {HTMLDivElement} */
          const infoWrapper = dom.getRequiredElement('#cookie-consent-info');
          /** @type {HTMLParagraphElement} */
          const acceptedLabel = dom.getRequiredElement('#cookie-consent-accepted-label');
          /** @type {HTMLPreElement} */
          const acceptedValues = dom.getRequiredElement('#cookie-consent-accepted-values');
          /** @type {HTMLParagraphElement} */
          const deniedLabel = dom.getRequiredElement('#cookie-consent-denied-label');
          /** @type {HTMLPreElement} */
          const deniedValues = dom.getRequiredElement('#cookie-consent-denied-values');
          /** @type {HTMLParagraphElement} */
          const missingCookieMessage = dom.getRequiredElement('#cookie-consent-missing');
          /** @type {HTMLButtonElement} */
          const deleteConsentCookieBtn = dom.getRequiredElement('#cookie-consent-delete-button');

          infoWrapper.hidden = false;
          missingCookieMessage.hidden = true;
          missingCookieMessage.textContent = '';
          acceptedValues.textContent = '';
          deniedValues.textContent = '';
          deleteConsentCookieBtn.hidden = false;

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

            acceptedLabel.textContent = `Accepted cookies (${acceptedCookieArr.length}):`;
            acceptedValues.textContent = acceptedCookieArr.join('\n');
            deniedLabel.textContent = `Denied cookies (${deniedCookieArr.length}):`;
            deniedValues.textContent = deniedCookieArr.join('\n');

            deleteConsentCookieBtn.onclick = async () => {
              try {
                await new Promise((resolve, reject) => {
                  browser.cookies.remove({ url: safeTabUrl, name: cookieName }, (details) => {
                    const runtimeError = getRuntimeError();
                    if (runtimeError) {
                      reject(new Error(runtimeError.message));
                      return;
                    }
                    console.log(`Deleted cookie: ${details}`);
                    resolve(undefined);
                  });
                });
                await targetTab.reloadInvocationTab(tab, false);
              } catch (error) {
                dom.getRequiredElement('#error').textContent = `Error: ${errors.messageOf(error)}`;
              }
            };
          } else {
            acceptedLabel.textContent = '';
            deniedLabel.textContent = '';
            acceptedValues.textContent = '';
            deniedValues.textContent = '';
            missingCookieMessage.textContent = `Cookie "${cookieName}" not found`;
            missingCookieMessage.hidden = false;
            deleteConsentCookieBtn.hidden = true;
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
      browser.permissions.request({ permissions: ['cookies'], origins: [origin] }, (granted) => {
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
    /** @type {HTMLDivElement} */
    const promptWrapper = dom.getRequiredElement('#cookie-consent-prompt');
    browser.permissions.contains(
      { permissions: ['cookies'], origins: [origin] },
      (hasPermission) => {
        const runtimeError = getRuntimeError();
        if (runtimeError) {
          reject(new Error(runtimeError.message));
          return;
        }
        if (hasPermission) {
          promptWrapper.hidden = true;
          readSitevisionCookie().then(resolve, reject);
        } else {
          /** @type {HTMLButtonElement} */
          const promptBtn = dom.getRequiredElement('#cookie-consent-prompt-button');
          const promptHelp = dom.getRequiredElement('#cookie-consent-prompt-help');

          promptHelp.textContent = `Host permissions for ${origin}, is required to read cookies. Please grant permissions by clicking the button below.`;
          promptBtn.disabled = false;
          promptBtn.addEventListener('click', async () => {
            try {
              if (await requestCookiePermission()) {
                promptWrapper.hidden = true;
              }
            } catch (error) {
              dom.getRequiredElement('#error').textContent = `Error: ${errors.messageOf(error)}`;
            }
          });
          resolve(undefined);
        }
      }
    );
  });
}
