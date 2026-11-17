import { dom, errors, i18n, sitevisionRest } from '../../../api/index.js';

export function initSearchResults() {
  const errorElement = dom.getRequiredElement('#error');
  const statusElement = dom.getRequiredElement('#search-status');
  const resultsElement = dom.getRequiredElement('#search-results');
  const spinnerElement = dom.getRequiredElement('#spinner');

  function clearResults() {
    errorElement.textContent = '';
    statusElement.textContent = '';
    resultsElement.textContent = '';
  }

  /** @param {string} messageKey */
  function showPending(messageKey) {
    clearResults();
    statusElement.textContent = i18n.getMessage(messageKey);
  }

  /** @param {unknown} error */
  function showError(error) {
    let message = errors.messageOf(error);
    if (error instanceof sitevisionRest.RestApiError) {
      let messageKey = '';
      if (error.status === 400) messageKey = 'search_badRequest';
      if (error.status === 401 || error.status === 403) messageKey = 'search_accessDenied';
      if (error.status === 404) messageKey = 'search_notFound';
      if (messageKey) message = `${i18n.getMessage(messageKey)} (HTTP ${error.status})`;
    }
    statusElement.textContent = '';
    errorElement.textContent = i18n.getMessage('common_errorPrefix', [message]);
  }

  /** @param {string} message */
  function showTargetLost(message) {
    statusElement.textContent = '';
    errorElement.textContent = i18n.getMessage('common_warningPrefix', [message]);
  }

  /**
   * @param {unknown} result
   * @param {{ limit: number, elapsedMs: number }} options
   */
  function showResults(result, { limit, elapsedMs }) {
    if (!Array.isArray(result)) throw new Error(i18n.getMessage('search_invalidResults'));
    resultsElement.textContent = JSON.stringify(result, null, 2);
    const messageKey = result.length >= limit ? 'search_resultsAtLimit' : 'search_results';
    statusElement.textContent = i18n.getMessage(messageKey, [
      String(result.length),
      String(Math.round(elapsedMs)),
    ]);
  }

  return { spinnerElement, clearResults, showPending, showError, showTargetLost, showResults };
}
