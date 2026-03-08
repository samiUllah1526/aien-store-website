/**
 * Global loading counter for API requests. When count > 0, the GlobalLoader shows.
 * API layer calls incrementLoading() at request start and decrementLoading() in finally.
 * Loader is shown for at least MIN_LOADING_DISPLAY_MS so quick requests don't cause a jerky flash.
 */

const LOADING_EVENT = 'admin-loading-change';

/** Minimum time (ms) to show the loader so fast requests don't flash. */
// 5 seconds -> 5 * 1000 = 5000
const MIN_LOADING_DISPLAY_MS = 1000 / 2;

let count = 0;
const startTimes: number[] = [];

function emit() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOADING_EVENT, { detail: { count } }));
  }
}

export function incrementLoading(): void {
  count += 1;
  startTimes.push(Date.now());
  emit();
}

export function decrementLoading(): void {
  const start = startTimes.shift();
  if (start === undefined) {
    count = Math.max(0, count - 1);
    emit();
    return;
  }
  const elapsed = Date.now() - start;
  const delay = Math.max(0, MIN_LOADING_DISPLAY_MS - elapsed);
  if (delay === 0) {
    count = Math.max(0, count - 1);
    emit();
    return;
  }
  setTimeout(() => {
    count = Math.max(0, count - 1);
    emit();
  }, delay);
}

export function getLoadingCount(): number {
  return count;
}

export { LOADING_EVENT };
