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
  }

  clear() {
    this.container.textContent = '';
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
      this.container.scrollTop = this.container.scrollHeight;
    } else {
      this.log('info', message);
    }
  }
}
