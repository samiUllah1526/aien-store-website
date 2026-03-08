/**
 * Global loader overlay shown when any API request is in progress.
 * Listens to loading counter from lib/loading (updated by api.ts).
 */

import { useState, useEffect } from 'react';
import { LOADING_EVENT } from '../lib/loading';

export function GlobalLoader() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const handler = (e: CustomEvent<{ count: number }>) => setCount(e.detail?.count ?? 0);
    window.addEventListener(LOADING_EVENT, handler as EventListener);
    return () => window.removeEventListener(LOADING_EVENT, handler as EventListener);
  }, []);

  if (count === 0) return null;

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-900/20 dark:bg-black/30"
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="flex flex-col items-center gap-3 rounded-xl bg-white px-6 py-5 shadow-xl dark:bg-slate-800 dark:border dark:border-slate-700">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600 dark:border-slate-600 dark:border-t-slate-300"
          aria-hidden
        />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Loading…</p>
      </div>
    </div>
  );
}
