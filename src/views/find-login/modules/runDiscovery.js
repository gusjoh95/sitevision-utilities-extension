import { dom, errors, i18n, logger, targetPermissions, targetTab } from '../../../api/index.js';

const LOGIN_SELECTORS = ['.sv-login-portlet', '.sv-login-form'].join(',');

/**
 * Updates the view's status summary bar.
 *
 * @param {'running' | 'success' | 'warn' | 'error'} state - Status state classifier.
 * @param {string} message - Summary message text to display.
 * @param {string} [url=''] - Optional target URL to attach to the summary link.
 */
export function setStatus(state, message, url = '') {
  const summaryText = dom.getRequiredElement('#summary-text');
  const badge = dom.getRequiredElement('#status-wrapper .badge');
  const link = dom.getRequiredElement('#summary-link');

  if (summaryText) {
    summaryText.textContent = message;
  }

  if (badge) {
    badge.className = `badge badge-${state}`;
    badge.textContent = i18n.getMessage(`status${state[0].toUpperCase()}${state.slice(1)}`);
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
  return dom.matchDOM(html, { selector: LOGIN_SELECTORS });
}

/**
 * Checks raw HTML for meta-refresh redirect tags.
 *
 * @param {string} html - Raw HTML markup to test.
 * @returns {boolean} True if a meta-refresh tag is found.
 */
function hasMetaRefresh(html) {
  if (!html?.trim()) return false;
  return dom.matchDOM(html, { selector: 'meta[http-equiv="refresh"]' });
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
 * @param {import('../../../api/types.js').Logger} logger - Logger instance for status logging.
 * @returns {Promise<ProbeResult>}
 */
async function probeEndpoint(tabId, targetUrl, origin, logger) {
  let res;
  try {
    res = await targetTab.fetch(tabId, targetUrl, {
      reqOptions: {
        credentials: 'omit', // Prevents native HTTP Basic Auth browser modal from popping up
      },
    });
  } catch (err) {
    const errorMsg = errors.messageOf(err);
    const targetAccessErrorMessage = targetPermissions.getTargetAccessErrorMessage(err);
    if (targetAccessErrorMessage) {
      logger.append(`-> ${targetAccessErrorMessage}`);
      return { outcome: 'TARGET_UNAVAILABLE', reason: targetAccessErrorMessage };
    }

    logger.append(i18n.getMessage('networkError', [errorMsg]));
    return { outcome: 'ERROR', reason: errorMsg };
  }

  const finalUrl = new URL(res.finalUrl || targetUrl);

  // 1. Check HTTP 3xx cross-origin redirect
  if (isCrossOrigin(finalUrl.href, origin)) {
    logger.append(i18n.getMessage('httpCrossOriginRedirect', [String(res.status), finalUrl.host]));
    return { outcome: 'CROSS_ORIGIN_REDIRECT' };
  }

  if (finalUrl.href !== targetUrl) {
    logger.append(i18n.getMessage('internalRedirect', [finalUrl.pathname]));
  }

  // 2. Check HTTP Basic Auth (WebDAV / protected endpoints)
  const authHeader = res.headers['www-authenticate'] || '';
  if (res.status === 401 && authHeader.toLowerCase().includes('basic')) {
    logger.append(i18n.getMessage('basicAuthDetected'));
    return { outcome: 'FOUND', matchUrl: finalUrl.toString(), type: 'WEBDAV' };
  }

  if (res.ok) {
    const html = res.data || '';

    // 3. Check HTML meta-refresh redirect
    if (hasMetaRefresh(html)) {
      logger.append(i18n.getMessage('metaRefreshDetected'));
      return { outcome: 'CROSS_ORIGIN_REDIRECT' };
    }

    // 4. Evaluate local login selectors
    if (hasLocalLoginForm(html)) {
      logger.append(i18n.getMessage('loginFormDetected'));
      return { outcome: 'FOUND', matchUrl: finalUrl.toString(), type: 'FORM' };
    }

    logger.append(i18n.getMessage('httpNoLoginForm', [String(res.status)]));
    return { outcome: 'NOT_FOUND' };
  }

  logger.append(i18n.getMessage('httpStatus', [String(res.status)]));
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
  const logContainer = dom.getRequiredElement('#log-container');
  if (!logContainer) return;

  const loggerInstance = logger.create(logContainer);
  loggerInstance.clear();

  setStatus('running', i18n.getMessage('probingTargets'));
  loggerInstance.log('info', i18n.getMessage('startingDiscovery', [origin]));

  const webdavTestPaths = ['/webdav/images/', '/webdav/files/'];
  const queue = [...new Set(['/edit', ...webdavTestPaths, ...customPaths])].filter(Boolean);

  // Find the longest path to calculate padding for alignment
  const maxPathLength = Math.max(...queue.map((p) => p.length));

  let webdavFallbackUrl = null;

  for (const path of queue) {
    const targetUrl = new URL(path, origin).toString();
    const paddedPath = path.padEnd(maxPathLength, ' ');

    loggerInstance.log('info', i18n.getMessage('getPath', [paddedPath]));

    try {
      const result = await probeEndpoint(tabId, targetUrl, origin, loggerInstance);

      if (result.outcome === 'FOUND' && result.matchUrl) {
        if (result.type === 'WEBDAV') {
          // Store WebDAV as a secondary fallback and continue searching for a primary login form
          webdavFallbackUrl = result.matchUrl;
          loggerInstance.append(i18n.getMessage('continuingLoginSearch'));
        } else {
          // Primary login form detected — terminate search immediately
          setStatus('success', i18n.getMessage('loginFormFoundAt'), result.matchUrl);
          return;
        }
      }

      if (result.outcome === 'TARGET_UNAVAILABLE' && result.reason) {
        setStatus('error', i18n.getMessage('targetUnavailableStatus'), result.reason);
        return;
      }
    } catch (err) {
      loggerInstance.append(i18n.getMessage('discoveryError', [errors.messageOf(err)]));
    }
  }

  // Fallback to WebDAV endpoint if no primary login form was found during queue traversal
  if (webdavFallbackUrl) {
    setStatus('success', i18n.getMessage('basicAuthFoundAt'), webdavFallbackUrl);
    loggerInstance.log('info', `${i18n.getMessage('basicAuthFoundAt')} ${webdavFallbackUrl}`);
    loggerInstance.log('warn', i18n.getMessage('basicAuthOnlyFound'));
    return;
  }

  loggerInstance.log('warn', i18n.getMessage('noLoginFound'));
  setStatus('warn', i18n.getMessage('noLoginFound'));
}
