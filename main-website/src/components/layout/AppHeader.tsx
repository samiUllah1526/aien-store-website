/**
 * AppHeader — AIEN editorial top navigation.
 *
 * Layout: logo (left) · serif nav links (center, hidden on mobile) ·
 *         search button + theme toggle + cart + profile (right).
 * The search expands into a full-width drawer using the existing /products
 * search API. All other interactive widgets reuse the existing stores.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { brandName } from '../../config';
import { getApiBaseUrl, api } from '../../lib/api';
import CartIcon from '../cart/CartIcon';
// import ThemeToggle from '../ThemeToggle'; // temporarily hidden in header
import ProfileMenu from './ProfileMenu';
import ProductPrice from '../ProductPrice';
import { buildImageUrl, IMAGE_PRESETS } from '../../lib/buildImageUrl';
import { resolveStorePrice } from '../../lib/resolveStorePrice';
import { IconClose, IconMenu, IconSearch } from '../icons';

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
  compareAtPrice?: number | null;
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
      className={`relative whitespace-nowrap font-serif tracking-tight text-xs lg:text-sm uppercase pb-1 transition-opacity duration-300 hover:opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 ${
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

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileNavOpen]);

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
          const resolved = resolveStorePrice({
            price: Number(p.price),
            salePrice: p.salePrice != null ? Number(p.salePrice) : null,
            originalPrice: p.originalPrice != null ? Number(p.originalPrice) : null,
            compareAtPrice: p.compareAtPrice != null ? Number(p.compareAtPrice) : null,
            saleBadgeText: typeof p.saleBadgeText === 'string' ? p.saleBadgeText : null,
            onSale: Boolean(p.onSale),
          });
          return {
            id: String(p.id),
            slug: String(p.slug),
            name: String(p.name),
            price: resolved.price,
            currency: String(p.currency ?? 'PKR'),
            compareAtPrice: resolved.compareAtPrice,
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
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-outline-variant/60 pt-safe">
      <nav aria-label="Main" className="max-w-site mx-auto px-4 sm:px-6 md:px-10 lg:px-16 h-16 sm:h-20 flex items-center justify-between gap-6">
        {/* Mobile menu trigger + logo */}
        <div className="flex items-center gap-4 md:gap-12">
          <button
            type="button"
            onClick={() => setMobileNavOpen((o) => !o)}
            className="md:hidden touch-target -ml-2 text-on-background hover:opacity-70 focus-ring rounded"
            aria-label="Toggle navigation"
            aria-expanded={mobileNavOpen}
          >
            {mobileNavOpen ? <IconClose /> : <IconMenu />}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center font-sans font-bold text-xl sm:text-2xl tracking-[0.2em] text-on-background transition-opacity hover:opacity-80 focus-ring rounded-full"
            aria-label={`${brandName} home`}
          >
            {logoSrc ? (
              <span className="block h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full border border-outline-variant/40 bg-surface-container overflow-hidden">
                <img
                  src={logoSrc}
                  alt={brandName}
                  className="h-full w-full object-cover object-center"
                  decoding="async"
                />
              </span>
            ) : (
              brandName.toUpperCase()
            )}
          </a>
          <ul className="hidden md:flex items-center flex-nowrap gap-4 lg:gap-8 shrink min-w-0">
            {navLinks.map((link) => (
              <li key={link.href} className="shrink-0">
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
              className="touch-target text-on-background hover:opacity-70 transition-opacity focus-ring rounded"
              aria-label="Search"
            >
              <IconSearch />
            </button>
          </li>
          {/* <li className="hidden sm:flex items-center"><ThemeToggle /></li> */}
          <li><CartIcon /></li>
          <ProfileMenu />
        </ul>
      </nav>

      {/*
        Portal out of the sticky/backdrop-blur header. `backdrop-filter` makes
        the header a containing block for `position: fixed`, which clipped this
        drawer to the header height so links were invisible.
      */}
      {mobileNavOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="md:hidden fixed inset-0 z-[200] flex flex-col bg-background pt-safe"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between h-16 px-4 border-b border-outline-variant/60">
              <span className="font-sans text-label-caps uppercase text-on-surface-variant">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="touch-target text-on-background focus-ring rounded"
                aria-label="Close navigation"
              >
                <IconClose />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-4 py-6 pb-safe" aria-label="Mobile">
              <ul className="flex flex-col">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className={`flex items-center min-h-touch px-2 font-serif text-lg tracking-tight uppercase transition-opacity hover:opacity-70 ${
                        link.match(pathname)
                          ? 'text-on-background'
                          : 'text-on-surface-variant'
                      }`}
                      onClick={() => setMobileNavOpen(false)}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>,
          document.body,
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
                <IconSearch className="w-6 h-6 shrink-0 text-on-surface-variant" />
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
                  className="touch-target text-on-surface-variant hover:text-on-background"
                  aria-label="Close search"
                >
                  <IconClose />
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
                            <span className="block mt-1">
                              <ProductPrice
                                amountCents={product.price}
                                currency={product.currency}
                                compareAtCents={product.compareAtPrice}
                                size="compact"
                                layout="inline"
                              />
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
