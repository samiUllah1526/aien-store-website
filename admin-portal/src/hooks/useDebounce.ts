import { useState, useEffect } from 'react';

const DEFAULT_DEBOUNCE_MS = 400;

/**
 * Returns a debounced value that updates after `delay` ms of no changes.
 * Use for search inputs: bind input to value, use debouncedValue for API calls.
 */
export function useDebounce<T>(value: T, delay: number = DEFAULT_DEBOUNCE_MS): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
