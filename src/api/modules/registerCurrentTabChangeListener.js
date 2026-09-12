import { getInvocationTab } from './getInvocationTab.js';

/**
 * Register a callback for active-tab update completion.
 * The callback is invoked once the updated tab is still the active tab and the load cycle is complete.
 * @param {() => void | Promise<void>} [onTabComplete] Optional function to call after the tab has finished reloading.
 * @returns {void}
 */
export function registerCurrentTabChangeListener(onTabComplete) {
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    try {
      const activeTab = await getInvocationTab();
      // Unsure why this doesnt fail in firefox.
      if (!activeTab) return;

      // Wait for the tab update to complete and check if the updated tab is the active one before executing the callback.
      if (tabId === activeTab.id && changeInfo.status === 'complete') {
        if (typeof onTabComplete === 'function') {
          await onTabComplete();
        }
      }
    } catch (error) {
      console.error('Failed to handle active tab update:', error);
    }
  });
}
