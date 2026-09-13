import { getErrorMessage, fetchDOM, matchDOM } from '../../../api/index.js';
import { appendLog, setStatus } from './logUtils.js';

const LOGIN_SELECTORS = ['.sv-login-portlet', '.sv-login-form'].join(',');

/**
 * @typedef {'FOUND' | 'EXTERNAL_IDP' | 'NOT_FOUND' | 'ERROR'} ProbeOutcome
 *
 * @typedef {Object} ProbeResult
 * @property {ProbeOutcome} outcome - The classified result of the probe.
 * @property {string} [matchUrl] - The final URL where a local login form was discovered.
 * @property {string} [reason] - Loggable explanation or error details.
 */

/**
 * Parses raw HTML into an inert DOM and checks for Sitevision login form selectors.
 *
 * @param {string} html
 * @returns {boolean} True if a local login form match is detected.
 */
function hasLocalLoginForm(html) {
  if (!html?.trim()) return false;
  return matchDOM(html, { selector: LOGIN_SELECTORS });
}

/**
 * Performs a relaxed check for any meta-refresh tag in raw HTML.
 *
 * @param {string} html
 * @returns {boolean} True if a meta-refresh tag is found.
 */
function hasMetaRefresh(html) {
  if (!html?.trim()) return false;
  return matchDOM(html, { selector: 'meta[http-equiv="refresh"]' });
}

/**
 * Evaluates whether a target URL belongs to an external IdP.
 *
 * @param {string} targetUrl
 * @param {string} origin
 * @returns {boolean} True if the origin differs from the target site origin.
 */
function isExternalIdp(targetUrl, origin) {
  try {
    return new URL(targetUrl, origin).origin !== origin;
  } catch {
    return false;
  }
}

/**
 * Probes an endpoint and classifies the outcome (Local Login, External IdP, or Not Found).
 *
 * @param {number} tabId
 * @param {string} targetUrl
 * @param {string} origin
 * @param {HTMLElement} logContainer
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

  // 1. Check HTTP 3xx-level redirect to external IdP
  if (isExternalIdp(finalUrl.href, origin)) {
    appendLog(
      logContainer,
      'info',
      `HTTP ${res.status} redirect to different Origin detected (indicative of IdP): ${finalUrl.host}`
    );
    return { outcome: 'EXTERNAL_IDP' };
  }

  if (finalUrl.href !== targetUrl) {
    appendLog(
      logContainer,
      'info',
      `Landed at internal redirect: ${finalUrl.pathname}${finalUrl.search}`
    );
  }

  if (res.ok) {
    // 2. Check HTML-level meta-refresh redirect (IdP)
    if (hasMetaRefresh(res.html)) {
      appendLog(logContainer, 'info', `Meta-refresh redirect detected at ${finalUrl.pathname}`);
      return { outcome: 'EXTERNAL_IDP' };
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
 * Iterates through `/edit` first, followed by any configured custom paths.
 * Continues traversing all paths even if an external IdP is encountered.
 *
 * @param {number} tabId - Target tab ID.
 * @param {string} origin - Target site origin.
 * @param {string[]} [customPaths=[]] - Optional custom path endpoints to probe.
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

      if (result.outcome === 'EXTERNAL_IDP') {
        appendLog(
          logContainer,
          'info',
          `Federated login (SAML/ADFS) detected on ${path}. Continuing search...`
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
