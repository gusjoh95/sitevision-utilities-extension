import { executeScript } from './targetTab.js';

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
const NODE_ID_REGEX = /^\d{1,3}\.[a-fA-F0-9]+$/;

const VIEW_TYPE_ALIASES = /** @type {Record<string, string>} */ ({
  files: 'file',
  images: 'image',
  pages: 'page',
  templates: 'template',
});

/**
 * Information regarding the current tab's edit mode state.
 * @typedef {Object} EditInfo
 * @property {boolean} isEditMode - True if the URL pathname starts with /edit/.
 * @property {string|null} nodeId - The primary node ID if present immediately after /edit/.
 * @property {boolean} hasNodeId - Indicates whether a primary node ID was successfully extracted.
 * @property {string} viewType - The first path segment after the primary node ID, or 'page' when absent.
 * @property {string|null} viewNodeId - The node ID immediately following the view type, if present.
 * @property {string|null} subPath - Any additional trailing path following the primary node ID.
 * @property {string[]} nodes - Unique node IDs ordered from most to least specific.
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
function parseEditInfo(tab) {
  /** @type {EditInfo} */
  const result = {
    isEditMode: false,
    nodeId: null,
    hasNodeId: false,
    viewType: 'unknown',
    viewNodeId: null,
    subPath: null,
    nodes: [],
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
      if (!rawSubPath) {
        result.viewType = 'page';
      } else {
        result.subPath = rawSubPath;
        result.viewType = rawSubPath.split('/')[0] || 'unknown';
        const viewNodeMatch = rawSubPath.match(/^[^/]+\/(\d{1,3}\.[a-fA-F0-9]+)(?:\/|$)/);
        if (viewNodeMatch) {
          result.viewNodeId = viewNodeMatch[1];
        }
      }
    }

    return result;
  } catch {
    return result;
  }
}

/**
 * Extracts edit URL details and resolves unique node IDs by priority: trailing URL IDs
 * from deepest to shallowest, the editor-state node when no trailing URL ID exists, and
 * finally the primary node immediately after /edit/. Outside edit mode, editor state is
 * never inspected.
 *
 * @param {chrome.tabs.Tab} tab - The active tab.
 * @returns {Promise<EditInfo>} Edit URL details with nodes ordered from most to least specific.
 */
export async function getEditInfo(tab) {
  const parsedEditInfo = parseEditInfo(tab);
  /** @type {string[]} */
  // URL node IDs are ordered from the deepest sub-path segment to the shallowest.
  const urlPathNodeIdsByPriority =
    parsedEditInfo.subPath
      ?.split('/')
      .filter((segment) => NODE_ID_REGEX.test(segment))
      .reverse() ?? [];

  if (!parsedEditInfo.isEditMode) {
    return { ...parsedEditInfo, nodes: [] };
  }

  /** @type {string|null} */
  let editorStateNodeId = null;
  if (
    urlPathNodeIdsByPriority.length === 0 &&
    parsedEditInfo.viewType !== 'page' &&
    typeof tab?.id === 'number'
  ) {
    const viewType = VIEW_TYPE_ALIASES[parsedEditInfo.viewType] || parsedEditInfo.viewType;
    try {
      editorStateNodeId =
        (await executeScript(
          tab.id,
          (viewType) => {
            /** @type {Window & { editor?: { appContext?: { lastNode?: Record<string, unknown> } } }} */
            const targetWindow = window;
            const nodeId = targetWindow.editor?.appContext?.lastNode?.[viewType];
            return typeof nodeId === 'string' && /^\d{1,3}\.[a-f\d]+$/i.test(nodeId)
              ? nodeId
              : null;
          },
          [viewType],
          { world: 'MAIN' }
        )) ?? null;
    } catch {
      editorStateNodeId = null;
    }
  }

  const candidateNodeIdsByPriority = [
    ...urlPathNodeIdsByPriority, // Specific nodes encoded in the edit URL.
    editorStateNodeId, // Last node selected in the editor when the URL has no node IDs.
    parsedEditInfo.nodeId, // Base node directly after /edit/; broadest fallback.
  ];
  // Set removes duplicates while preserving the candidate priority order.
  const nodes = [...new Set(candidateNodeIdsByPriority.filter((nodeId) => nodeId !== null))];
  return { ...parsedEditInfo, nodes };
}
