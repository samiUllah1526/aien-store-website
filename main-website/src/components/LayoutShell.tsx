/**
 * Single React root for the app shell: Nav, main slot, Footer, CartSidebar.
 * Cart state is global (zustand store) so all islands share it.
 * Astro passes page content as children (the main slot).
 */

import type { ReactNode } from 'react';
import CartIcon from './cart/CartIcon';
import CartSidebar from './cart/CartSidebar';
import ThemeToggle from './ThemeToggle';
import Toast from './Toast';

function ShellContent({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 bg-cream/95 dark:bg-ink/95 backdrop-blur border-b border-sand/60 dark:border-charcoal-light/50 transition-colors duration-300">
        <nav
          className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 md:h-18"
          aria-label="Main"
        >
          <a
            href="/"
            className="font-display text-xl md:text-2xl text-ink dark:text-cream hover:text-emerald transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald/50 focus:ring-offset-2 focus:ring-offset-cream dark:focus:ring-offset-ink rounded"
          >
            Adab
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
              <span className="font-display text-2xl text-cream">Adab</span>
              <p className="mt-3 text-sand/90 dark:text-cream/70 text-sm max-w-xs">
                Wear the words. Urdu poetry & adab on streetwear.
              </p>
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
            © {new Date().getFullYear()} Adab. All rights reserved.
          </div>
        </div>
      </footer>
      <CartSidebar />
      <Toast />
    </>
  );
}

export default function LayoutShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <ShellContent>{children}</ShellContent>
    </div>
  );
}
