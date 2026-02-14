/**
 * Theme: system-aware light/dark with manual override.
 * Persisted to localStorage; applied as `dark` class on <html>.
 * Tailwind uses darkMode: 'class'.
 */

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'adab-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

function applyTheme(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export const themeStore = {
  getStored(): Theme {
    if (typeof window === 'undefined') return 'system';
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
    return 'system';
  },
  setStored(theme: Theme) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
      applyTheme(resolveTheme(theme));
    } catch (_) {}
  },
  /** Run once on load (or after hydration) to apply stored or system theme. */
  init() {
    try {
      const theme = this.getStored();
      applyTheme(resolveTheme(theme));
    } catch (_) {}
  },
  /** Current resolved theme (light or dark) for UI. */
  getResolved(): 'light' | 'dark' {
    return resolveTheme(this.getStored());
  },
};

/** Subscribe to system preference changes when theme is 'system'. */
export function subscribeSystemPreference(callback: (resolved: 'light' | 'dark') => void) {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = () => {
    if (themeStore.getStored() === 'system') {
      const resolved = getSystemTheme();
      applyTheme(resolved);
      callback(resolved);
    }
  };
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}
