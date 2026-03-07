import { useState, useEffect } from 'react';
import { brandName } from '../../config';
import CartIcon from '../cart/CartIcon';
import ThemeToggle from '../ThemeToggle';
import ProfileMenu from './ProfileMenu';

interface AppHeaderProps {
  logoSrc: string;
}

const navLinks = [
  { href: '/', label: 'HOME', match: (path: string, search: string) => path === '/' },
  { href: '/shop?category=beggy-tees', label: 'BEGGY T-SHIRTS', match: (path: string, search: string) => path === '/shop' && search.includes('category=beggy-tees') },
  { href: '/shop?category=hoodies', label: 'HOODIES', match: (path: string, search: string) => path === '/shop' && search.includes('category=hoodies') },
  { href: '/about', label: 'ABOUT', match: (path: string, search: string) => path === '/about' },
] as const;

function NavLink({
  href,
  label,
  isActive,
}: {
  href: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <a
      href={href}
      className={`relative py-2 px-1 min-h-[2.75rem] flex items-center text-xs sm:text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-mehndi/50 focus-visible:ring-offset-2 rounded group ${
        isActive
          ? 'text-mehndi dark:text-mehndi'
          : 'text-soft-charcoal dark:text-off-white hover:text-mehndi'
      }`}
    >
      <span className="relative z-10">{label}</span>
      {/* Hover: underline animates left to right */}
      <span
        className={`absolute bottom-2 left-1 right-1 h-0.5 bg-mehndi transition-transform duration-300 ease-out origin-left ${
          isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
        }`}
        aria-hidden
      />
    </a>
  );
}

export default function AppHeader({ logoSrc }: AppHeaderProps) {
  const [pathname, setPathname] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setPathname(window.location.pathname);
    setSearch(window.location.search || '');
    const onPopState = () => {
      setPathname(window.location.pathname);
      setSearch(window.location.search || '');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-bone dark:bg-charcoal border-b border-ash/20 transition-colors duration-400">
      <nav className="w-full" aria-label="Main">
        <div className="grid grid-cols-3 items-center gap-2 sm:gap-4 h-14 sm:h-16 min-h-[3.5rem]">
          <a
            href="/"
            className="font-display text-lg sm:text-xl text-soft-charcoal dark:text-off-white hover:text-ash transition-colors duration-300 focus-ring rounded justify-self-start"
            aria-label={`${brandName} home`}
          >
            {logoSrc ? (
              <img src={logoSrc} alt={brandName} className="h-7 sm:h-8 w-auto object-contain max-h-10" />
            ) : (
              <span className="text-xl sm:text-2xl" aria-hidden>ع</span>
            )}
          </a>
          <form action="/shop" method="get" className="hidden sm:flex justify-center min-w-0 px-2 col-start-2">
            <label htmlFor="nav-search" className="sr-only">Search</label>
            <input
              id="nav-search"
              type="search"
              name="q"
              placeholder="Search Product"
              className="w-full max-w-md min-w-0 px-3 sm:px-4 py-2 rounded-lg border border-ash/30 bg-bone dark:bg-charcoal-light text-soft-charcoal dark:text-off-white placeholder:text-ash focus:outline-none focus:ring-2 focus:ring-mehndi/50 text-sm"
            />
          </form>
          <ul className="flex items-center gap-2 sm:gap-4 justify-self-end col-start-3">
            <li className="flex items-center"><ThemeToggle /></li>
            <li><CartIcon /></li>
            <ProfileMenu />
          </ul>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 md:gap-8 py-2.5 sm:py-3 border-t border-ash/10 w-full">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              isActive={link.match(pathname, search)}
            />
          ))}
        </div>
      </nav>
    </header>
  );
}
