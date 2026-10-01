import { dom, errors, jsonRenderer, options, theme } from '../../api/index.js';

document.addEventListener('DOMContentLoaded', async () => {
  /** @type {HTMLInputElement} */
  const useSyntaxHighlighting = dom.getRequiredElement('#use-syntax-highlighting');
  /** @type {HTMLInputElement} */
  const reloadOnChange = dom.getRequiredElement('#reload-on-change');
  /** @type {HTMLTextAreaElement} */
  const customLoginPaths = dom.getRequiredElement('#custom-login-paths');
  /** @type {HTMLPreElement} */
  const errorElem = dom.getRequiredElement('#error');
  /** @type {HTMLSelectElement} */
  const dropdown = dom.getRequiredElement('#theme-dropdown');
  /** @type {HTMLDetailsElement} */
  const expandable = dom.getRequiredElement('#expandable');
  /** @type {HTMLButtonElement} */
  const saveBtn = dom.getRequiredElement('#save');

  /** @type {HTMLLinkElement} */
  const themeLink = dom.getRequiredElement('#json-theme');
  theme.assignJsonTheme(themeLink);

  try {
    const opts = await options.getOptions();
    useSyntaxHighlighting.checked = Boolean(opts.useSyntaxHighlighting);
    reloadOnChange.checked = Boolean(opts.reloadOnChange);
    customLoginPaths.value = opts.customLoginPaths.join('\n');

    const jsonTheme = opts?.jsonTheme || '';
    try {
      const jsonUrl = browser.runtime.getURL('resources/style/json-themes/themes.json');
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
      errorElem.textContent = errors.messageOf(error);
    }
    dropdown.addEventListener('change', () => {
      const selectedTheme = dropdown.value || 'default.css';
      themeLink.href = browser.runtime.getURL(`resources/style/json-themes/${selectedTheme}`);
      expandable.open = true;
    });

    saveBtn.removeAttribute('disabled');
  } catch (error) {
    errorElem.textContent = errors.messageOf(error);
  }

  async function handleSave() {
    try {
      const parsedPaths = customLoginPaths.value
        .split(/[\n,]+/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => (p.startsWith('/') ? p : `/${p}`));

      const toStore = {
        customLoginPaths: parsedPaths,
        useSyntaxHighlighting: Boolean(useSyntaxHighlighting?.checked),
        reloadOnChange: Boolean(reloadOnChange?.checked),
        jsonTheme: String(dropdown.value),
      };
      saveBtn.setAttribute('disabled', '');
      if (await options.setOptions(toStore)) {
        window.close();
      }

      errorElem.textContent = JSON.stringify(toStore, null, 2);
    } catch (error) {
      const msg = errors.messageOf(error);
      errorElem.textContent = msg;
    } finally {
      saveBtn.removeAttribute('disabled');
    }
  }
  saveBtn.addEventListener('click', handleSave);

  expandable.addEventListener('toggle', async () => {
    try {
      if (expandable.open) {
        /** @type {HTMLPreElement} */
        const preview = dom.getRequiredElement('.json-holder pre');
        if (!preview.hasChildNodes()) {
          const dummyJson = await fetch(
            browser.runtime.getURL('views/options/dummydata/dummy.json')
          );
          if (!dummyJson.ok) {
            throw new Error(
              `Failed to load preview: HTTP ${dummyJson.status} ${dummyJson.statusText}`
            );
          }
          preview.replaceChildren(jsonRenderer.highlight(await dummyJson.json()));
        }
      }
    } catch (error) {
      errorElem.textContent = errors.messageOf(error);
    }
  });
});
