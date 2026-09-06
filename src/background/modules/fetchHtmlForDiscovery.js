import { getErrorMessage } from '../../api/index.js';

/**
 * Attaches the runtime message listener for discovery fetch requests.
 */
export function initFetchHtmlForDiscovery() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action !== 'fetchHtmlForDiscovery') {
      return;
    }

    (async () => {
      try {
        // Follows redirects automatically, giving us the final destination URL in res.url
        const res = await fetch(message.url);
        const html = await res.text();

        sendResponse({
          ok: res.ok,
          status: res.status,
          html,
          finalUrl: res.url,
        });
      } catch (err) {
        sendResponse({
          ok: false,
          status: 0,
          html: '',
          finalUrl: message.url,
          error: getErrorMessage(err),
        });
      }
    })();

    return true;
  });
}
