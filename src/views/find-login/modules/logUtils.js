// Bind click handler once for clipboard copy & tooltip/feedback state
const summaryLink = document.getElementById('summary-link');
if (summaryLink) {
  summaryLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const url = summaryLink.dataset.url;
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);

      // Temporary inline feedback (or trigger your custom tooltip here)
      const originalText = summaryLink.textContent;
      summaryLink.textContent = 'Copied!';
      setTimeout(() => {
        summaryLink.textContent = originalText;
      }, 1500);
    } catch (err) {
      console.error('Failed to copy URL to clipboard:', err);
    }
  });
}

/**
 * Appends a formatted entry to the log container or appends text to the last entry.
 *
 * @param {HTMLElement} container
 * @param {'info' | 'success' | 'warn' | 'error'} type
 * @param {string} message
 * @param {Object} [options]
 * @param {boolean} [options.append=false] - Whether to append text to the previous log entry.
 */
export function appendLog(container, type, message, { append = false } = {}) {
  if (append && container.lastElementChild) {
    container.lastElementChild.textContent += ` ${message}`;
    container.scrollTop = container.scrollHeight;
    return;
  }

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
 * @param {string} [url] - Optional target URL to attach to the summary link.
 */
export function setStatus(state, message, url = '') {
  const summaryText = document.getElementById('summary-text');
  const badge = document.querySelector('#status-summary .badge');
  const link = document.getElementById('summary-link');

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
