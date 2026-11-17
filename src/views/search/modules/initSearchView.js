import { i18n, sitevisionRest, spinner, targetPermissions } from '../../../api/index.js';
import { getCurrentState } from './getCurrentState.js';
import { initSearchForm } from './searchForm.js';
import { initSearchResults } from './renderUI.js';

export async function initSearchView() {
  const { origin, anchorTabId, siteId, version } = getCurrentState();
  const controls = initSearchForm(version);
  const results = initSearchResults();
  const state = { busy: false, targetLost: false };

  function updateControls() {
    controls.updateControls(state);
  }

  async function loadIndexes() {
    if (state.busy || state.targetLost) return;
    state.busy = true;
    controls.resetIndexes();
    updateControls();
    results.showPending('search_loadingIndexes');
    try {
      await targetPermissions.assertTargetTabAccessible(anchorTabId, origin);
      if (state.targetLost) return;
      const data = await spinner.withDeferredSpinner(
        () =>
          sitevisionRest.fetchNodeResource(anchorTabId, origin, `${siteId}_indexRepository`, {
            modelVersion: controls.getVersion(),
            endpoint: 'nodes',
          }),
        { spinnerEl: results.spinnerElement, delayMs: 250 }
      );
      if (state.targetLost) return;
      controls.populateIndexes(data);
      results.clearResults();
    } catch (error) {
      if (!state.targetLost) results.showError(error);
    } finally {
      state.busy = false;
      updateControls();
    }
  }

  controls.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.busy || state.targetLost || !controls.indexSelect.value) return;
    const options = controls.getSearchOptions();
    if (!options) return;
    const indexId = controls.indexSelect.value;
    const modelVersion = controls.getVersion();

    state.busy = true;
    updateControls();
    results.showPending('search_searching');
    try {
      await targetPermissions.assertTargetTabAccessible(anchorTabId, origin);
      if (state.targetLost) return;
      const startedAt = performance.now();
      const result = await spinner.withDeferredSpinner(
        () =>
          sitevisionRest.searchIndex(anchorTabId, origin, indexId, { ...options, modelVersion }),
        { spinnerEl: results.spinnerElement, delayMs: 250 }
      );
      if (state.targetLost) return;
      results.showResults(result, {
        limit: options.limit,
        elapsedMs: performance.now() - startedAt,
      });
    } catch (error) {
      if (!state.targetLost) results.showError(error);
    } finally {
      state.busy = false;
      updateControls();
    }
  });

  for (const input of controls.versionInputs) {
    input.addEventListener('change', () => loadIndexes());
  }
  controls.indexSelect.addEventListener('change', () => {
    if (state.busy || state.targetLost) return;
    results.clearResults();
    updateControls();
  });

  if (!origin || !Number.isInteger(anchorTabId) || anchorTabId <= 0 || !siteId) {
    state.targetLost = true;
    results.showError(new Error(i18n.getMessage('search_missingContext')));
    updateControls();
    return;
  }

  const unregisterTargetListener = targetPermissions.registerTargetPermissionListener({
    tabId: anchorTabId,
    origin,
    onLost: ({ message }) => {
      state.targetLost = true;
      results.showTargetLost(message);
      updateControls();
    },
  });
  window.addEventListener('pagehide', unregisterTargetListener, { once: true });
  await loadIndexes();
}
