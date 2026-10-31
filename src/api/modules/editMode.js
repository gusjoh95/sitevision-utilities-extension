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

/**
 * Information regarding the current tab's edit mode state.
 * @typedef {Object} EditInfo
 * @property {boolean} isEditMode - True if the URL pathname is /edit or starts with /edit/.
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
 * @returns {boolean} True if the tab URL pathname starts with /edit, false otherwise.
 */
export function isEdit(tab) {
  if (!tab?.url) return false;

  try {
    const url = new URL(tab.url);
    return url.pathname.startsWith('/edit');
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

  /** @type {URL} */
  let url;
  try {
    url = new URL(tab.url);
  } catch {
    return result;
  }

  if (!url.pathname.startsWith('/edit')) return result;

  result.isEditMode = true;
  if (url.pathname === '/edit' || url.pathname === '/edit/') {
    result.viewType = 'page';
    return result;
  }

  const match = url.pathname.match(EDIT_PATH_REGEX);
  if (!match) return result;

  result.nodeId = match[1];
  result.hasNodeId = true;

  const rawSubPath = match[2];
  if (!rawSubPath) {
    result.viewType = 'page';
    return result;
  }

  result.subPath = rawSubPath;
  result.viewType = rawSubPath.split('/')[0] || 'unknown';
  const viewNodeMatch = rawSubPath.match(/^[^/]+\/(\d{1,3}\.[a-fA-F0-9]+)(?:\/|$)/);
  result.viewNodeId = viewNodeMatch?.[1] ?? null;

  return result;
}

/**
 * Reads the current node for a view context from the editor's lastNode state.
 * @param {number} tabId
 * @param {string} viewType
 * @returns {Promise<string|null>}
 */
async function getEditorStateNodeId(tabId, viewType) {
  try {
    return (
      (await executeScript(
        tabId,
        (contextType) => {
          /** @type {Window & { editor?: { appContext?: { lastNode?: Record<string, unknown> } } }} */
          const targetWindow = window;
          const nodeId = targetWindow.editor?.appContext?.lastNode?.[contextType];
          return typeof nodeId === 'string' && /^\d{1,3}\.[a-f\d]+$/i.test(nodeId) ? nodeId : null;
        },
        [viewType],
        { world: 'MAIN' }
      )) ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Returns node IDs encoded in the URL, ordered from most to least specific.
 * @param {string|null} subPath
 * @returns {string[]}
 */
function getUrlNodeIds(subPath) {
  return (
    subPath
      ?.split('/')
      .filter((segment) => NODE_ID_REGEX.test(segment))
      .reverse() ?? []
  );
}

/**
 * Removes missing and duplicate node IDs while preserving their priority order.
 * @param {(string|null)[]} nodeIds
 * @returns {string[]}
 */
function uniqueNodeIds(nodeIds) {
  return [...new Set(nodeIds.filter((nodeId) => typeof nodeId === 'string'))];
}

/**
 * Resolves node IDs for the parsed edit context.
 * URL IDs take precedence. Page URLs use their base ID, while a bare `/edit` uses
 * `lastNode.page`. Other contexts use their matching editor-state entry and do not
 * fall back to the base page ID if that entry is unavailable.
 * @param {chrome.tabs.Tab} tab
 * @param {EditInfo} editInfo
 * @returns {Promise<string[]>}
 */
async function resolveNodeIds(tab, editInfo) {
  if (!editInfo.isEditMode) return [];

  const urlNodeIds = getUrlNodeIds(editInfo.subPath);
  if (urlNodeIds.length > 0) {
    return uniqueNodeIds([...urlNodeIds, editInfo.nodeId]);
  }

  if (editInfo.viewType === 'page' && editInfo.nodeId) {
    return [editInfo.nodeId];
  }

  if (editInfo.viewType === 'unknown' || typeof tab?.id !== 'number') {
    return [];
  }

  const editorStateNodeId = await getEditorStateNodeId(tab.id, editInfo.viewType);
  return editorStateNodeId ? uniqueNodeIds([editorStateNodeId, editInfo.nodeId]) : [];
}

/**
 * Extracts edit URL details and resolves node IDs. The returned object retains the
 * parsed edit fields and adds node IDs ordered from most to least specific.
 *
 * @param {chrome.tabs.Tab} tab - The active tab.
 * @returns {Promise<EditInfo>} Edit URL details with nodes ordered from most to least specific.
 */
export async function getEditInfo(tab) {
  const parsedEditInfo = parseEditInfo(tab);
  const nodes = await resolveNodeIds(tab, parsedEditInfo);
  return { ...parsedEditInfo, nodes };
}
