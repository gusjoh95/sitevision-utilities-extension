/**
 * Log manager class for appending and updating log messages inside a dedicated container element.
 */
export default class Logger {
  /**
   * Creates an instance of Logger.
   *
   * @param {HTMLElement} container - Target container element for log output.
   */
  constructor(container) {
    if (!container) {
      throw new Error('Logger requires a valid HTML container element.');
    }
    /** @type {HTMLElement} */
    this.container = container;
    this._boundUpdate = this._updateContainerSize.bind(this);
    // keep the container sized to the available viewport space
    window.addEventListener('resize', this._boundUpdate, { passive: true });
    // initial sizing
    this._updateContainerSize();
  }

  clear() {
    this.container.textContent = '';
    // recalc size after clearing (content may shrink)
    this._updateContainerSize();
  }

  /**
   * Appends a new formatted log entry line to the container.
   *
   * @param {'info' | 'success' | 'warn' | 'error'} type - Severity or status type of the log entry.
   * @param {string} message - Text message to log.
   */
  log(type, message) {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;

    const timestamp = new Date().toLocaleTimeString();
    entry.textContent = `[${timestamp}] ${message}`;

    this.container.appendChild(entry);
    this.container.scrollTop = this.container.scrollHeight;
  }

  /**
   * Appends additional text to the end of the last log entry line.
   *
   * @param {string} message - Text message to append to the existing log line.
   */
  append(message) {
    if (this.container.lastElementChild) {
      this.container.lastElementChild.textContent += ` ${message}`;
      this._updateContainerSize();
      this.container.scrollTop = this.container.scrollHeight;
    } else {
      this.log('info', message);
    }
  }

  /**
   * Recalculate and set the container max-height based on available viewport space.
   * Uses the container's top offset and document body padding to compute available height.
   */
  _updateContainerSize() {
    try {
      const rect = this.container.getBoundingClientRect();
      const bodyStyle = getComputedStyle(document.body);
      const bodyPaddingBottom = parseFloat(bodyStyle.paddingBottom) || 0;
      // Increased safety margin to prevent window scrollbars
      const margin = 24;
      const available = Math.max(64, window.innerHeight - rect.top - bodyPaddingBottom - margin);
      this.container.style.maxHeight = `${available}px`;
    } catch {
      // ignore — sizing is best-effort
    }
  }

  /**
   * Remove attached listeners and cleanup
   */
  destroy() {
    window.removeEventListener('resize', this._boundUpdate);
  }
}
