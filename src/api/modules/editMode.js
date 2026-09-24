/**
 * Regular expression to capture the primary node ID immediately following /edit/
 * as well as any trailing sub-path.
 *
 * Example matches:
 * - "/edit/19.a1b2c3d4e5f67890123456"
 *   -> Group 1 (nodeId): "19.a1b2c3d4e5f67890123456"
 *   -> Group 2 (subPath): undefined
 *
 * - "/edit/19.a1b2c3d4e5f67890123456/properties/12.9876543210abcdef"
 *   -> Group 1 (nodeId): "19.a1b2c3d4e5f67890123456"
 *   -> Group 2 (subPath): "properties/12.9876543210abcdef"
 */
const EDIT_PATH_REGEX = /^\/edit\/(\d{1,3}\.[a-fA-F0-9]+)(?:\/(.*))?$/;

/**
 * Information regarding the current tab's edit mode state.
 * @typedef {Object} EditInfo
 * @property {boolean} isEditMode - True if the URL pathname starts with /edit/.
 * @property {string|null} nodeId - The primary node ID if present immediately after /edit/.
 * @property {boolean} hasNodeId - Indicates whether a primary node ID was successfully extracted.
 * @property {'page'|'unknown'} viewType - 'page' if strictly on the main node path, otherwise 'unknown'.
 * @property {string|null} subPath - Any additional trailing path following the primary node ID.
 */

/**
 * Determines whether the given tab is currently in edit mode.
 *
 * @param {chrome.tabs.Tab} tab - The Chrome tab object to evaluate.
 * @returns {boolean} True if the tab URL pathname starts with /edit/, false otherwise.
 */
export function isEdit(tab) {
  if (!tab?.url) return false;

  try {
    const url = new URL(tab.url);
    return url.pathname.startsWith('/edit/');
  } catch {
    return false;
  }
}

/**
 * Extracts detailed contextual information about the edit mode state from the tab URL.
 *
 * @param {chrome.tabs.Tab} tab - The Chrome tab object to evaluate.
 * @returns {EditInfo} An object containing detailed edit state properties.
 */
export function getEditInfo(tab) {
  /** @type {EditInfo} */
  const result = {
    isEditMode: false,
    nodeId: null,
    hasNodeId: false,
    viewType: 'unknown',
    subPath: null,
  };

  if (!tab?.url) return result;

  try {
    const url = new URL(tab.url);

    // Verify root /edit/ path requirement
    if (!url.pathname.startsWith('/edit/')) {
      return result;
    }

    result.isEditMode = true;

    // Match node ID located STRICTLY directly after /edit/
    const match = url.pathname.match(EDIT_PATH_REGEX);

    if (match) {
      result.nodeId = match[1];
      result.hasNodeId = true;

      const rawSubPath = match[2];

      // Set viewType to 'page' ONLY if no trailing sub-path exists
      if (rawSubPath && rawSubPath.trim() !== '') {
        result.subPath = rawSubPath;
        result.viewType = 'unknown';
      } else {
        result.viewType = 'page';
      }
    }

    return result;
  } catch {
    return result;
  }
}
