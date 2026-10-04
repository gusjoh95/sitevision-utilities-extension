const activeStateTimeouts = new WeakMap();

/**
 * Temporarily applies the active state to an element.
 * Repeated calls restart the duration.
 * @param {HTMLElement} element - Element to mark active.
 * @param {number} [duration=1000] - Duration of the active state in milliseconds.
 */
export function showTemporaryActive(element, duration = 1000) {
  const existingTimeout = activeStateTimeouts.get(element);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  element.classList.add('active');
  const timeout = setTimeout(() => {
    element.classList.remove('active');
    activeStateTimeouts.delete(element);
  }, duration);

  activeStateTimeouts.set(element, timeout);
}
