import { getErrorMessage, getRequiredElement } from '../../api/index.js';
import { getCurrentState } from '../find-login/modules/getCurrentState.js'; // eller flytta getCurrentState till api/
import { runReindex, cancelReindex } from './modules/runReindex.js';

/**
 * Extracts the current Sitevision node ID from an edit URL.
 *
 * @param {string | undefined} url - URL of the Sitevision tab.
 * @returns {string | null} The node ID, or null when the URL is not an edit URL.
 */
function extractNodeId(url) {
  if (!url) return null;

  const match = new URL(url).pathname.match(/\/edit\/([^/]+)/);
  return match?.[1] ?? null;
}

/**
 * Reads the current node ID from the anchor tab.
 *
 * @param {number} tabId - ID of the Sitevision tab.
 * @returns {Promise<string>} The current node ID.
 * @throws {Error} If the tab URL is unavailable or is not a Sitevision edit URL.
 */
async function getCurrentNodeId(tabId) {
  const tab = await chrome.tabs.get(tabId);
  const nodeId = extractNodeId(tab.url);
  if (!nodeId) {
    throw new Error('Could not find a Sitevision node ID in the current tab URL.');
  }
  return nodeId;
}

/**
 * Retrieves the edit-mode CSRF token from the anchor tab.
 *
 * @param {number} tabId - ID of the Sitevision tab.
 * @returns {Promise<string | null>} The CSRF token, or null when unavailable.
 */
async function getBootstrapCsrfToken(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    world: 'MAIN',
    func: () => window.bootstrapData?.csrfToken ?? null,
  });

  return results[0]?.result ?? null;
}

/**
 * Initializes controls for the recursive reindex view.
 *
 * @returns {Promise<void>} Resolves after the view event handlers are registered.
 */
document.addEventListener('DOMContentLoaded', async () => {
  /** @type {{origin: string, anchorTabId: number}} */
  const { origin, anchorTabId } = getCurrentState();

  const startBtn = /** @type {HTMLButtonElement} */ (getRequiredElement('#start-reindex-btn'));
  const cancelBtn = /** @type {HTMLButtonElement} */ (getRequiredElement('#cancel-reindex-btn'));
  const nodeOutput = /** @type {HTMLOutputElement} */ (getRequiredElement('#current-node-id'));
  const errorElement = getRequiredElement('#error');
  let csrfToken = null;

  /**
   * Updates the displayed node ID from the current anchor tab.
   *
   * @returns {Promise<string>} The current node ID.
   */
  async function refreshCurrentNode() {
    const nodeId = await getCurrentNodeId(anchorTabId);
    nodeOutput.value = nodeId;
    nodeOutput.textContent = nodeId;
    errorElement.textContent = '';
    return nodeId;
  }

  try {
    await refreshCurrentNode();
    csrfToken = await getBootstrapCsrfToken(anchorTabId);
    if (!csrfToken) {
      throw new Error('No CSRF token found. Open a rendered Sitevision page in edit mode first.');
    }
  } catch (err) {
    errorElement.textContent = `Error: ${getErrorMessage(err)}`;
    startBtn.disabled = true;
  }

  /** @type {() => void} */
  startBtn?.addEventListener('click', () => {
    void (async () => {
      let rootNodeId;
      try {
        rootNodeId = await refreshCurrentNode();
      } catch (err) {
        errorElement.textContent = `Error: ${getErrorMessage(err)}`;
        return;
      }

      startBtn.disabled = true;
      cancelBtn.disabled = false;

      runReindex(anchorTabId, origin, rootNodeId, csrfToken).finally(() => {
        startBtn.disabled = false;
        cancelBtn.disabled = true;
      });
    })();
  });

  /** @type {() => void} */
  cancelBtn?.addEventListener('click', () => {
    cancelReindex();
    cancelBtn.disabled = true;
  });
});
