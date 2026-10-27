import { dom, errors, markdownRenderer, releaseNotes } from '../../api/index.js';

/**
 * Renders the release notes for a given version into `#content`.
 * @param {HTMLElement} contentEl
 * @param {HTMLHeadingElement} pageTitleEl
 * @param {string} version
 * @returns {Promise<void>}
 */
async function renderVersion(contentEl, pageTitleEl, version) {
  document.title = `What's new - v${version}`;

  try {
    const url = browser.runtime.getURL(`resources/releases/${version}.md`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`No release notes found for v${version}.`);
    }

    const markdown = await response.text();
    const renderedMarkdown = markdownRenderer.renderMarkdown(markdown);
    const firstHeading = renderedMarkdown.firstElementChild;
    if (firstHeading instanceof HTMLHeadingElement && firstHeading.tagName === 'H1') {
      pageTitleEl.replaceChildren(...firstHeading.childNodes);
      firstHeading.remove();
    } else {
      pageTitleEl.textContent = `What's new - v${version}`;
    }
    contentEl.replaceChildren(renderedMarkdown);
  } catch (error) {
    const heading = document.createElement('h1');
    heading.textContent = `Sitevision Utilities has been updated to v${version}`;
    const paragraph = document.createElement('p');
    paragraph.textContent = errors.messageOf(error);
    pageTitleEl.replaceChildren(...heading.childNodes);
    contentEl.replaceChildren(paragraph);
  }
}

async function initChangelogView() {
  /** @type {HTMLDivElement} */
  const contentEl = dom.getRequiredElement('#content');
  /** @type {HTMLHeadingElement} */
  const pageTitleEl = dom.getRequiredElement('#page-title');
  const searchParams = new URLSearchParams(window.location.search);
  /** @type {HTMLAnchorElement} */
  const documentationLink = dom.getRequiredElement('#documentation-link');
  const documentationUrl = browser.runtime.getURL('views/docs/docs.html');
  documentationLink.href = documentationUrl;

  const { version: currentVersion } = browser.runtime.getManifest();
  const initialVersion = searchParams.get('version') || currentVersion;

  await renderVersion(contentEl, pageTitleEl, initialVersion);

  const versions = await releaseNotes.getAvailableVersions();
  // Oldest first; the initially requested version may not be in the catalogue (e.g. no notes yet).
  let index = versions.indexOf(initialVersion);
  if (index === -1) return;

  const navEl = dom.getRequiredElement('#version-nav');
  /** @type {HTMLButtonElement} */
  const prevButton = dom.getRequiredElement('#prev-version');
  /** @type {HTMLButtonElement} */
  const nextButton = dom.getRequiredElement('#next-version');
  /** @type {HTMLSpanElement} */
  const labelEl = dom.getRequiredElement('#version-label');

  function updateNav() {
    labelEl.textContent = versions[index];
    prevButton.disabled = index <= 0;
    nextButton.disabled = index >= versions.length - 1;
  }

  prevButton.addEventListener('click', async () => {
    if (index <= 0) return;
    index -= 1;
    updateNav();
    await renderVersion(contentEl, pageTitleEl, versions[index]);
  });

  nextButton.addEventListener('click', async () => {
    if (index >= versions.length - 1) return;
    index += 1;
    updateNav();
    await renderVersion(contentEl, pageTitleEl, versions[index]);
  });

  navEl.classList.remove('hidden');
  updateNav();
}

initChangelogView();
