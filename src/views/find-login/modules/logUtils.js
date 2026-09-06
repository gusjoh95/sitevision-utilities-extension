/**
 * Appends a formatted entry to the log container.
 *
 * @param {HTMLElement} container
 * @param {'info' | 'success' | 'warn' | 'error'} type
 * @param {string} message
 */
export function appendLog(container, type, message) {
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;

  const timestamp = new Date().toLocaleTimeString();
  entry.textContent = `[${timestamp}] ${message}`;

  container.appendChild(entry);
  container.scrollTop = container.scrollHeight;
}

/**
 * Updates the view's status summary bar.
 *
 * @param {'running' | 'success' | 'warn' | 'error'} state
 * @param {string} message
 */
export function setStatus(state, message) {
  const summaryText = document.getElementById('summary-text');
  const badge = document.querySelector('#status-summary .badge');

  if (summaryText) {
    summaryText.textContent = message;
  }

  if (badge) {
    badge.className = `badge badge-${state}`;
    badge.textContent = state.toUpperCase();
  }
}
