import { getErrorMessage, fetchDOM, matchDOM } from '../../../api/index.js';
import { appendLog, setStatus } from './logUtils.js';

const LOGIN_SELECTORS = ['.sv-login-portlet', '.sv-login-form'].join(',');

/**
 * @typedef {'FOUND' | 'CROSS_ORIGIN_REDIRECT' | 'NOT_FOUND' | 'ERROR'} ProbeOutcome
 *
 * @typedef {Object} ProbeResult
 * @property {ProbeOutcome} outcome - The classified outcome of the probe.
 * @property {string} [matchUrl] - The final URL where a local login form was discovered.
 * @property {string} [reason] - Loggable error details or explanation.
 */

/**
 * Checks raw HTML for Sitevision local login form elements.
 *
 * @param {string} html - Raw HTML markup to test.
 * @returns {boolean} True if a local login form match is detected.
 */
function hasLocalLoginForm(html) {
  if (!html?.trim()) return false;
  return matchDOM(html, { selector: LOGIN_SELECTORS });
}

/**
 * Checks raw HTML for meta-refresh redirect tags.
 *
 * @param {string} html - Raw HTML markup to test.
 * @returns {boolean} True if a meta-refresh tag is found.
 */
function hasMetaRefresh(html) {
  if (!html?.trim()) return false;
  return matchDOM(html, { selector: 'meta[http-equiv="refresh"]' });
}

/**
 * Evaluates whether a target URL has redirected to a different origin.
 *
 * @param {string} targetUrl - The URL to check.
 * @param {string} origin - Expected target site origin.
 * @returns {boolean} True if the target URL has a different origin.
 */
function isCrossOrigin(targetUrl, origin) {
  try {
    return new URL(targetUrl, origin).origin !== origin;
  } catch {
    return false;
  }
}

/**
 * Probes an endpoint and classifies the outcome (Local Login, Cross-Origin Redirect, or Not Found).
 *
 * @param {number} tabId - Target browser tab ID.
 * @param {string} targetUrl - Full target URL to fetch.
 * @param {string} origin - Expected target site origin.
 * @param {HTMLElement} logContainer - Container element for status logging.
 * @returns {Promise<ProbeResult>}
 */
async function probeEndpoint(tabId, targetUrl, origin, logContainer) {
  let res;
  try {
    res = await fetchDOM(tabId, targetUrl);
  } catch (err) {
    const errorMsg = getErrorMessage(err);
    appendLog(logContainer, 'warn', `-> Network error (${errorMsg})`, { append: true });
    return { outcome: 'ERROR', reason: errorMsg };
  }

  const finalUrl = new URL(res.finalUrl || targetUrl);

  // 1. Check HTTP 3xx cross-origin redirect
  if (isCrossOrigin(finalUrl.href, origin)) {
    appendLog(
      logContainer,
      'info',
      `-> HTTP ${res.status} cross-origin redirect (${finalUrl.host})`,
      { append: true }
    );
    return { outcome: 'CROSS_ORIGIN_REDIRECT' };
  }

  if (finalUrl.href !== targetUrl) {
    appendLog(logContainer, 'info', `-> Internal redirect (${finalUrl.pathname})`, {
      append: true,
    });
  }

  if (res.ok) {
    // 2. Check HTML meta-refresh redirect
    if (hasMetaRefresh(res.html)) {
      appendLog(logContainer, 'info', `-> Meta-refresh redirect detected`, { append: true });
      return { outcome: 'CROSS_ORIGIN_REDIRECT' };
    }

    // 3. Evaluate local login selectors
    if (hasLocalLoginForm(res.html)) {
      appendLog(logContainer, 'success', `-> FOUND! Local login form detected`, { append: true });
      return { outcome: 'FOUND', matchUrl: finalUrl.toString() };
    }

    appendLog(logContainer, 'info', `-> HTTP 200 No login form`, { append: true });
    return { outcome: 'NOT_FOUND' };
  }

  appendLog(logContainer, 'info', `-> HTTP ${res.status}`, { append: true });
  return { outcome: 'NOT_FOUND' };
}

/**
 * Runs the discovery sequence for identifying local login pages.
 * Probes `/edit` first as a baseline, followed by configured custom paths.
 * Continues traversing the queue even if a cross-origin redirect is encountered.
 *
 * @param {number} tabId - Target browser tab ID.
 * @param {string} origin - Target site origin.
 * @param {string[]} [customPaths=[]] - Custom path endpoints to probe.
 * @returns {Promise<void>}
 */
export async function runDiscovery(tabId, origin, customPaths = []) {
  const logContainer = document.getElementById('log-container');
  if (!logContainer) return;

  logContainer.textContent = '';
  setStatus('running', 'Probing target site(s)...');
  appendLog(logContainer, 'info', `Starting discovery on: ${origin}`);

  const queue = [...new Set(['/edit', ...customPaths])].filter(Boolean);

  // Find the longest path to calculate padding for alignment
  const maxPathLength = Math.max(...queue.map((p) => p.length));

  for (const path of queue) {
    const targetUrl = new URL(path, origin).toString();
    const paddedPath = path.padEnd(maxPathLength, ' ');

    appendLog(logContainer, 'info', `GET ${paddedPath}`);

    try {
      const result = await probeEndpoint(tabId, targetUrl, origin, logContainer);

      if (result.outcome === 'FOUND' && result.matchUrl) {
        setStatus('success', 'Local login found at:', result.matchUrl);
        return;
      }
      // Note: Removed the redundant CROSS_ORIGIN_REDIRECT log since probeEndpoint already appends the reason.
    } catch (err) {
      appendLog(logContainer, 'error', `-> Error: ${getErrorMessage(err)}`, { append: true });
    }
  }

  appendLog(logContainer, 'warn', 'Discovery finished. No local login form was found.');
  setStatus('warn', 'No local login form was found.');
}
