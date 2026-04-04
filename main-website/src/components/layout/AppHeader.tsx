import { useState, useEffect, useCallback, useRef } from 'react';
import { brandName } from '../../config';
import { getApiBaseUrl } from '../../lib/api';
import { api } from '../../lib/api';
import { formatMoney } from '../../lib/formatMoney';
import CartIcon from '../cart/CartIcon';
import ThemeToggle from '../ThemeToggle';
import ProfileMenu from './ProfileMenu';

interface LandingCategory {
  id: string;
  name: string;
  slug: string;
}

type NavLinkItem = {
  href: string;
  label: string;
  match: (path: string, search: string) => boolean;
};

const HOME_LINK: NavLinkItem = {
  href: '/',
  label: 'HOME',
  match: (path: string) => path === '/',
};

const ABOUT_LINK: NavLinkItem = {
  href: '/about',
  label: 'ABOUT',
  match: (path: string) => path === '/about',
};

function buildNavLinks(categories: LandingCategory[]): NavLinkItem[] {
  const middle = categories.map((cat) => ({
    href: `/shop/category/${encodeURIComponent(cat.slug)}`,
    label: cat.name.toUpperCase(),
    match: (path: string, _search: string) => path === `/shop/category/${cat.slug}`,
  }));
  return [HOME_LINK, ...middle, ABOUT_LINK];
}

interface SearchProduct {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  image: string;
}

const SEARCH_DEBOUNCE_MS = 280;
const SEARCH_LIMIT = 6;

