import { dom, i18n } from '../../../api/index.js';

/** @param {import('../../../api/types.js').ModelVersion} initialVersion */
export function initSearchForm(initialVersion) {
  /** @type {HTMLFormElement} */
  const form = dom.getRequiredElement('#search-form');
  /** @type {HTMLSelectElement} */
  const indexSelect = dom.getRequiredElement('#search-index');
  /** @type {HTMLTextAreaElement} */
  const queryInput = dom.getRequiredElement('#search-query');
  /** @type {HTMLInputElement} */
  const filterInput = dom.getRequiredElement('#search-filter');
  /** @type {HTMLInputElement} */
  const fieldsInput = dom.getRequiredElement('#search-fields');
  /** @type {HTMLSelectElement} */
  const limitSelect = dom.getRequiredElement('#search-limit');
  /** @type {HTMLButtonElement} */
  const submitButton = dom.getRequiredElement('#search-submit');
  /** @type {HTMLInputElement} */
  const onlineInput = dom.getRequiredElement('input[name="version"][value="1"]');
  /** @type {HTMLInputElement} */
  const offlineInput = dom.getRequiredElement('input[name="version"][value="0"]');
  const versionInputs = [onlineInput, offlineInput];

  onlineInput.checked = initialVersion === '1';
  offlineInput.checked = initialVersion === '0';
  queryInput.addEventListener('input', () => queryInput.setCustomValidity(''));
  limitSelect.addEventListener('change', () => limitSelect.setCustomValidity(''));
  queryInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  /** @returns {import('../../../api/types.js').ModelVersion} */
  function getVersion() {
    return offlineInput.checked ? '0' : '1';
  }

  /** @param {{ busy: boolean, targetLost: boolean }} state */
  function updateControls({ busy, targetLost }) {
    for (const input of [...versionInputs, queryInput, filterInput, fieldsInput, limitSelect]) {
      input.disabled = busy || targetLost;
    }
    indexSelect.disabled = busy || targetLost || indexSelect.options.length <= 1;
    submitButton.disabled = busy || targetLost || !indexSelect.value;
  }

  function resetIndexes() {
    indexSelect.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = i18n.getMessage('search_selectIndex');
    placeholder.disabled = true;
    placeholder.selected = true;
    indexSelect.append(placeholder);
  }

  /** @param {unknown} data */
  function populateIndexes(data) {
    if (!Array.isArray(data)) throw new Error(i18n.getMessage('search_invalidIndexes'));
    const defaultName = getVersion() === '0' ? 'Offline' : 'Online';
    for (const node of data) {
      if (
        node &&
        typeof node.id === 'string' &&
        typeof node.name === 'string' &&
        (node.type === 'sv:nodeIndex' || node.type === 'sv:applicationIndex')
      ) {
        const option = document.createElement('option');
        option.value = node.id;
        option.textContent = `${node.name} (${node.id})`;
        indexSelect.append(option);
        if (node.name === defaultName) indexSelect.value = node.id;
      }
    }
    if (indexSelect.options.length === 1) throw new Error(i18n.getMessage('search_noIndexes'));
  }

  /** @returns {import('../../../api/types.js').SearchOptions | null} */
  function getSearchOptions() {
    const query = queryInput.value.trim();
    if (!query) {
      queryInput.setCustomValidity(i18n.getMessage('search_queryRequired'));
      queryInput.reportValidity();
      return null;
    }
    const limit = Number(limitSelect.value);
    if (![10, 25, 50, 100].includes(limit)) {
      limitSelect.setCustomValidity(i18n.getMessage('search_invalidLimit'));
      limitSelect.reportValidity();
      return null;
    }
    const filterQuery = filterInput.value.trim();
    const fields = fieldsInput.value
      .split(',')
      .map((field) => field.trim())
      .filter(Boolean);
    return {
      query,
      limit,
      ...(filterQuery ? { filterQuery } : {}),
      ...(fields.length ? { fields } : {}),
    };
  }

  return {
    form,
    indexSelect,
    versionInputs,
    getVersion,
    getSearchOptions,
    updateControls,
    resetIndexes,
    populateIndexes,
  };
}
