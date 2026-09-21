/**
 * Retrieves the tab in which the extension action was invoked.
 *
 * @returns {Promise<chrome.tabs.Tab | undefined>}
 */
export async function getInvocationTab() {
  const [tab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  return tab;
}
