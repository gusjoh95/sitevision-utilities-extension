import {
  getErrorMessage,
  fetchInTabContext,
  getTargetAccessErrorMessage,
  matchDOM,
  getRequiredElement,
  Logger,
} from '../../../api/index.js';

const LOGIN_SELECTORS = ['.sv-login-portlet', '.sv-login-form'].join(',');

/**
 * Updates the view's status summary bar.
 *
 * @param {'running' | 'success' | 'warn' | 'error'} state - Status state classifier.
 * @param {string} message - Summary message text to display.
 * @param {string} [url=''] - Optional target URL to attach to the summary link.
 */
export function setStatus(state, message, url = '') {
  const summaryText = getRequiredElement('#summary-text');
  const badge = getRequiredElement('#status-wrapper .badge');
  const link = getRequiredElement('#summary-link');

  if (summaryText) {
    summaryText.textContent = message;
  }

  if (badge) {
    badge.className = `badge badge-${state}`;
    badge.textContent = state.toUpperCase();
  }

  if (link) {
    if (url) {
      link.dataset.url = url;
      link.textContent = url;
      link.classList.remove('hidden');
    } else {
      link.dataset.url = '';
      link.textContent = '';
      link.classList.add('hidden');
    }
  }
}

/**
 * @typedef {'FOUND' | 'CROSS_ORIGIN_REDIRECT' | 'NOT_FOUND' | 'TARGET_UNAVAILABLE' | 'ERROR'} ProbeOutcome
 * @typedef {'FORM' | 'WEBDAV'} MatchType
 * @typedef {Object} ProbeResult
 * @property {ProbeOutcome} outcome - The classified outcome of the probe.
 * @property {string} [matchUrl] - The final URL where a local login form or Basic Auth endpoint was discovered.
 * @property {MatchType} [type] - The type of login endpoint discovered.
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
 * Probes an endpoint and classifies the outcome (Local Login, Basic Auth, Cross-Origin Redirect, or Not Found).
 * Suppresses HTTP Basic Auth modal prompts using `credentials: 'omit'`.
 *
 * @param {number} tabId - Target browser tab ID.
 * @param {string} targetUrl - Full target URL to fetch.
 * @param {string} origin - Expected target site origin.
 * @param {Logger} logger - Logger instance for status logging.
 * @returns {Promise<ProbeResult>}
 */
async function probeEndpoint(tabId, targetUrl, origin, logger) {
  let res;
  try {
    res = await fetchInTabContext(tabId, targetUrl, {
      reqOptions: {
        credentials: 'omit', // Prevents native HTTP Basic Auth browser modal from popping up
      },
    });
  } catch (err) {
    const errorMsg = getErrorMessage(err);
    const targetAccessErrorMessage = getTargetAccessErrorMessage(errorMsg);
    if (targetAccessErrorMessage) {
      logger.append(`-> ${targetAccessErrorMessage}`);
      return { outcome: 'TARGET_UNAVAILABLE', reason: targetAccessErrorMessage };
    }

    logger.append(`-> Network error (${errorMsg})`);
    return { outcome: 'ERROR', reason: errorMsg };
  }

  const finalUrl = new URL(res.finalUrl || targetUrl);

  // 1. Check HTTP 3xx cross-origin redirect
  if (isCrossOrigin(finalUrl.href, origin)) {
    logger.append(`-> HTTP ${res.status} cross-origin redirect (${finalUrl.host})`);
    return { outcome: 'CROSS_ORIGIN_REDIRECT' };
  }

  if (finalUrl.href !== targetUrl) {
    logger.append(`-> Internal redirect (${finalUrl.pathname})`);
  }

  // 2. Check HTTP Basic Auth (WebDAV / protected endpoints)
  const authHeader = res.headers['www-authenticate'] || '';
  if (res.status === 401 && authHeader.toLowerCase().includes('basic')) {
    logger.append('-> SEMI-FOUND! Basic Auth detected.');
    return { outcome: 'FOUND', matchUrl: finalUrl.toString(), type: 'WEBDAV' };
  }

  if (res.ok) {
    const html = res.data || '';

    // 3. Check HTML meta-refresh redirect
    if (hasMetaRefresh(html)) {
      logger.append('-> Meta-refresh redirect detected');
      return { outcome: 'CROSS_ORIGIN_REDIRECT' };
    }

    // 4. Evaluate local login selectors
    if (hasLocalLoginForm(html)) {
      logger.append('-> FOUND! Local login form detected');
      return { outcome: 'FOUND', matchUrl: finalUrl.toString(), type: 'FORM' };
    }

    logger.append(`-> HTTP ${res.status} No login form`);
    return { outcome: 'NOT_FOUND' };
  }

  logger.append(`-> HTTP ${res.status}`);
  return { outcome: 'NOT_FOUND' };
}

/**
 * Runs the discovery sequence for identifying local login pages or HTTP Basic Auth endpoints.
 * Prioritizes standard login forms and uses WebDAV endpoints as a secondary fallback.
 *
 * @param {number} tabId - Target browser tab ID.
 * @param {string} origin - Target site origin.
 * @param {string[]} [customPaths=[]] - Custom path endpoints to probe.
 * @returns {Promise<void>}
 */
export async function runDiscovery(tabId, origin, customPaths = []) {
  const logContainer = getRequiredElement('#log-container');
  if (!logContainer) return;

  const logger = new Logger(logContainer);
  logger.clear();

  setStatus('running', 'Probing target site(s)...');
  logger.log('info', `Starting discovery on: ${origin}`);

  const webdavTestPaths = ['/webdav/images/', '/webdav/files/'];
  const queue = [...new Set(['/edit', ...webdavTestPaths, ...customPaths])].filter(Boolean);

  // Find the longest path to calculate padding for alignment
  const maxPathLength = Math.max(...queue.map((p) => p.length));

  let webdavFallbackUrl = null;

  for (const path of queue) {
    const targetUrl = new URL(path, origin).toString();
    const paddedPath = path.padEnd(maxPathLength, ' ');

    logger.log('info', `GET ${paddedPath}`);

    try {
      const result = await probeEndpoint(tabId, targetUrl, origin, logger);

      if (result.outcome === 'FOUND' && result.matchUrl) {
        if (result.type === 'WEBDAV') {
          // Store WebDAV as a secondary fallback and continue searching for a primary login form
          webdavFallbackUrl = result.matchUrl;
          logger.append('Continuing search for login form.');
        } else {
          // Primary login form detected — terminate search immediately
          setStatus('success', 'Login form found at:', result.matchUrl);
          return;
        }
      }

      if (result.outcome === 'TARGET_UNAVAILABLE' && result.reason) {
        setStatus('error', 'Target unavailable:', result.reason);
        return;
      }
    } catch (err) {
      logger.append(`-> Error: ${getErrorMessage(err)}`);
    }
  }

  // Fallback to WebDAV endpoint if no primary login form was found during queue traversal
  if (webdavFallbackUrl) {
    setStatus('success', 'Basic Auth found at:', webdavFallbackUrl);
    logger.log('info', `Basic Auth found at: ${webdavFallbackUrl}`);
    logger.log('warn', 'Discovery finished — only Basic Auth was found.');
    return;
  }

  logger.log('warn', 'Discovery finished — no login found.');
  setStatus('warn', 'No login found.');
}
