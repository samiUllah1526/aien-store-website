/**
 * Single React root for the app shell: Nav, main slot, Footer, CartSidebar.
 * Cart state is global (zustand store) so all islands share it.
 * Astro passes page content as children (the main slot).
 * siteSettings: from GET /settings/public (logo, footer, social).
 */

import type { ReactNode } from 'react';
import { getApiBaseUrl } from '../lib/api';
import CartIcon from './cart/CartIcon';
import CartSidebar from './cart/CartSidebar';
import ThemeToggle from './ThemeToggle';
import Toast from './Toast';

export interface SiteSettings {
  logoPath: string | null;
  about?: { title?: string; subtitle?: string; content?: string };
  footer?: { tagline?: string; copyright?: string };
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

const DEFAULT_TAGLINE = 'Wear the words. Urdu poetry & adab on streetwear.';
const DEFAULT_BRAND = 'Adab';

function ShellContent({
  children,
  siteSettings,
}: {
  children: ReactNode;
  siteSettings: SiteSettings | null | undefined;
}) {
  const brand = DEFAULT_BRAND;
  const tagline = siteSettings?.footer?.tagline ?? DEFAULT_TAGLINE;
  const copyrightText =
    siteSettings?.footer?.copyright ?? `© ${new Date().getFullYear()} Adab. All rights reserved.`;
  const logoSrc = siteSettings?.logoPath ? logoUrl(siteSettings.logoPath) : '';
  const social = siteSettings?.social ?? {};

  return (
    <>
      <header className="sticky top-0 z-50 bg-cream/95 dark:bg-ink/95 backdrop-blur border-b border-sand/60 dark:border-charcoal-light/50 transition-colors duration-300">
        <nav
          className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 md:h-18"
          aria-label="Main"
        >
          <a
            href="/"
            className="font-display text-xl md:text-2xl text-ink dark:text-cream hover:text-emerald transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:ring-offset-2 focus:ring-offset-cream dark:focus:ring-offset-ink rounded flex items-center gap-2"
          >
            {logoSrc ? (
              <img src={logoSrc} alt={brand} className="h-8 md:h-9 w-auto object-contain" />
            ) : (
              brand
            )}
          </a>
          <ul className="flex items-center gap-4 md:gap-6">
            <li>
              <a
                href="/"
                className="text-charcoal dark:text-cream/90 hover:text-emerald transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:ring-offset-2 dark:focus:ring-offset-ink rounded py-2"
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="/shop"
                className="text-charcoal dark:text-cream/90 hover:text-emerald transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:ring-offset-2 dark:focus:ring-offset-ink rounded py-2"
              >
                Shop
              </a>
            </li>
            <li>
              <a
                href="/about"
                className="text-charcoal dark:text-cream/90 hover:text-emerald transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:ring-offset-2 dark:focus:ring-offset-ink rounded py-2"
              >
                About
              </a>
            </li>
            <li className="flex items-center gap-1">
              <ThemeToggle />
              <CartIcon />
            </li>
          </ul>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="bg-charcoal dark:bg-charcoal-dark text-cream mt-auto transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
            <div>
              <span className="font-display text-2xl text-cream">{brand}</span>
              <p className="mt-3 text-sand/90 dark:text-cream/70 text-sm max-w-xs">
                {tagline}
              </p>
              {(() => {
                const show = (url: string | undefined, visible: boolean | undefined) =>
                  url && (visible !== false);
                const hasAny =
                  show(social.facebook, social.facebookVisible) ||
                  show(social.instagram, social.instagramVisible) ||
                  show(social.twitter, social.twitterVisible) ||
                  show(social.youtube, social.youtubeVisible);
                if (!hasAny) return null;
                const iconClass = 'h-5 w-5 shrink-0';
                return (
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    {show(social.facebook, social.facebookVisible) && (
                      <a
                        href={social.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sand/80 hover:text-gold transition-colors"
                        aria-label="Facebook"
                      >
                        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span>Facebook</span>
                      </a>
                    )}
                    {show(social.instagram, social.instagramVisible) && (
                      <a
                        href={social.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sand/80 hover:text-gold transition-colors"
                        aria-label="Instagram"
                      >
                        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                        </svg>
                        <span>Instagram</span>
                      </a>
                    )}
                    {show(social.twitter, social.twitterVisible) && (
                      <a
                        href={social.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sand/80 hover:text-gold transition-colors"
                        aria-label="Twitter"
                      >
                        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                        </svg>
                        <span>Twitter</span>
                      </a>
                    )}
                    {show(social.youtube, social.youtubeVisible) && (
                      <a
                        href={social.youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sand/80 hover:text-gold transition-colors"
                        aria-label="YouTube"
                      >
                        <svg className={iconClass} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        <span>YouTube</span>
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>
            <div>
              <h3 className="font-display text-cream text-sm uppercase tracking-wider mb-3">
                Shop
              </h3>
              <ul className="space-y-2 text-sand/90 dark:text-cream/70 text-sm">
                <li>
                  <a href="/shop?category=shirts" className="hover:text-gold transition-colors">
                    Shirts
                  </a>
                </li>
                <li>
                  <a href="/shop?category=hoodies" className="hover:text-gold transition-colors">
                    Hoodies
                  </a>
                </li>
                <li>
                  <a href="/shop" className="hover:text-gold transition-colors">
                    All
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-display text-cream text-sm uppercase tracking-wider mb-3">
                Brand
              </h3>
              <ul className="space-y-2 text-sand/90 dark:text-cream/70 text-sm">
                <li>
                  <a href="/about" className="hover:text-gold transition-colors">
                    Our Story
                  </a>
                </li>
                <li>
                  <a href="/cart" className="hover:text-gold transition-colors">
                    Cart
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-charcoal-light text-sand/70 dark:text-cream/60 text-sm text-center">
            {copyrightText}
          </div>
        </div>
      </footer>
      <CartSidebar />
      <Toast />
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
