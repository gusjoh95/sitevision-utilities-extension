import { dom, errors, markdownRenderer, releaseNotes } from '../../api/index.js';

async function initDocsView() {
  const contentEl = dom.getRequiredElement('#content');
  /** @type {HTMLAnchorElement} */
  const changelogLink = dom.getRequiredElement('#changelog-link');
  const currentVersion = browser.runtime.getManifest().version;
  const changelogVersion = await releaseNotes.getCurrentOrLatestVersion(currentVersion);

  if (changelogVersion) {
    const changelogUrl = new URL(browser.runtime.getURL('views/changelog/changelog.html'));
    changelogUrl.searchParams.set('version', changelogVersion);
    changelogLink.href = changelogUrl.href;
    changelogLink.hidden = false;
  }

  try {
    const response = await fetch(browser.runtime.getURL('resources/docs/user-guide.md'));
    if (!response.ok) {
      throw new Error('User guide could not be loaded.');
    }

    contentEl.replaceChildren(markdownRenderer.renderMarkdown(await response.text()));
  } catch (error) {
    const heading = document.createElement('h2');
    heading.textContent = 'User guide unavailable';
    const paragraph = document.createElement('p');
    paragraph.textContent = errors.messageOf(error);
    contentEl.replaceChildren(heading, paragraph);
  }
}

void initDocsView();
