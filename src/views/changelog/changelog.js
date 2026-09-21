import { getErrorMessage, getRequiredElement, isFirefox } from '../../api/index.js';
import { renderMarkdown } from './modules/renderMarkdown.js';

/**
 * @typedef {Object} ReleaseEntry
 * @property {string} version
 * @property {'chrome' | 'firefox'} [hotfixTarget] - Restricts this entry to a single browser's changelog nav.
 */

/**
 * Fetches the ordered catalogue of versions that have release notes, filtered to exclude
 * platform-specific hotfixes targeting the other browser.
 * @returns {Promise<string[]>}
 */
async function getAvailableVersions() {
  try {
    const url = browser.runtime.getURL('resources/releases/versions.json');
    const response = await fetch(url);
    if (!response.ok) return [];

    /** @type {{ releases?: ReleaseEntry[] }} */
    const catalogue = await response.json();
    const releases = Array.isArray(catalogue?.releases) ? catalogue.releases : [];

    const currentTarget = (await isFirefox()) ? 'firefox' : 'chrome';
    return releases
      .filter((release) => !release.hotfixTarget || release.hotfixTarget === currentTarget)
      .map((release) => release.version);
  } catch {
    return [];
  }
}

/**
 * Renders the release notes for a given version into `#content`.
 * @param {HTMLElement} contentEl
 * @param {string} version
 * @returns {Promise<void>}
 */
async function renderVersion(contentEl, version) {
  document.title = `What's new - v${version}`;

  try {
    const url = browser.runtime.getURL(`resources/releases/${version}.md`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`No release notes found for v${version}.`);
    }

    const markdown = await response.text();
    contentEl.replaceChildren(renderMarkdown(markdown));
  } catch (error) {
    const heading = document.createElement('h1');
    heading.textContent = `Sitevision Utilities has been updated to v${version}`;
    const paragraph = document.createElement('p');
    paragraph.textContent = getErrorMessage(error);
    contentEl.replaceChildren(heading, paragraph);
  }
}

async function initChangelogView() {
  /** @type {HTMLDivElement} */
  const contentEl = getRequiredElement('#content');
  const { version: currentVersion } = browser.runtime.getManifest();
  const initialVersion =
    new URLSearchParams(window.location.search).get('version') || currentVersion;

  await renderVersion(contentEl, initialVersion);

  const versions = await getAvailableVersions();
  // Oldest first; the initially requested version may not be in the catalogue (e.g. no notes yet).
  let index = versions.indexOf(initialVersion);
  if (index === -1) return;

  const navEl = getRequiredElement('#version-nav');
  /** @type {HTMLButtonElement} */
  const prevButton = getRequiredElement('#prev-version');
  /** @type {HTMLButtonElement} */
  const nextButton = getRequiredElement('#next-version');
  /** @type {HTMLSpanElement} */
  const labelEl = getRequiredElement('#version-label');

  function updateNav() {
    labelEl.textContent = versions[index];
    prevButton.disabled = index <= 0;
    nextButton.disabled = index >= versions.length - 1;
  }

  prevButton.addEventListener('click', async () => {
    if (index <= 0) return;
    index -= 1;
    updateNav();
    await renderVersion(contentEl, versions[index]);
  });

  nextButton.addEventListener('click', async () => {
    if (index >= versions.length - 1) return;
    index += 1;
    updateNav();
    await renderVersion(contentEl, versions[index]);
  });

  navEl.classList.remove('hidden');
  updateNav();
}

initChangelogView();
