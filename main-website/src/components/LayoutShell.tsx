/**
 * App shell: minimal Nav, main slot, Footer, CartSidebar.
 * Aien: quiet, editorial, culture-first.
 */

import type { ReactNode } from 'react';
import { brandName } from '../config';
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

  return (
    <>
      <header className="sticky top-0 z-50 bg-bone/95 dark:bg-charcoal/95 backdrop-blur border-b border-ash/20 transition-colors duration-400">
        <nav
          className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16"
          aria-label="Main"
        >
          <a
            href="/"
            className="font-display text-lg text-soft-charcoal dark:text-off-white hover:text-ash transition-colors duration-300 focus-ring rounded"
          >
            {logoSrc ? (
              <img src={logoSrc} alt={brandName} className="h-7 w-auto object-contain" />
            ) : (
              brandName
            )}
          </a>
          <ul className="flex items-center gap-6">
            <li>
              <a
                href="/shop"
                className="text-sm text-soft-charcoal/80 dark:text-off-white/80 hover:text-soft-charcoal dark:hover:text-off-white transition-colors duration-300 focus-ring rounded py-2"
              >
                Shop
              </a>
            </li>
            <li>
              <a
                href="/about"
                className="text-sm text-soft-charcoal/80 dark:text-off-white/80 hover:text-soft-charcoal dark:hover:text-off-white transition-colors duration-300 focus-ring rounded py-2"
              >
                About
              </a>
            </li>
            {isLoggedIn ? (
              <>
                <li>
                  <a
                    href="/account/favorites"
                    className="text-sm text-soft-charcoal/80 dark:text-off-white/80 hover:text-soft-charcoal dark:hover:text-off-white transition-colors focus-ring rounded py-2"
                    aria-label="Favorites"
                  >
                    Favorites
                  </a>
                </li>
                <li>
                  <a
                    href="/account/orders"
                    className="text-sm text-soft-charcoal/80 dark:text-off-white/80 hover:text-soft-charcoal dark:hover:text-off-white transition-colors focus-ring rounded py-2"
                  >
                    Orders
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      clearAuth();
                      window.location.href = '/';
                    }}
                    className="text-sm text-soft-charcoal/80 dark:text-off-white/80 hover:text-soft-charcoal dark:hover:text-off-white transition-colors focus-ring rounded py-2"
                  >
                    Log out
                  </button>
                </li>
              </>
            ) : (
              <>
                <li>
                  <a
                    href="/login"
                    className="text-sm text-soft-charcoal/80 dark:text-off-white/80 hover:text-soft-charcoal dark:hover:text-off-white transition-colors focus-ring rounded py-2"
                  >
                    Log in
                  </a>
                </li>
              </>
            )}
            <li className="flex items-center gap-1">
              <ThemeToggle />
              <CartIcon />
            </li>
          </ul>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-ash/20 py-12 md:py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <nav aria-label="Footer">
              <ul className="flex gap-8 text-sm">
                <li>
                  <a
                    href="/shop"
                    className="text-ash hover:text-soft-charcoal dark:hover:text-off-white transition-colors"
                  >
                    Shop
                  </a>
                </li>
                <li>
                  <a
                    href="/about"
                    className="text-ash hover:text-soft-charcoal dark:hover:text-off-white transition-colors"
                  >
                    About
                  </a>
                </li>
                {social.instagram && (social.instagramVisible !== false) && (
                  <li>
                    <a
                      href={social.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ash hover:text-soft-charcoal dark:hover:text-off-white transition-colors"
                      aria-label="Instagram"
                    >
                      Instagram
                    </a>
                  </li>
                )}
              </ul>
            </nav>
            <p className="urdu-text text-ash text-sm md:text-base">
              خاموشی میں واپس آؤ
            </p>
          </div>
          <p className="mt-8 text-ash/70 text-xs">
            {copyrightText}
          </p>
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
