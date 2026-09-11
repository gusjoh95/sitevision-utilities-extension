import {
  assignJsonTheme,
  getErrorMessage,
  getOptions,
  getRequiredElement,
  highlightJson,
  setOptions,
} from '../../api/index.js';

document.addEventListener('DOMContentLoaded', async () => {
  /** @type {HTMLInputElement} */
  const useSyntaxHighlighting = getRequiredElement('#use-syntax-highlighting');
  /** @type {HTMLInputElement} */
  const reloadOnChange = getRequiredElement('#reload-on-change');
  /** @type {HTMLPreElement} */
  const properties = getRequiredElement('#properties');
  /** @type {HTMLSelectElement} */
  const dropdown = getRequiredElement('#theme-dropdown');
  /** @type {HTMLButtonElement} */
  const saveBtn = getRequiredElement('#save');

  /** @type {HTMLLinkElement} */
  const themeLink = getRequiredElement('#json-theme');
  assignJsonTheme(themeLink);

  try {
    const opts = await getOptions();
    useSyntaxHighlighting.checked = Boolean(opts.useSyntaxHighlighting);
    reloadOnChange.checked = Boolean(opts.reloadOnChange);
    const jsonTheme = opts?.jsonTheme || '';
    try {
      const jsonUrl = chrome.runtime.getURL('resources/style/json-themes/themes.json');
      const response = await fetch(jsonUrl);
      if (!response.ok) {
        throw new Error(`Failed to load themes: HTTP ${response.status} ${response.statusText}`);
      }
      /** @type {{ file: string, name: string }[]} */
      const themes = await response.json();

      /**
       * @param {{ file: string, name: string }} theme
       */
      const renderTheme = (theme) => {
        const option = document.createElement('option');
        option.value = theme.file;
        option.selected = theme.file === jsonTheme;
        option.textContent = theme.name;
        dropdown.appendChild(option);
      };

      themes.forEach(renderTheme);
    } catch (error) {
      console.error('Failed to load themes', error);
      properties.textContent = getErrorMessage(error);
    }
    dropdown.addEventListener('change', () => {
      const selectedTheme = dropdown.value || 'default.css';
      themeLink.href = chrome.runtime.getURL(`resources/style/json-themes/${selectedTheme}`);
    });

    saveBtn.removeAttribute('disabled');
  } catch (error) {
    properties.textContent = getErrorMessage(error);
  }

  async function handleSave() {
    try {
      const toStore = {
        useSyntaxHighlighting: Boolean(useSyntaxHighlighting?.checked),
        reloadOnChange: Boolean(reloadOnChange?.checked),
        jsonTheme: String(dropdown.value),
      };
      saveBtn.setAttribute('disabled', '');
      await setOptions(toStore);

      properties.textContent = JSON.stringify(toStore, null, 2);
    } catch (error) {
      const msg = getErrorMessage(error);
      properties.textContent = msg;
    } finally {
      saveBtn.removeAttribute('disabled');
    }
  }
  saveBtn.addEventListener('click', handleSave);

  /** @type {HTMLDetailsElement} */
  const expandable = getRequiredElement('#expandable');
  expandable.addEventListener('toggle', async () => {
    try {
      if (expandable.open) {
        /** @type {HTMLPreElement} */
        const preview = getRequiredElement('.json-holder pre');
        if (!preview.hasChildNodes()) {
          const dummyJson = await fetch(
            chrome.runtime.getURL('views/options/dummydata/dummy.json')
          );
          if (!dummyJson.ok) {
            throw new Error(
              `Failed to load preview: HTTP ${dummyJson.status} ${dummyJson.statusText}`
            );
          }
          preview.replaceChildren(highlightJson(await dummyJson.json()));
        }
      }
    } catch (error) {
      properties.textContent = getErrorMessage(error);
    }
  });
});
