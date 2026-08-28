/**
 * Safely extracts a displayable error message from any thrown value.
 * @param {unknown} err
 * @returns {string}
 */
export function getErrorMessage(err) {
  if (err instanceof Error && err.message) {
    return err.message;
  }
  
  if (typeof err === "string" && err.trim().length > 0) {
    return err;
  }

  return String(err);
}