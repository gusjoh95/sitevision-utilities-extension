/**
 * @typedef {Object} DelaySettingsParams
 * @property {HTMLInputElement} reindexDelayInput
 * @property {HTMLInputElement} apiDelayInput
 * @property {HTMLDialogElement} lowDelayWarning
 * @property {number} defaultReindexDelayMs
 * @property {number} defaultApiDelayMs
 */

/**
 * Binds delay input normalization, confirmation, and live accepted-value getters.
 *
 * @param {DelaySettingsParams} params
 * @returns {{ getReindexDelayMs: () => number, getApiDelayMs: () => number }}
 */
export function bindDelaySettings({
  reindexDelayInput,
  apiDelayInput,
  lowDelayWarning,
  defaultReindexDelayMs,
  defaultApiDelayMs,
}) {
  setLowDelayDialogText(lowDelayWarning);
  const acknowledgement = { hasConfirmed: false };

  return {
    getReindexDelayMs: bindDelayInput(
      reindexDelayInput,
      defaultReindexDelayMs,
      lowDelayWarning,
      acknowledgement
    ),
    getApiDelayMs: bindDelayInput(
      apiDelayInput,
      defaultApiDelayMs,
      lowDelayWarning,
      acknowledgement
    ),
  };
}

/** @param {HTMLDialogElement} dialog */
function setLowDelayDialogText(dialog) {
  const title = dialog.querySelector('h2');
  const message = dialog.querySelector('p');
  const okButton = dialog.querySelector('button[value="ok"]');
  const cancelButton = dialog.querySelector('button[value="cancel"]');

  if (!title || !message || !okButton || !cancelButton) {
    throw new Error('Low-delay dialog is missing a required element.');
  }

  title.textContent = 'Low delay warning';
  message.textContent =
    'Delays below 100 ms are at your own risk. Low values may trigger rate limits or freeze your session.';
  okButton.textContent = 'OK';
  cancelButton.textContent = 'Cancel';
}

/**
 * @param {HTMLInputElement} input
 * @param {number} defaultDelayMs
 * @returns {number}
 */
function readDelay(input, defaultDelayMs) {
  const delayMs = input.valueAsNumber;

  if (input.value.trim() === '' || !Number.isFinite(delayMs)) return defaultDelayMs;

  return Math.min(60000, Math.max(0, Math.ceil(delayMs / 25) * 25));
}

/**
 * @param {HTMLInputElement} input
 * @param {number} defaultDelayMs
 * @param {HTMLDialogElement} lowDelayWarning
 * @param {{ hasConfirmed: boolean }} acknowledgement
 * @returns {() => number}
 */
function bindDelayInput(input, defaultDelayMs, lowDelayWarning, acknowledgement) {
  let acceptedDelayMs = readDelay(input, defaultDelayMs);
  input.value = String(acceptedDelayMs);

  input.addEventListener('change', () => {
    const requestedDelayMs = readDelay(input, defaultDelayMs);
    input.value = String(requestedDelayMs);

    if (requestedDelayMs >= 100 || acknowledgement.hasConfirmed) {
      acceptedDelayMs = requestedDelayMs;
      return;
    }

    lowDelayWarning.returnValue = '';
    lowDelayWarning.addEventListener(
      'close',
      () => {
        if (lowDelayWarning.returnValue === 'ok') {
          acknowledgement.hasConfirmed = true;
          acceptedDelayMs = requestedDelayMs;
        }
        input.value = String(acceptedDelayMs);
      },
      { once: true }
    );
    lowDelayWarning.showModal();
  });

  return () => acceptedDelayMs;
}
