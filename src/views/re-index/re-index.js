import { dom, errors, pageContext, spinner, targetTab } from '../../api/index.js';
import { getCurrentState } from './modules/getCurrentState.js'; // Getting params could be done in the API layer instead of the view layer.
import { runReindex, previewReindex, cancelReindex } from './modules/runReindex.js';
import { fetchNodeProperties } from './modules/restApi.js';
import { bindDelaySettings } from './modules/delaySettings.js';
import { DEFAULT_API_DELAY_MS, DEFAULT_REINDEX_DELAY_MS } from './modules/reindexQueue.js';

/**
 * Retrieves the CSRF token from PageContext, falling back to edit-mode bootstrap data.
 *
 * @param {number} tabId - ID of the Sitevision tab.
 * @returns {Promise<string | null>} The CSRF token, or null when unavailable.
 */
async function getBootstrapCsrfToken(tabId) {
  const context = await pageContext.getPageContext(tabId);
  if (context?.csrfToken) {
    return context.csrfToken;
  }

  const token = await targetTab.executeScript(
    tabId,
    () => window.bootstrapData?.csrfToken ?? null,
    [],
    {
      world: 'MAIN',
    }
  );

  return token ?? null;
}

/**
 * Initializes controls for the recursive reindex view.
 *
 * @returns {Promise<void>} Resolves after the view event handlers are registered.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const { origin, anchorTabId, rootNodeId } = getCurrentState();

  const startBtn = /** @type {HTMLButtonElement} */ (dom.getRequiredElement('#start-reindex-btn'));
  const previewBtn = /** @type {HTMLButtonElement} */ (
    dom.getRequiredElement('#preview-reindex-btn')
  );
  const cancelBtn = /** @type {HTMLButtonElement} */ (
    dom.getRequiredElement('#cancel-reindex-btn')
  );
  const spinnerEl = dom.getRequiredElement('#spinner');
  const includeRobotsIndexFalse = /** @type {HTMLInputElement} */ (
    dom.getRequiredElement('#include-robots-index-false')
  );
  const reindexDelayInput = /** @type {HTMLInputElement} */ (
    dom.getRequiredElement('#reindex-delay-ms')
  );
  const apiDelayInput = /** @type {HTMLInputElement} */ (dom.getRequiredElement('#api-delay-ms'));
  const lowDelayWarning = /** @type {HTMLDialogElement} */ (
    dom.getRequiredElement('#low-delay-warning')
  );
  const nodeOutput = /** @type {HTMLOutputElement} */ (dom.getRequiredElement('#current-node-id'));
  const errorElement = dom.getRequiredElement('#error');
  let csrfToken = null;
  /** @type {import('./modules/types.js').DiscoveredNode | null} */
  let rootNode = null;

  const { getReindexDelayMs, getApiDelayMs } = bindDelaySettings({
    reindexDelayInput,
    apiDelayInput,
    lowDelayWarning,
    defaultReindexDelayMs: DEFAULT_REINDEX_DELAY_MS,
    defaultApiDelayMs: DEFAULT_API_DELAY_MS,
  });

  function getQueueOptions() {
    return {
      includeRobotsIndexFalse: includeRobotsIndexFalse.checked,
      reindexDelayMs: getReindexDelayMs,
      apiDelayMs: getApiDelayMs,
    };
  }

  /**
   * @param {boolean} disabled
   */
  function setIndexingOptionDisabled(disabled) {
    includeRobotsIndexFalse.disabled = disabled;
  }

  /** @param {() => Promise<void>} operation */
  async function runWithQueueControls(operation) {
    startBtn.disabled = true;
    previewBtn.disabled = true;
    cancelBtn.disabled = false;
    setIndexingOptionDisabled(true);

    try {
      await spinner.withDeferredSpinner(operation, { spinnerEl, delayMs: 250 });
    } finally {
      startBtn.disabled = false;
      previewBtn.disabled = false;
      cancelBtn.disabled = true;
      setIndexingOptionDisabled(false);
    }
  }

  try {
    const rootProperties = await fetchNodeProperties(Number(anchorTabId), origin, rootNodeId);
    // Strip "_sitePage" suffix from the UUID if present.
    rootNode = {
      id: rootProperties['jcr:uuid'].includes('_')
        ? rootProperties['jcr:uuid'].split('_')[0]
        : rootProperties['jcr:uuid'],
      type: rootProperties['jcr:primaryType'],
      displayName: rootProperties.displayName ?? '',
      robotsIndex: rootProperties.robotsIndex !== false,
    };
    nodeOutput.value = rootNode.id;
    nodeOutput.textContent = rootNode.id;
  } catch (err) {
    errorElement.textContent = `Error: ${errors.messageOf(err)}`;
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
    errorElement.textContent = `Error: ${errors.messageOf(err)}`;
    startBtn.disabled = true;
    previewBtn.disabled = true;
  }

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

      await runWithQueueControls(() =>
        runReindex(Number(anchorTabId), origin, rootNode, token, getQueueOptions())
      );
    })();
  });

  previewBtn?.addEventListener('click', () => {
    void (async () => {
      if (!rootNode) {
        errorElement.textContent = 'Error: Root node properties are unavailable.';
        return;
      }

      await runWithQueueControls(() =>
        previewReindex(Number(anchorTabId), origin, rootNode, getQueueOptions())
      );
    })();
  });

  cancelBtn?.addEventListener('click', () => {
    cancelReindex();
    cancelBtn.disabled = true;
  });
});
