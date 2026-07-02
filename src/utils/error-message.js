/**
 * Extract a human-readable message from an unknown thrown value.
 * @param {unknown} err
 * @returns {string}
 */
export function getErrorMessage(err) {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  if (err && typeof err === 'object' && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return String(err);
}

/**
 * @param {unknown} err
 * @returns {err is Error}
 */
export function isError(err) {
  return err instanceof Error;
}
