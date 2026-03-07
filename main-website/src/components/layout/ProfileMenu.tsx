import { useRef, useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';

export default function ProfileMenu() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [profileOpen]);

  return (
    <li className="relative">
      <div ref={profileRef} className="relative">
        <button
          type="button"
          onClick={() => setProfileOpen((o) => !o)}
          className="flex items-center justify-center rounded-full w-9 h-9 sm:w-10 sm:h-10 border-2 border-ash/30 bg-bone dark:bg-charcoal-light text-soft-charcoal dark:text-off-white hover:border-mehndi/50 hover:bg-sand/50 dark:hover:bg-charcoal/50 focus:outline-none focus:ring-2 focus:ring-mehndi/50 focus:ring-offset-2 focus:ring-offset-bone dark:focus:ring-offset-charcoal transition-colors overflow-hidden"
          aria-expanded={profileOpen}
          aria-haspopup="true"
          aria-label="Account menu"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
        {profileOpen && (
          <div
            className="absolute right-0 top-full mt-2 py-2 min-w-[12rem] rounded-xl border border-sand dark:border-charcoal-light bg-bone dark:bg-charcoal-light shadow-lg z-50"
            role="menu"
          >
            {isLoggedIn ? (
              <>
                <a href="/account/orders" className="flex items-center gap-3 px-4 py-2.5 text-sm text-soft-charcoal dark:text-off-white hover:bg-sand/50 dark:hover:bg-charcoal/50" role="menuitem" onClick={() => setProfileOpen(false)}>
                  <svg className="w-5 h-5 shrink-0 text-ash" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  My Orders
                </a>
                <a href="/account/favorites" className="flex items-center gap-3 px-4 py-2.5 text-sm text-soft-charcoal dark:text-off-white hover:bg-sand/50 dark:hover:bg-charcoal/50" role="menuitem" onClick={() => setProfileOpen(false)}>
                  <svg className="w-5 h-5 shrink-0 text-ash" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  Wishlist
                </a>
                <div className="border-t border-sand dark:border-charcoal-light my-1" />
                <button type="button" onClick={() => { setProfileOpen(false); clearAuth(); window.location.href = '/'; }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ash hover:bg-sand/50 dark:hover:bg-charcoal/50" role="menuitem">
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Log out
                </button>
              </>
            ) : (
              <>
                <a href="/login" className="flex items-center gap-3 px-4 py-2.5 text-sm text-soft-charcoal dark:text-off-white hover:bg-sand/50 dark:hover:bg-charcoal/50" role="menuitem" onClick={() => setProfileOpen(false)}>
                  <svg className="w-5 h-5 shrink-0 text-ash" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  Log in
                </a>
                <a href="/register" className="flex items-center gap-3 px-4 py-2.5 text-sm text-soft-charcoal dark:text-off-white hover:bg-sand/50 dark:hover:bg-charcoal/50" role="menuitem" onClick={() => setProfileOpen(false)}>
                  <svg className="w-5 h-5 shrink-0 text-ash" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                  Create account
                </a>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
