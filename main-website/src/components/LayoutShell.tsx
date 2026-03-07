/**
 * App shell: announcement bar, Nav (logo, search, wishlist, cart, links), main slot, Footer, CartSidebar.
 * Landing layout per e‑commerce reference.
 */

import type { ReactNode } from 'react';
import { brandName, announcementText, footerContact } from '../config';
import { getApiBaseUrl } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import CartIcon from './cart/CartIcon';
import CartSidebar from './cart/CartSidebar';
import SmoothScroll from './SmoothScroll';
import ThemeToggle from './ThemeToggle';
import Toast from './Toast';

export interface SiteSettings {
  logoPath: string | null;
  about?: { title?: string; subtitle?: string; content?: string };
  footer?: {
    tagline?: string;
    copyright?: string;
    email?: string;
    phone?: string;
    hours?: string;
  };
  social?: {
    facebook?: string;
    facebookVisible?: boolean;
    instagram?: string;
    instagramVisible?: boolean;
    twitter?: string;
    twitterVisible?: boolean;
    youtube?: string;
    youtubeVisible?: boolean;
  };
}

function logoUrl(logoPath: string | null): string {
  if (!logoPath) return '';
  const base = getApiBaseUrl().replace(/\/$/, '');
  return logoPath.startsWith('http') ? logoPath : `${base}/media/file/${logoPath}`;
}

