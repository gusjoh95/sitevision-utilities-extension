/**
 * Message names and payload types for communication with the background context.
 * Keep this file free of side effects so views and API modules can import the contract
 * without importing or initializing the background entry point.
 */
export const SET_ACTIVE_TARGET_MESSAGE = 'SET_ACTIVE_TARGET';
export const TARGET_LOST_MESSAGE = 'TARGET_LOST';
export const BEFORE_UNLOAD_GUARD_MESSAGE = 'BEFORE_UNLOAD_GUARD';

/**
 * @typedef {{ type: 'SET_ACTIVE_TARGET', tabId: number, origin: string }} SetActiveTargetMessage
 * @typedef {{ type: 'TARGET_LOST', tabId: number, reason: 'closed' | 'cross-origin' }} TargetLostMessage
 * @typedef {{ type: 'BEFORE_UNLOAD_GUARD', action: 'install' | 'remove', tabId: number, guardId: string }} BeforeUnloadGuardMessage
 */

export {};