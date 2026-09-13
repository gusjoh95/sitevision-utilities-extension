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
    appendLog(
      logContainer,
      'warn',
      `Network error or request blocked for ${new URL(targetUrl).pathname} (${errorMsg})`
    );
    return { outcome: 'ERROR', reason: errorMsg };
  }

  const finalUrl = new URL(res.finalUrl || targetUrl);

  // 1. Check HTTP 3xx cross-origin redirect
  if (isCrossOrigin(finalUrl.href, origin)) {
    appendLog(
      logContainer,
      'info',
      `HTTP ${res.status} cross-origin redirect detected: ${finalUrl.host}`
    );
    return { outcome: 'CROSS_ORIGIN_REDIRECT' };
  }

  if (finalUrl.href !== targetUrl) {
    appendLog(
      logContainer,
      'info',
      `Landed at internal redirect: ${finalUrl.pathname}${finalUrl.search}`
    );
  }

  if (res.ok) {
    // 2. Check HTML meta-refresh redirect
    if (hasMetaRefresh(res.html)) {
      appendLog(logContainer, 'info', `Meta-refresh redirect detected at ${finalUrl.pathname}`);
      return { outcome: 'CROSS_ORIGIN_REDIRECT' };
    }

    // 3. Evaluate local login selectors
    if (hasLocalLoginForm(res.html)) {
      return { outcome: 'FOUND', matchUrl: finalUrl.toString() };
    }

    appendLog(
      logContainer,
      'info',
      `No login form or redirect identified at ${finalUrl.pathname} (HTTP 200)`
    );
    return { outcome: 'NOT_FOUND' };
  }

  appendLog(logContainer, 'info', `HTTP ${res.status} for ${finalUrl.pathname}`);
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
  appendLog(logContainer, 'info', `Starting discovery sequence on origin: ${origin}`);

  const queue = [...new Set(['/edit', ...customPaths])].filter(Boolean);

  for (const path of queue) {
    const isBaseline = path === '/edit';
    const targetUrl = new URL(path, origin).toString();

    appendLog(
      logContainer,
      'info',
      isBaseline ? 'Probing baseline endpoint: /edit' : `Probing custom path: ${path}`
    );

    try {
      const result = await probeEndpoint(tabId, targetUrl, origin, logContainer);

      if (result.outcome === 'CROSS_ORIGIN_REDIRECT') {
        appendLog(
          logContainer,
          'info',
          `Cross-origin redirect detected on ${path}. Continuing search...`
        );
      } else if (result.outcome === 'FOUND' && result.matchUrl) {
        appendLog(logContainer, 'success', `FOUND! Local login form found at: ${result.matchUrl}`);
        setStatus('success', `Local login found at ${result.matchUrl}`);
        return;
      }
    } catch (err) {
      appendLog(logContainer, 'error', `Probe error for ${path}: ${getErrorMessage(err)}`);
    }
  }

  appendLog(logContainer, 'warn', 'Discovery finished. No local login form was found.');
  setStatus('warn', 'No local login form was found.');
}
