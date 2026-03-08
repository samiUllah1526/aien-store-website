/**
 * Global loading counter for API requests. When count > 0, the GlobalLoader shows.
 * API layer calls incrementLoading() at request start and decrementLoading() in finally.
 */

const LOADING_EVENT = 'admin-loading-change';

let count = 0;

function emit() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOADING_EVENT, { detail: { count } }));
  }
}

export function incrementLoading(): void {
  count += 1;
  emit();
}

export function decrementLoading(): void {
  count = Math.max(0, count - 1);
  emit();
}

export function getLoadingCount(): number {
  return count;
}

export { LOADING_EVENT };
