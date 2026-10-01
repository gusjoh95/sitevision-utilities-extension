/**
 * Log manager class for appending and updating log messages inside a dedicated container element.
 */
export class Logger {
  /** @param {HTMLElement} container - Target container element for log output. */
  constructor(container) {
    if (!container) throw new Error('Logger requires a valid HTML container element.');
    /** @type {HTMLElement} */
    this.container = container;
    this._boundUpdate = this._updateContainerSize.bind(this);
    window.addEventListener('resize', this._boundUpdate, { passive: true });
    this._updateContainerSize();
  }

  clear() {
    this.container.textContent = '';
    this._updateContainerSize();
  }

  /**
   * @param {'info' | 'success' | 'warn' | 'error'} type
   * @param {string} message
   */
  log(type, message) {
    this._updateWithAutoScroll(() => {
      const entry = document.createElement('div');
      entry.className = `log-entry log-${type}`;
      entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
      this.container.appendChild(entry);
      this._updateContainerSize();
    });
  }

  /** @param {string} message */
  append(message) {
    const lastEntry = this.container.lastElementChild;
    if (!lastEntry) {
      this.log('info', message);
      return;
    }
    this._updateWithAutoScroll(() => {
      lastEntry.textContent += ` ${message}`;
    });
  }

  /** @param {() => void} update */
  _updateWithAutoScroll(update) {
    const wasNearBottom =
      this.container.scrollHeight - this.container.scrollTop - this.container.clientHeight <= 48;
    update();
    if (wasNearBottom) this.container.scrollTop = this.container.scrollHeight;
  }

  _updateContainerSize() {
    try {
      const rect = this.container.getBoundingClientRect();
      const bodyStyle = getComputedStyle(document.body);
      const bodyPaddingBottom = parseFloat(bodyStyle.paddingBottom) || 0;
      const available = Math.max(64, window.innerHeight - rect.top - bodyPaddingBottom - 24);
      this.container.style.maxHeight = `${available}px`;
    } catch {
      // Sizing is best-effort.
    }
  }

  destroy() {
    window.removeEventListener('resize', this._boundUpdate);
  }
}

/**
 * Creates an independent logger instance bound to a log container.
 *
 * @param {HTMLElement} container
 * @returns {Logger}
 */
export function create(container) {
  return new Logger(container);
}
