/**
 * AppHeader — AIEN editorial top navigation.
 *
 * Layout: logo (left) · serif nav links (center, hidden on mobile) ·
 *         search button + theme toggle + cart + profile (right).
 * The search expands into a full-width drawer using the existing /products
 * search API. All other interactive widgets reuse the existing stores.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { brandName } from '../../config';
import { getApiBaseUrl, api } from '../../lib/api';
import { formatMoney } from '../../lib/formatMoney';
import CartIcon from '../cart/CartIcon';
import ThemeToggle from '../ThemeToggle';
import ProfileMenu from './ProfileMenu';
import { buildImageUrl, IMAGE_PRESETS } from '../../lib/buildImageUrl';

interface LandingCategory {
  id: string;
  name: string;
  slug: string;
}

type NavLinkItem = {
  href: string;
  label: string;
  match: (path: string) => boolean;
};

function buildNavLinks(categories: LandingCategory[]): NavLinkItem[] {
  return [
    {
      href: '/shop',
      label: 'COLLECTIONS',
      match: (path) => path === '/shop' || path.startsWith('/shop/category'),
    },
    ...categories.slice(0, 2).map((cat) => ({
      href: `/shop/category/${encodeURIComponent(cat.slug)}`,
      label: cat.name.toUpperCase(),
      match: (path: string) => path === `/shop/category/${cat.slug}`,
    })),
    {
      href: '/about',
      label: 'ABOUT',
      match: (path) => path === '/about',
    },
  ];
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

interface AppHeaderProps {
  logoSrc: string;
  landingCategories?: LandingCategory[];
}

function NavLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <a
      href={href}
      className={`relative font-serif tracking-tight text-sm uppercase pb-1 transition-opacity duration-300 hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 ${
        isActive
          ? 'text-on-background border-b border-on-background'
          : 'text-on-surface-variant hover:text-on-background'
      }`}
    >
      {label}
    </a>
  );
}

export default function AppHeader({ logoSrc, landingCategories = [] }: AppHeaderProps) {
  const [pathname, setPathname] = useState('');
  const navLinks = buildNavLinks(landingCategories);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const runSearch = useCallback((q: string) => {
    const term = q.trim();
    if (!term) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
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
            image: img
              ? img.startsWith('http')
                ? img
                : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`
              : '',
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
      return;
    }
    searchDebounceRef.current = setTimeout(() => runSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, runSearch]);

  useEffect(() => {
    setPathname(window.location.pathname);
    const onPop = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const t = setTimeout(() => searchInputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [searchOpen]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-outline-variant/60">
      <nav aria-label="Main" className="max-w-site mx-auto px-4 sm:px-6 md:px-10 lg:px-16 h-16 sm:h-20 flex items-center justify-between gap-6">
        {/* Mobile menu trigger + logo */}
        <div className="flex items-center gap-4 md:gap-12">
          <button
            type="button"
            onClick={() => setMobileNavOpen((o) => !o)}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 -ml-2 text-on-background hover:opacity-70 focus-ring rounded"
            aria-label="Toggle navigation"
            aria-expanded={mobileNavOpen}
          >
            <span className="material-symbols-outlined" aria-hidden>
              {mobileNavOpen ? 'close' : 'menu'}
            </span>
          </button>
          <a
            href="/"
            className="font-sans font-bold text-xl sm:text-2xl tracking-[0.2em] text-on-background transition-opacity hover:opacity-80 focus-ring rounded"
            aria-label={`${brandName} home`}
          >
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={brandName}
                className="h-7 sm:h-8 w-auto max-w-[140px] sm:max-w-[180px] max-h-10 object-contain"
                decoding="async"
              />
            ) : (
              brandName.toUpperCase()
            )}
          </a>
          <ul className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.href}>
                <NavLink href={link.href} label={link.label} isActive={link.match(pathname)} />
              </li>
            ))}
          </ul>
        </div>

        {/* Action cluster */}
        <ul className="flex items-center gap-2 sm:gap-4">
          <li>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center justify-center w-10 h-10 text-on-background hover:opacity-70 transition-opacity focus-ring rounded"
              aria-label="Search"
            >
              <span className="material-symbols-outlined" aria-hidden>search</span>
            </button>
          </li>
          <li className="hidden sm:flex items-center"><ThemeToggle /></li>
          <li><CartIcon /></li>
          <ProfileMenu />
        </ul>
      </nav>

      {/* Mobile dropdown nav */}
      {mobileNavOpen && (
        <div className="md:hidden border-t border-outline-variant/60 bg-background">
          <ul className="px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="font-serif tracking-tight text-sm uppercase text-on-background hover:opacity-70"
                  onClick={() => setMobileNavOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Search overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[60] bg-on-background/40 backdrop-blur-sm"
          aria-hidden
          onClick={closeSearch}
        >
          <div
            className="bg-background border-b border-outline-variant/60 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Search products"
          >
            <div className="max-w-site mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-6 sm:py-8">
              <div className="flex items-center gap-4 border-b border-outline pb-2 focus-within:border-primary transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant" aria-hidden>search</span>
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      runSearch(searchQuery);
                    }
                  }}
                  placeholder="Search the collection"
                  className="flex-1 bg-transparent border-0 outline-none focus:ring-0 font-serif text-2xl sm:text-3xl text-on-background placeholder:text-on-surface-variant py-2"
                />
                <button
                  type="button"
                  onClick={closeSearch}
                  className="inline-flex items-center justify-center w-10 h-10 text-on-surface-variant hover:text-on-background"
                  aria-label="Close search"
                >
                  <span className="material-symbols-outlined" aria-hidden>close</span>
                </button>
              </div>
              <div className="mt-6 min-h-[140px]">
                {searchLoading ? (
                  <p className="eyebrow">Searching…</p>
                ) : searchQuery.trim() === '' ? (
                  <p className="eyebrow">Start typing to discover pieces.</p>
                ) : searchResults.length === 0 ? (
                  <p className="eyebrow">No products match “{searchQuery}”.</p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {searchResults.map((product) => (
                      <li key={product.id}>
                        <a
                          href={`/shop/${product.slug}`}
                          className="flex gap-4 items-center group"
                          onClick={closeSearch}
                        >
                          <span className="flex-shrink-0 w-20 h-24 bg-surface-container overflow-hidden">
                            {product.image ? (
                              <img
                                src={buildImageUrl(product.image, IMAGE_PRESETS.cartPreview)}
                                alt=""
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            ) : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-body-md text-on-surface group-hover:text-secondary transition-colors">
                              {product.name}
                            </span>
                            <span className="block text-label-caps text-on-surface-variant mt-1">
                              {formatMoney(product.price, product.currency)}
                            </span>
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
