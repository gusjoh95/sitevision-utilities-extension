import { isFirefox } from './environment.js';

/**
 * @typedef {Object} ReleaseEntry
 * @property {string} version
 * @property {'chrome' | 'firefox'} [hotfixTarget]
 */

/**
 * Fetches the ordered catalogue of release-note versions for the current browser.
 * @returns {Promise<string[]>}
 */
export async function getAvailableVersions() {
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
 * Gets the current version when it has release notes, or the latest available release-note version.
 * @param {string} currentVersion
 * @returns {Promise<string|null>}
 */
export async function getCurrentOrLatestVersion(currentVersion) {
  const versions = await getAvailableVersions();
  if (versions.includes(currentVersion)) return currentVersion;
  return versions[versions.length - 1] ?? null;
}
