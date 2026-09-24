import { getRequiredElement } from '../../../api/index.js';

/**
 * Updates the status badge and summary text in the reindex view.
 *
 * @param {'idle' | 'running' | 'success' | 'warn' | 'error'} state - Status state.
 * @param {string} message - Summary message to display.
 * @returns {void}
 */
export function setStatus(state, message) {
  const summaryText = getRequiredElement('#summary-text');
  const badge = getRequiredElement('#status-wrapper').querySelector('.badge');

  if (summaryText) summaryText.textContent = message;
  if (badge) {
    badge.className = `badge badge-${state}`;
    badge.textContent = state.toUpperCase();
  }
}