function NavSearchResults({
  searchLoading,
  searchResults,
  searchQuery,
  onPickResult,
}: {
  searchLoading: boolean;
  searchResults: SearchProduct[];
  searchQuery: string;
  onPickResult: () => void;
}) {
  return (
    <>
      {searchLoading ? (
        <div className="px-4 py-6 text-center text-sm text-ash">Searching…</div>
      ) : searchResults.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-ash">No products found.</div>
      ) : (
        <ul className="divide-y divide-ash/20">
          {searchResults.map((product) => (
            <li key={product.id} role="option">
              <a
                href={`/shop/${product.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-ash/10 dark:hover:bg-ash/20 transition-colors text-left"
                onClick={onPickResult}
              >
                <span className="flex-shrink-0 w-12 h-14 sm:w-14 sm:h-16 rounded overflow-hidden bg-ash/10">
                  {product.image ? (
                    <img src={product.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-ash text-xs" aria-hidden>—</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-soft-charcoal dark:text-off-white truncate">{product.name}</span>
                  <span className="block text-xs text-ash mt-0.5">{formatMoney(product.price, product.currency)}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {!searchLoading && searchResults.length > 0 && (
        <div className="border-t border-ash/20 pt-2 mt-1">
          <a
            href={`/shop?q=${encodeURIComponent(searchQuery.trim())}`}
            className="block px-4 py-2 text-sm font-medium text-mehndi hover:bg-ash/10 dark:hover:bg-ash/20 text-center"
            onClick={onPickResult}
          >
            View all results
          </a>
        </div>
      )}
    </>
  );
}

interface AppHeaderProps {
  logoSrc: string;
  landingCategories?: LandingCategory[];
}

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
      <span
        className={`absolute bottom-2 left-1 right-1 h-0.5 bg-mehndi transition-transform duration-300 ease-out origin-left ${
          isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
        }`}
        aria-hidden
      />
    </a>
  );
}

export default function AppHeader({ logoSrc, landingCategories = [] }: AppHeaderProps) {
  const [pathname, setPathname] = useState('');
  const [search, setSearch] = useState('');
  const navLinks = buildNavLinks(landingCategories);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const desktopSearchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback((q: string) => {
    const term = q.trim();
    if (!term) {
      setSearchResults([]);
      setSearchOpen(!!term);
      return;
    }
    setSearchLoading(true);
    setSearchOpen(true);
    const baseUrl = getApiBaseUrl().replace(/\/$/, '');
    api
      .getList<Record<string, unknown>>('/products', { search: term, limit: SEARCH_LIMIT })
      .then((res) => {
        if (!res.success || !Array.isArray(res.data)) {
          setSearchResults([]);
          return;
        }
        const list = res.data.map((p) => {
          const img = p.image as string;
          return {
            id: String(p.id),
            slug: String(p.slug),
            name: String(p.name),
            price: Number(p.price),
            currency: String(p.currency ?? 'PKR'),
            image: img ? (img.startsWith('http') ? img : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`) : '',
          };
        });
        setSearchResults(list);
      })
      .catch(() => setSearchResults([]))
      .finally(() => setSearchLoading(false));
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    searchDebounceRef.current = setTimeout(() => runSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, runSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      const inDesktop = desktopSearchRef.current?.contains(t);
      const inMobile = mobileSearchRef.current?.contains(t);
      if (!inDesktop && !inMobile) setSearchOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

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

  const closeSearch = () => setSearchOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-bone dark:bg-charcoal border-b border-ash/20 transition-colors duration-400">
      <nav className="w-full" aria-label="Main">
        <div className="grid grid-cols-[1fr_auto] sm:grid-cols-3 items-center gap-2 sm:gap-4 h-14 sm:h-16 min-h-[3.5rem]">
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
          <div
            ref={desktopSearchRef}
            className="hidden sm:flex col-start-2 justify-center min-w-0 px-2 relative w-full max-w-md mx-auto"
          >
            <label htmlFor="nav-search" className="sr-only">Search products</label>
            <div className="relative w-full max-w-md min-w-0">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-soft-charcoal dark:text-off-white" aria-hidden>
                <svg className="h-4 w-4 sm:h-[0.9375rem] sm:w-[0.9375rem]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </span>
              <input
                id="nav-search"
                type="search"
                autoComplete="off"
                placeholder="Search Product"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    runSearch(searchQuery);
                  }
                }}
                onFocus={() => searchQuery.trim() && setSearchOpen(true)}
                className="w-full max-w-md min-w-0 pl-9 sm:pl-10 pr-3 sm:px-4 py-2 rounded-lg border border-ash/30 bg-bone dark:bg-charcoal-light text-soft-charcoal dark:text-off-white placeholder:text-ash focus:outline-none focus:ring-2 focus:ring-mehndi/50 text-sm"
              />
              {searchOpen && searchQuery.trim() !== '' && (
                <div
                  className="absolute left-0 right-0 top-full mt-1 py-2 rounded-lg border border-ash/30 bg-bone dark:bg-charcoal-light shadow-lg z-[60] max-h-[min(70vh,320px)] overflow-y-auto"
                  role="listbox"
                  aria-label="Search results"
                >
                  <NavSearchResults
                    searchLoading={searchLoading}
                    searchResults={searchResults}
                    searchQuery={searchQuery}
                    onPickResult={closeSearch}
                  />
                </div>
              )}
            </div>
          </div>
          <ul className="flex items-center gap-2 sm:gap-4 justify-self-end col-start-2 sm:col-start-3">
            <li className="flex items-center"><ThemeToggle /></li>
            <li><CartIcon /></li>
            <ProfileMenu />
          </ul>
        </div>
        <div
          ref={mobileSearchRef}
          className="sm:hidden border-t border-ash/10 pb-3 pt-2.5 w-full relative z-[55]"
        >
          <label htmlFor="nav-search-mobile" className="sr-only">Search products</label>
          <div className="relative w-full min-w-0">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-soft-charcoal dark:text-off-white" aria-hidden>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </span>
            <input
              id="nav-search-mobile"
              type="search"
              autoComplete="off"
              placeholder="Search Product"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  runSearch(searchQuery);
                }
              }}
              onFocus={() => searchQuery.trim() && setSearchOpen(true)}
              className="w-full min-w-0 pl-9 pr-3 py-2 rounded-lg border border-ash/30 bg-bone dark:bg-charcoal-light text-soft-charcoal dark:text-off-white placeholder:text-ash focus:outline-none focus:ring-2 focus:ring-mehndi/50 text-sm"
            />
            {searchOpen && searchQuery.trim() !== '' && (
              <div
                className="absolute left-0 right-0 top-full mt-1 py-2 rounded-lg border border-ash/30 bg-bone dark:bg-charcoal-light shadow-lg z-[60] max-h-[min(50vh,280px)] overflow-y-auto"
                role="listbox"
                aria-label="Search results"
              >
                <NavSearchResults
                  searchLoading={searchLoading}
                  searchResults={searchResults}
                  searchQuery={searchQuery}
                  onPickResult={closeSearch}
                />
              </div>
            )}
          </div>
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
