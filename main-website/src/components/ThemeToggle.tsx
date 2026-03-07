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
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
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

  const showDarkIcon = theme === 'dark' || (theme === 'system' && resolved === 'dark');

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${label}. Click to change.`}
      className="p-2 text-soft-charcoal dark:text-off-white hover:text-ash transition-colors duration-300 rounded focus-ring"
    >
      {showDarkIcon ? <IconSun /> : <IconMoon />}
    </button>
  );
}
