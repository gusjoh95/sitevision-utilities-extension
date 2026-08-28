import { getActiveTab } from "./getActiveTab.js";

/**
 * Reload extension popup when active tab is updated, but only after the update is complete and only if the updated tab is the active one.
 * @returns {void} Highlighted JSON as a DocumentFragment ready for DOM insertion.
 */
export function registerCurrentTabChangeListener() {
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    const activeTab = await getActiveTab();
    if (!activeTab) return;

    // Wait for the tab update to complete and check if the updated tab is the active one before reloading the popup
    if (tabId === activeTab.id && changeInfo.status === 'complete') {
      console.log("Reloading popup due to active tab update...");
      window.location.reload();
    }
  });
}