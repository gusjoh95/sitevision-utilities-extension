/**
 * Opens the bundled "what's new" changelog view in a new tab whenever the extension
 * is updated to a new version (not on first install).
 * @returns {void}
 */
export function registerChangelogOnUpdate() {
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason !== 'update') return;

    const { version } = browser.runtime.getManifest();
    browser.tabs.create({
      url: browser.runtime.getURL(`views/changelog/changelog.html?version=${version}`),
    });
  });
}
