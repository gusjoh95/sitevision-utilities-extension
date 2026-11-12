import { SET_ACTIVE_TARGET_MESSAGE, TARGET_LOST_MESSAGE } from '../../background/messages.js';
import { getMessage } from './i18n.js';

/**
 * @typedef {'closed' | 'cross-origin'} TargetLostReason
 */

/** @type {{ closed: TargetLostReason, crossOrigin: TargetLostReason }} */
const targetLostReasons = {
  closed: 'closed',
  crossOrigin: 'cross-origin',
};

const inaccessibleTargetMessage = 'Target tab no longer exists or is inaccessible.';

const targetAccessMessageKeys = {
  [targetLostReasons.closed]: 'common_targetClosed',
  [targetLostReasons.crossOrigin]: 'common_targetUnavailable',
  inaccessible: 'common_inaccessibleTarget',
};

/** @typedef {keyof typeof targetAccessMessageKeys} TargetAccessReason */
const targetAccessErrorMessages = [
  {
    messageKey: 'common_inaccessibleTarget',
    fragments: [inaccessibleTargetMessage],
  },
  {
    messageKey: 'common_targetClosed',
    fragments: ['No tab with id', 'is not a valid tab ID'],
  },
  {
    messageKey: 'common_targetUnavailable',
    fragments: [
      'Target tab is inaccessible.',
      'Missing host permission',
      'Cannot access contents of url',
      'The extensions gallery cannot be scripted',
    ],
  },
];

export class TargetAccessError extends Error {
  /**
   * @param {TargetAccessReason} reason
   * @param {ErrorOptions} [options]
   */
  constructor(reason, options) {
    super(getMessage(targetAccessMessageKeys[reason]), options);
    this.name = 'TargetAccessError';
    this.reason = reason;
  }
}

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
  const resolvedReason = isTargetLostReason(reason) ? reason : targetLostReasons.crossOrigin;
  return getMessage(targetAccessMessageKeys[resolvedReason]);
}

/**
 * @param {string} reason
 * @returns {reason is TargetLostReason}
 */
function isTargetLostReason(reason) {
  return reason === targetLostReasons.closed || reason === targetLostReasons.crossOrigin;
}

/**
 * Returns the standard target-loss message for browser tab access failures.
 *
 * @param {unknown} error
 * @returns {string | null}
 */
export function getTargetAccessErrorMessage(error) {
  if (error instanceof TargetAccessError) {
    return getMessage(targetAccessMessageKeys[error.reason]);
  }

  const errorMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';

  for (const { messageKey, fragments } of targetAccessErrorMessages) {
    if (fragments.some((fragment) => errorMessage.includes(fragment))) {
      return getMessage(messageKey);
    }
  }

  return null;
}

/**
 * Verifies that the target tab still exists and exposes a readable URL.
 *
 * @param {number} tabId - Target tab ID (must be a number).
 * @param {string} [origin]
 * @returns {Promise<void>}
 */
export async function assertTargetTabAccessible(tabId, origin) {
  if (typeof tabId !== 'number' || !Number.isInteger(tabId) || tabId <= 0) {
    throw new Error('Missing or invalid Tab ID.');
  }

  let invocationTab;

  try {
    invocationTab = await browser.tabs.get(tabId);
  } catch (error) {
    throw new TargetAccessError(targetLostReasons.closed, { cause: error });
  }

  const currentUrl = invocationTab.pendingUrl || invocationTab.url;
  if (!currentUrl?.length) {
    throw new TargetAccessError(targetLostReasons.crossOrigin);
  }

  if (!origin) {
    return;
  }

  let currentOrigin;
  try {
    currentOrigin = new URL(currentUrl).origin;
  } catch (error) {
    throw new TargetAccessError('inaccessible', { cause: error });
  }

  if (currentOrigin !== origin) {
    throw new TargetAccessError(targetLostReasons.crossOrigin);
  }
}

/**
 * Registers a target tab in the background service worker and listens for access loss.
 *
 * @param {Object} options
 * @param {number} options.tabId
 * @param {string} options.origin
 * @param {(event: TargetLostEvent) => void} options.onLost
 * @returns {() => void} Cleanup function that removes the listener.
 */
export function registerTargetPermissionListener({ tabId, origin, onLost }) {
  if (typeof tabId !== 'number' || !Number.isInteger(tabId) || tabId <= 0 || !origin) {
    return () => {};
  }

  const targetTabId = tabId;

  browser.runtime.sendMessage({
    type: SET_ACTIVE_TARGET_MESSAGE,
    tabId: targetTabId,
    origin,
  });

  /** @type {Parameters<typeof browser.runtime.onMessage.addListener>[0]} */
  const listener = (msg) => {
    /** @type {{ type?: string, tabId?: number, reason?: TargetLostReason }} */
    const targetMessage = msg;

    if (targetMessage.type !== TARGET_LOST_MESSAGE) {
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

  browser.runtime.onMessage.addListener(listener);

  return () => browser.runtime.onMessage.removeListener(listener);
}
