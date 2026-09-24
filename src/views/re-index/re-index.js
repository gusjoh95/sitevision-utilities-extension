import {
  executeInTab,
  getErrorMessage,
  getPageContext,
  getRequiredElement,
} from '../../api/index.js';
import { getCurrentState } from './modules/getCurrentState.js'; // Getting params could be done in the API layer instead of the view layer.
import { runReindex, previewReindex, cancelReindex } from './modules/runReindex.js';
import { fetchNodeProperties } from './modules/restApi.js';

/**
 * Retrieves the CSRF token from PageContext, falling back to edit-mode bootstrap data.
 *
 * @param {number} tabId - ID of the Sitevision tab.
 * @returns {Promise<string | null>} The CSRF token, or null when unavailable.
 */
async function getBootstrapCsrfToken(tabId) {
  const pageContext = await getPageContext(tabId);
  if (pageContext?.csrfToken) {
    return pageContext.csrfToken;
  }

  const token = await executeInTab(tabId, () => window.bootstrapData?.csrfToken ?? null, [], {
    world: 'MAIN',
  });

  return token ?? null;
}

/**
 * Initializes controls for the recursive reindex view.
 *
 * @returns {Promise<void>} Resolves after the view event handlers are registered.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const { origin, anchorTabId, rootNodeId } = getCurrentState();

  const startBtn = /** @type {HTMLButtonElement} */ (getRequiredElement('#start-reindex-btn'));
  const previewBtn = /** @type {HTMLButtonElement} */ (getRequiredElement('#preview-reindex-btn'));
  const cancelBtn = /** @type {HTMLButtonElement} */ (getRequiredElement('#cancel-reindex-btn'));
  const nodeOutput = /** @type {HTMLOutputElement} */ (getRequiredElement('#current-node-id'));
  const errorElement = getRequiredElement('#error');
  let csrfToken = null;
  /** @type {import('./modules/reindexQueue.js').DiscoveredNode | null} */
  let rootNode = null;

  try {
    const rootProperties = await fetchNodeProperties(Number(anchorTabId), origin, rootNodeId);
    rootNode = {
      id: rootProperties['jcr:uuid'],
      type: rootProperties['jcr:primaryType'],
      displayName: rootProperties.displayName ?? '',
      robotsIndex: rootProperties.robotsIndex !== false,
    };
    nodeOutput.value = rootNode.id;
    nodeOutput.textContent = rootNode.id;
  } catch (err) {
    errorElement.textContent = `Error: ${getErrorMessage(err)}`;
    startBtn.disabled = true;
    previewBtn.disabled = true;
  }

  try {
    csrfToken = await getBootstrapCsrfToken(Number(anchorTabId));
    if (!csrfToken) {
      throw new Error(
        `No CSRF token found – ensure that you're logged in. Reindexing will not be possible.`
      );
    }
  } catch (err) {
    errorElement.textContent = `Error: ${getErrorMessage(err)}`;
    startBtn.disabled = true;
    previewBtn.disabled = true;
  }

  /** @type {() => void} */
  startBtn?.addEventListener('click', () => {
    void (async () => {
      if (!rootNode) {
        errorElement.textContent = 'Error: Root node properties are unavailable.';
        return;
      }

      const token = csrfToken;
      if (!token) {
        errorElement.textContent = `Error: No CSRF token found – ensure that you're logged in.`;
        return;
      }

      startBtn.disabled = true;
      previewBtn.disabled = true;
      cancelBtn.disabled = false;

      runReindex(Number(anchorTabId), origin, rootNode, token).finally(() => {
        startBtn.disabled = false;
        previewBtn.disabled = false;
        cancelBtn.disabled = true;
      });
    })();
  });

  /** @type {() => void} */
  previewBtn?.addEventListener('click', () => {
    void (async () => {
      if (!rootNode) {
        errorElement.textContent = 'Error: Root node properties are unavailable.';
        return;
      }

      startBtn.disabled = true;
      previewBtn.disabled = true;
      cancelBtn.disabled = false;

      previewReindex(Number(anchorTabId), origin, rootNode).finally(() => {
        startBtn.disabled = false;
        previewBtn.disabled = false;
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
