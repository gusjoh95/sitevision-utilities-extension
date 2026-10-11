const spinnerStates = new WeakMap();

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
  let state = spinnerStates.get(spinnerEl);
  if (!state) {
    state = { pending: new Set(), visible: new Set() };
    spinnerStates.set(spinnerEl, state);
  }

  const request = {};
  state.pending.add(request);

  const timerId = setTimeout(() => {
    if (state.pending.has(request)) {
      state.visible.add(request);
      spinnerEl.classList.remove('hidden');
    }
  }, delayMs);

  try {
    return await taskFn();
  } finally {
    clearTimeout(timerId);
    state.pending.delete(request);
    state.visible.delete(request);
    if (state.visible.size === 0) {
      spinnerEl.classList.add('hidden');
    }
  }
}
