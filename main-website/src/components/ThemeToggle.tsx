/**
 * Theme toggle: cycles system → light → dark → system.
 * Minimal iconography; smooth transition. Accessible.
 */

import { useState, useEffect } from 'react';
import { themeStore, subscribeSystemPreference, type Theme } from '../store/themeStore';

function IconSun() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1.5M12 20.5V22M4.22 4.22l1.06 1.06M18.72 18.72l1.06 1.06M3 12h1.5M19.5 12H22M4.22 19.78l1.06-1.06M18.72 5.28l1.06-1.06M12 16.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 12.75a9 9 0 11-18 0 9 9 0 0118 0zM12 3v1.5M12 20.25v1.5M4.5 12h-1.5m15 0h-1.5M6.47 6.47l-1.06 1.06m11.06 11.06l-1.06 1.06M6.47 17.53l1.06-1.06m11.06-11.06l1.06-1.06" />
    </svg>
  );
}

function IconSystem() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  );
}

const ORDER: Theme[] = ['system', 'light', 'dark'];

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  // Sync React state with stored theme and apply class on mount (and when system preference changes)
  useEffect(() => {
    const stored = themeStore.getStored();
    setTheme(stored);
    const res = themeStore.getResolved();
    setResolved(res);
    themeStore.init(); // ensure DOM has correct class from localStorage
    const unsub = subscribeSystemPreference(setResolved);
    return unsub;
  }, []);

  const cycle = () => {
    const i = ORDER.indexOf(theme);
    const next = ORDER[(i + 1) % ORDER.length];
    setTheme(next);
    themeStore.setStored(next);
    const newResolved = themeStore.getResolved();
    setResolved(newResolved);
    // Apply class directly so DOM updates reliably (full-page nav or hydration timing)
    const root = document.documentElement;
    if (newResolved === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  };

  const label =
    theme === 'system'
      ? `System (${resolved})`
      : theme === 'light'
        ? 'Light'
        : 'Dark';

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${label}. Click to change.`}
      className="p-2 text-soft-charcoal dark:text-off-white hover:text-ash transition-colors duration-300 rounded focus-ring"
    >
      {theme === 'system' ? (
        resolved === 'dark' ? <IconMoon /> : <IconSun />
      ) : theme === 'dark' ? (
        <IconMoon />
      ) : (
        <IconSun />
      )}
    </button>
  );
}
