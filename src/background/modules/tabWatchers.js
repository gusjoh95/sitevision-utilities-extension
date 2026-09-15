/**
 * @typedef {Object} ActiveTarget
 * @property {number} tabId - Target browser tab identifier.
 * @property {string} origin - Expected baseline origin.
 */

/**
 * Attaches background watchers to track active target tab closure or cross-origin navigation.
 *
 * @returns {void}
 */
export function registerTabWatchers() {
  /** @type {Map<number, ActiveTarget>} */
  const activeTargets = new Map();

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'SET_ACTIVE_TARGET') {
      activeTargets.set(msg.tabId, { tabId: msg.tabId, origin: msg.origin });
    }
  });

  // 1. Detect if the tab is completely closed
  chrome.tabs.onRemoved.addListener((tabId) => {
    if (activeTargets.has(tabId)) {
      chrome.runtime.sendMessage({ type: 'TARGET_LOST', tabId, reason: 'closed' });
      activeTargets.delete(tabId);
    }
  });

  // 2. Detect if the tab reloads or navigates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Skip immediately if it's the wrong tab or not in loading state
    const activeTarget = activeTargets.get(tabId);
    if (!activeTarget) return;
    if (changeInfo.status !== 'loading') return;

    // tab.pendingUrl is available during navigation, tab.url is the current address
    const currentUrl = tab.pendingUrl || tab.url;

    // If Chrome hides the URL, the activeTab permission was lost (likely cross-origin)
    if (!currentUrl) {
      console.warn('ActiveTab permission lost! Chrome hid the URL. Likely cross-origin redirect.');
      chrome.runtime.sendMessage({ type: 'TARGET_LOST', tabId, reason: 'cross-origin' });
      activeTargets.delete(tabId);
      return;
    }

    try {
      const currentOrigin = new URL(currentUrl).origin;

      // If the URL is visible but the origin differs from the starting point
      if (currentOrigin !== activeTarget.origin) {
        console.warn(
          `Origin changed! Started at ${activeTarget.origin} but navigated to ${currentOrigin}`
        );
        chrome.runtime.sendMessage({ type: 'TARGET_LOST', tabId, reason: 'cross-origin' });
        activeTargets.delete(tabId);
      }
    } catch {
      // If the URL cannot be parsed (e.g., chrome:// or about:blank)
      chrome.runtime.sendMessage({ type: 'TARGET_LOST', tabId, reason: 'cross-origin' });
      activeTargets.delete(tabId);
    }
  });
}
