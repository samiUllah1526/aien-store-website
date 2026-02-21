/**
 * Generate a unique key for idempotent checkout requests.
 * Same key is sent on retries so the server returns the existing order instead of creating a duplicate.
 */
export function randomUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
