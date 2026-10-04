/**
 * Executes an asynchronous task and shows a spinner element only if the task
 * execution time exceeds the specified threshold delay.
 *
 * @template T
 * @param {() => Promise<T>} taskFn - The async function to execute.
 * @param {object} options
 * @param {HTMLElement} options.spinnerEl - The DOM element representing the spinner.
 * @param {number} [options.delayMs=200] - Delay in milliseconds before revealing the spinner.
 * @returns {Promise<T>} Resolves with the result of taskFn.
 */
export async function withDeferredSpinner(taskFn, { spinnerEl, delayMs = 200 }) {
  let isCompleted = false;

  const timerId = setTimeout(() => {
    if (!isCompleted && spinnerEl) {
      spinnerEl.classList.remove('hidden');
    }
  }, delayMs);

  try {
    return await taskFn();
  } finally {
    isCompleted = true;
    clearTimeout(timerId);
    if (spinnerEl) {
      spinnerEl.classList.add('hidden');
    }
  }
}