function ShellContent({
  children,
  siteSettings,
}: {
  children: ReactNode;
  siteSettings: SiteSettings | null | undefined;
}) {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn());
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const copyrightText =
    siteSettings?.footer?.copyright ?? `© ${new Date().getFullYear()} ${brandName}`;
  const logoSrc = siteSettings?.logoPath ? logoUrl(siteSettings.logoPath) : '';
  const social = siteSettings?.social ?? {};
  const email = siteSettings?.footer?.email ?? footerContact.email;
  const phone = siteSettings?.footer?.phone ?? footerContact.phone;
  const hours = siteSettings?.footer?.hours ?? footerContact.hours;

  return (
    <>
      {/* Announcement bar — responsive text, wraps on narrow screens */}
      <div className="bg-charcoal text-off-white text-center py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium">
        {announcementText}
      </div>
      <header className="sticky top-0 z-50 bg-bone dark:bg-charcoal border-b border-ash/20 transition-colors duration-400">
        <nav className="max-w-6xl mx-auto px-3 sm:px-6" aria-label="Main">
          {/* Row 1: logo, search, icons */}
          <div className="flex items-center justify-between gap-2 sm:gap-4 h-14 sm:h-16 min-h-[3.5rem]">
            <a
              href="/"
              className="font-display text-lg sm:text-xl text-soft-charcoal dark:text-off-white hover:text-ash transition-colors duration-300 focus-ring rounded shrink-0 min-w-0"
              aria-label={`${brandName} home`}
            >
              {logoSrc ? (
                <img src={logoSrc} alt={brandName} className="h-7 sm:h-8 w-auto object-contain max-h-10" />
              ) : (
                <span className="text-xl sm:text-2xl" aria-hidden>ع</span>
              )}
            </a>
            <form action="/shop" method="get" className="flex-1 max-w-md mx-2 sm:mx-4 hidden sm:block min-w-0">
              <label htmlFor="nav-search" className="sr-only">Search</label>
              <input
                id="nav-search"
                type="search"
                name="q"
                placeholder="Search Product"
                className="w-full min-w-0 px-3 sm:px-4 py-2 rounded-lg border border-ash/30 bg-bone dark:bg-charcoal-light text-soft-charcoal dark:text-off-white placeholder:text-ash focus:outline-none focus:ring-2 focus:ring-mehndi/50 text-sm"
              />
            </form>
            <ul className="flex items-center gap-1 sm:gap-4 shrink-0">
              {isLoggedIn && (
                <li>
                  <a
                    href="/account/favorites"
                    className="p-2.5 min-w-[2.75rem] min-h-[2.75rem] flex items-center justify-center text-soft-charcoal dark:text-off-white hover:text-mehndi transition-colors rounded focus-ring"
                    aria-label="Wishlist"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </a>
                </li>
              )}
              <li><CartIcon /></li>
              <li className="flex items-center gap-1">
                <ThemeToggle />
              </li>
              {isLoggedIn ? (
                <>
                  <li>
                    <a href="/account/orders" className="text-xs sm:text-sm text-soft-charcoal/80 dark:text-off-white/80 hover:text-soft-charcoal dark:hover:text-off-white py-2 px-1.5 sm:px-2">My Orders</a>
                  </li>
                  <li>
                    <button type="button" onClick={() => { clearAuth(); window.location.href = '/'; }} className="text-xs sm:text-sm text-ash hover:text-soft-charcoal dark:hover:text-off-white py-2 px-1.5 sm:px-2">Log out</button>
                  </li>
                </>
              ) : (
                <li>
                  <a href="/login" className="text-xs sm:text-sm text-soft-charcoal/80 dark:text-off-white/80 hover:text-soft-charcoal dark:hover:text-off-white py-2 px-1.5 sm:px-2">Log in</a>
                </li>
              )}
            </ul>
          </div>
          {/* Row 2: main links — wrap on small screens, touch-friendly */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 md:gap-8 py-2.5 sm:py-3 border-t border-ash/10">
            <a href="/" className="text-xs sm:text-sm font-medium text-soft-charcoal dark:text-off-white hover:text-mehndi transition-colors py-2 px-1 min-h-[2.75rem] flex items-center">HOME</a>
            <a href="/shop?category=beggy-tees" className="text-xs sm:text-sm font-medium text-soft-charcoal dark:text-off-white hover:text-mehndi transition-colors py-2 px-1 min-h-[2.75rem] flex items-center">BEGGY T-SHIRTS</a>
            <a href="/shop?category=hoodies" className="text-xs sm:text-sm font-medium text-soft-charcoal dark:text-off-white hover:text-mehndi transition-colors py-2 px-1 min-h-[2.75rem] flex items-center">HOODIES</a>
            <a href="/about" className="text-xs sm:text-sm font-medium text-soft-charcoal dark:text-off-white hover:text-mehndi transition-colors py-2 px-1 min-h-[2.75rem] flex items-center">ABOUT</a>
          </div>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-charcoal text-off-white">
        {/* Main footer grid */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-14 md:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12 lg:gap-8">
            {/* Brand column */}
            <div className="sm:col-span-2 lg:col-span-1">
              <a href="/" className="font-display text-2xl text-off-white hover:text-off-white/90 transition-colors" aria-label={`${brandName} home`}>
                ع
              </a>
              <p className="mt-3 text-sm text-off-white/70 max-w-xs">
                The Art of Effortless Style. Cultural-art streetwear.
              </p>
            </div>
            {/* Shop links */}
            <div>
              <h3 className="font-display text-xs uppercase tracking-widest text-off-white/90 mb-4">Shop</h3>
              <ul className="space-y-3">
                <li><a href="/shop" className="text-sm text-off-white/70 hover:text-off-white transition-colors">All Products</a></li>
                <li><a href="/shop?category=beggy-tees" className="text-sm text-off-white/70 hover:text-off-white transition-colors">Beggy T-Shirts</a></li>
                <li><a href="/shop?category=hoodies" className="text-sm text-off-white/70 hover:text-off-white transition-colors">Hoodies</a></li>
                <li><a href="/cart" className="text-sm text-off-white/70 hover:text-off-white transition-colors">Cart</a></li>
              </ul>
            </div>
            {/* Customer Support */}
            <div>
              <h3 className="font-display text-xs uppercase tracking-widest text-off-white/90 mb-4">Support</h3>
              <ul className="space-y-3 text-sm text-off-white/70">
                <li>
                  <a href={`mailto:${email}`} className="hover:text-off-white transition-colors break-all">{email}</a>
                </li>
                <li>{phone}</li>
                <li>{hours}</li>
              </ul>
            </div>
          </div>
          {/* Social row */}
          <div className="mt-10 pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-6">
            <span className="font-display text-xs uppercase tracking-widest text-off-white/80">Connect</span>
            <div className="flex items-center gap-4">
              {social.facebook && (social.facebookVisible !== false) ? (
                <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-off-white hover:bg-white/20 transition-colors" aria-label="Facebook">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              ) : (
                <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-off-white/50" aria-hidden><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></span>
              )}
              {social.instagram && (social.instagramVisible !== false) ? (
                <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-off-white hover:bg-white/20 transition-colors" aria-label="Instagram">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.057-2.905.268-4.346 2.165-4.654 4.947-.045 1.281-.057 1.689-.057 4.947 0 3.259.012 3.668.057 4.947.308 2.782 1.749 4.739 4.654 4.947 1.28.043 1.689.057 4.947.057 3.259 0 3.668-.014 4.947-.057 2.905-.268 4.346-2.165 4.654-4.947.045-1.281.057-1.689.057-4.947 0-3.259-.012-3.667-.057-4.947-.308-2.782-1.749-4.739-4.654-4.947-1.28-.043-1.689-.057-4.947-.057zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                </a>
              ) : (
                <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-off-white/50" aria-hidden><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.057-2.905.268-4.346 2.165-4.654 4.947-.045 1.281-.057 1.689-.057 4.947 0 3.259.012 3.668.057 4.947.308 2.782 1.749 4.739 4.654 4.947 1.28.043 1.689.057 4.947.057 3.259 0 3.668-.014 4.947-.057 2.905-.268 4.346-2.165 4.654-4.947.045-1.281.057-1.689.057-4.947 0-3.259-.012-3.667-.057-4.947-.308-2.782-1.749-4.739-4.654-4.947-1.28-.043-1.689-.057-4.947-.057zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></span>
              )}
              {social.twitter && (social.twitterVisible !== false) ? (
                <a href={social.twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-off-white hover:bg-white/20 transition-colors" aria-label="Twitter">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              ) : (
                <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-off-white/50" aria-hidden><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></span>
              )}
              {social.youtube && (social.youtubeVisible !== false) ? (
                <a href={social.youtube} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-off-white hover:bg-white/20 transition-colors" aria-label="YouTube">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
              ) : (
                <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-off-white/50" aria-hidden><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></span>
              )}
            </div>
          </div>
        </div>
        {/* Bottom bar */}
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-off-white/60 text-center sm:text-left">
              {copyrightText}
            </p>
            <nav className="flex items-center gap-6 text-xs text-off-white/60" aria-label="Footer legal">
              <a href="/about" className="hover:text-off-white/80 transition-colors">About</a>
              <a href="/shop" className="hover:text-off-white/80 transition-colors">Shop</a>
            </nav>
          </div>
        </div>
      </footer>
      <CartSidebar />
      <Toast />
      <SmoothScroll />
    </>
  );
}

export default function LayoutShell({
  children,
  siteSettings,
}: {
  children: ReactNode;
  siteSettings?: SiteSettings | null;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <ShellContent siteSettings={siteSettings}>{children}</ShellContent>
    </div>
  );
}
