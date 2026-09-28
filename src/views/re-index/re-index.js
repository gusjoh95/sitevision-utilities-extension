import {
  executeInTab,
  getErrorMessage,
  getPageContext,
  getRequiredElement,
} from '../../api/index.js';
import { getCurrentState } from './modules/getCurrentState.js'; // Getting params could be done in the API layer instead of the view layer.
import { runReindex, previewReindex, cancelReindex } from './modules/runReindex.js';
import { fetchNodeProperties } from './modules/restApi.js';
import { DEFAULT_API_DELAY_MS, DEFAULT_REINDEX_DELAY_MS } from './modules/reindexQueue.js';

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
 * Sets copy on the existing dialog elements using their semantic selectors.
 *
 * @param {HTMLDialogElement} dialog
 * @returns {void}
 */
function setLowDelayDialogText(dialog) {
  const title = dialog.querySelector('h2');
  const message = dialog.querySelector('p');
  const okButton = dialog.querySelector('button[value="ok"]');
  const cancelButton = dialog.querySelector('button[value="cancel"]');

  if (!title || !message || !okButton || !cancelButton) {
    throw new Error('Low-delay dialog is missing a required element.');
  }

  title.textContent = 'Low delay warning';
  message.textContent =
    'Delays below 100 ms are at your own risk. Low values may trigger rate limits or freeze your session.';
  okButton.textContent = 'OK';
  cancelButton.textContent = 'Cancel';
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
  const includeRobotsIndexFalse = /** @type {HTMLInputElement} */ (
    getRequiredElement('#include-robots-index-false')
  );
  const reindexDelayInput = /** @type {HTMLInputElement} */ (
    getRequiredElement('#reindex-delay-ms')
  );
  const apiDelayInput = /** @type {HTMLInputElement} */ (getRequiredElement('#api-delay-ms'));
  const lowDelayWarning = /** @type {HTMLDialogElement} */ (
    getRequiredElement('#low-delay-warning')
  );
  setLowDelayDialogText(lowDelayWarning);
  const nodeOutput = /** @type {HTMLOutputElement} */ (getRequiredElement('#current-node-id'));
  const errorElement = getRequiredElement('#error');
  let csrfToken = null;
  let hasAcknowledgedLowDelay = false;
  /** @type {import('./modules/reindexQueue.js').DiscoveredNode | null} */
  let rootNode = null;

  /**
   * @param {HTMLInputElement} input
   * @param {number} defaultDelayMs
   * @returns {number}
   */
  function readDelay(input, defaultDelayMs) {
    const delayMs = input.valueAsNumber;

    if (input.value.trim() === '' || !Number.isFinite(delayMs)) return defaultDelayMs;

    return Math.min(60000, Math.max(0, Math.ceil(delayMs / 25) * 25));
  }

  /**
   * @param {HTMLInputElement} input
   * @param {number} defaultDelayMs
   */
  function bindDelayInput(input, defaultDelayMs) {
    let acceptedDelayMs = readDelay(input, defaultDelayMs);
    input.value = String(acceptedDelayMs);

    input.addEventListener('change', () => {
      const requestedDelayMs = readDelay(input, defaultDelayMs);
      input.value = String(requestedDelayMs);

      if (requestedDelayMs >= 100 || hasAcknowledgedLowDelay) {
        acceptedDelayMs = requestedDelayMs;
        return;
      }

      lowDelayWarning.returnValue = '';
      lowDelayWarning.addEventListener(
        'close',
        () => {
          if (lowDelayWarning.returnValue === 'ok') {
            hasAcknowledgedLowDelay = true;
            acceptedDelayMs = requestedDelayMs;
          }
          input.value = String(acceptedDelayMs);
        },
        { once: true }
      );
      lowDelayWarning.showModal();
    });

    return () => acceptedDelayMs;
  }

  const getReindexDelayMs = bindDelayInput(reindexDelayInput, DEFAULT_REINDEX_DELAY_MS);
  const getApiDelayMs = bindDelayInput(apiDelayInput, DEFAULT_API_DELAY_MS);

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
      setIndexingOptionDisabled(true);

      runReindex(Number(anchorTabId), origin, rootNode, token, getQueueOptions()).finally(() => {
        startBtn.disabled = false;
        previewBtn.disabled = false;
        cancelBtn.disabled = true;
        setIndexingOptionDisabled(false);
      });
    })();
  });

  previewBtn?.addEventListener('click', () => {
    void (async () => {
      if (!rootNode) {
        errorElement.textContent = 'Error: Root node properties are unavailable.';
        return;
      }

      startBtn.disabled = true;
      previewBtn.disabled = true;
      cancelBtn.disabled = false;
      setIndexingOptionDisabled(true);

      previewReindex(Number(anchorTabId), origin, rootNode, getQueueOptions()).finally(() => {
        startBtn.disabled = false;
        previewBtn.disabled = false;
        cancelBtn.disabled = true;
        setIndexingOptionDisabled(false);
      });
    })();
  });

  cancelBtn?.addEventListener('click', () => {
    cancelReindex();
    cancelBtn.disabled = true;
  });
});
