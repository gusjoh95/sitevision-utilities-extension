/**
 * @typedef {'closed' | 'cross-origin'} TargetLostReason
 */

/** @type {{ closed: TargetLostReason, crossOrigin: TargetLostReason }} */
const targetLostReasons = {
  closed: 'closed',
  crossOrigin: 'cross-origin',
};

const inaccessibleTargetMessage = 'Target tab no longer exists or is inaccessible.';

const targetLostMessages = {
  [targetLostReasons.closed]:
    'The original website tab was closed. Please open this view again from an active page.',
  [targetLostReasons.crossOrigin]:
    'The original website tab navigated away or browser permissions were revoked. Please open this view again from an active page.',
};

const targetLostReasonValues = Object.keys(targetLostMessages);

const targetAccessErrorMessages = [
  {
    message: inaccessibleTargetMessage,
    fragments: [inaccessibleTargetMessage],
  },
  {
    message: targetLostMessages[targetLostReasons.closed],
    fragments: [
      targetLostMessages[targetLostReasons.closed],
      'No tab with id',
      'is not a valid tab ID',
    ],
  },
  {
    message: targetLostMessages[targetLostReasons.crossOrigin],
    fragments: [
      targetLostMessages[targetLostReasons.crossOrigin],
      'Target tab is inaccessible.',
      'Missing host permission',
      'Cannot access contents of url',
      'The extensions gallery cannot be scripted',
    ],
  },
];

/**
 * @typedef {Object} TargetLostEvent
 * @property {number} tabId - Target browser tab identifier.
 * @property {TargetLostReason} reason - Why the target can no longer be accessed.
 * @property {string} message - User-facing explanation of the loss.
 */

/**
 * Returns a user-facing message for target tab or permission loss.
 *
 * @param {TargetLostReason} reason
 * @returns {string}
 */
export function getTargetLostMessage(reason) {
  return isTargetLostReason(reason)
    ? targetLostMessages[reason]
    : targetLostMessages[targetLostReasons.crossOrigin];
}

/**
 * @param {string} reason
 * @returns {reason is TargetLostReason}
 */
function isTargetLostReason(reason) {
  return targetLostReasonValues.includes(reason);
}

/**
 * Returns the standard target-loss message for browser tab access failures.
 *
 * @param {string} errorMessage
 * @returns {string | null}
 */
export function getTargetAccessErrorMessage(errorMessage) {
  for (const { message, fragments } of targetAccessErrorMessages) {
    if (fragments.some((fragment) => errorMessage.includes(fragment))) {
      return message;
    }
  }

  return null;
}

/**
 * Verifies that the target tab still exists and exposes a readable URL.
 *
 * @param {string | number} tabId
 * @param {string} [origin]
 * @returns {Promise<void>}
 */
export async function assertTargetTabAccessible(tabId, origin) {
  let invocationTab;

  try {
    invocationTab = await chrome.tabs.get(Number(tabId));
  } catch (error) {
    throw new Error(getTargetLostMessage(targetLostReasons.closed), { cause: error });
  }

  const currentUrl = invocationTab.pendingUrl || invocationTab.url;
  if (!currentUrl?.length) {
    throw new Error(getTargetLostMessage(targetLostReasons.crossOrigin));
  }

  if (!origin) {
    return;
  }

  let currentOrigin;
  try {
    currentOrigin = new URL(currentUrl).origin;
  } catch (error) {
    throw new Error(inaccessibleTargetMessage, { cause: error });
  }

  if (currentOrigin !== origin) {
    throw new Error(getTargetLostMessage(targetLostReasons.crossOrigin));
  }
}

/**
 * Registers a target tab in the background service worker and listens for access loss.
 *
 * @param {Object} options
 * @param {string | number} options.tabId
 * @param {string} options.origin
 * @param {(event: TargetLostEvent) => void} options.onLost
 * @returns {() => void} Cleanup function that removes the listener.
 */
export function registerTargetPermissionListener({ tabId, origin, onLost }) {
  const targetTabId = Number(tabId);

  if (!targetTabId || !origin) {
    return () => {};
  }

  chrome.runtime.sendMessage({
    type: 'SET_ACTIVE_TARGET',
    tabId: targetTabId,
    origin,
  });

  /** @type {Parameters<typeof chrome.runtime.onMessage.addListener>[0]} */
  const listener = (msg) => {
    /** @type {{ type?: string, tabId?: number, reason?: TargetLostReason }} */
    const targetMessage = msg;

    if (targetMessage.type !== 'TARGET_LOST') {
      return undefined;
    }

    if (targetMessage.tabId !== targetTabId) {
      return undefined;
    }

    const reason = targetMessage.reason ?? 'cross-origin';
    onLost({
      tabId: targetTabId,
      reason,
      message: getTargetLostMessage(reason),
    });

    return undefined;
  };

  chrome.runtime.onMessage.addListener(listener);

  return () => chrome.runtime.onMessage.removeListener(listener);
}
