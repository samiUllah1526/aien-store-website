/**
 * AppFooter — AIEN editorial four-column footer.
 * Columns: brand mark + tagline · COLLECTIONS · CLIENT SERVICES · NEWSLETTER + LEGAL.
 * Receives content via props from `LayoutShell`, which sources data from
 * the public settings API at build time.
 */

import { brandName } from '../../config';
import { SITE_CONTAINER_CLASS } from './SiteContainer';

export interface AppFooterSocial {
  facebook?: string;
  facebookVisible?: boolean;
  instagram?: string;
  instagramVisible?: boolean;
  twitter?: string;
  twitterVisible?: boolean;
  youtube?: string;
  youtubeVisible?: boolean;
}

interface AppFooterProps {
  /** Public logo URL (same as header) when settings provide a logo */
  logoSrc: string;
  copyrightText: string;
  tagline?: string;
  email: string;
  phone: string;
  hours: string;
  social: AppFooterSocial;
}

const FOOTER_LINK =
  'font-serif text-xs tracking-widest uppercase text-on-surface-variant hover:text-on-background underline-offset-4 hover:underline transition-all duration-500 ease-in-out';

const SOCIAL_BTN =
  'w-9 h-9 inline-flex items-center justify-center border border-outline-variant text-on-surface-variant hover:border-primary hover:text-on-background transition-colors duration-300';

export default function AppFooter({
  logoSrc,
  copyrightText,
  tagline,
  email,
  phone,
  hours,
  social,
}: AppFooterProps) {
  const showSocial = [
    social.facebook && social.facebookVisible,
    social.instagram && social.instagramVisible,
    social.twitter && social.twitterVisible,
    social.youtube && social.youtubeVisible,
  ].some(Boolean);

  return (
    <footer className="bg-surface-container-low border-t border-outline-variant w-full mt-section-gap">
      <div className={`${SITE_CONTAINER_CLASS} py-20 md:py-24`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1 flex flex-col items-start gap-6 text-left">
            <a
              href="/"
              className="inline-flex items-center justify-start font-sans font-bold text-xl tracking-tighter text-on-background focus-ring rounded-full"
              aria-label={`${brandName} home`}
            >
              {logoSrc ? (
                <span className="block h-10 w-10 sm:h-11 sm:w-11 rounded-full border border-outline-variant/40 bg-surface-container overflow-hidden">
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
            <p className="font-body-md text-xs text-on-surface-variant max-w-xs leading-relaxed">
              {tagline ||
                'Defining modern aesthetics through structural precision and refined materials.'}
            </p>
            {showSocial && (
              <div className="flex items-center gap-3 pt-2">
                {social.facebook && social.facebookVisible && (
                  <a
                    href={social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={SOCIAL_BTN}
                    aria-label="Facebook"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </a>
                )}
                {social.instagram && social.instagramVisible && (
                  <a
                    href={social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={SOCIAL_BTN}
                    aria-label="Instagram"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.057-2.905.268-4.346 2.165-4.654 4.947-.045 1.281-.057 1.689-.057 4.947 0 3.259.012 3.668.057 4.947.308 2.782 1.749 4.739 4.654 4.947 1.28.043 1.689.057 4.947.057 3.259 0 3.668-.014 4.947-.057 2.905-.268 4.346-2.165 4.654-4.947.045-1.281.057-1.689.057-4.947 0-3.259-.012-3.667-.057-4.947-.308-2.782-1.749-4.739-4.654-4.947-1.28-.043-1.689-.057-4.947-.057zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </a>
                )}
                {social.twitter && social.twitterVisible && (
                  <a
                    href={social.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={SOCIAL_BTN}
                    aria-label="Twitter"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                )}
                {social.youtube && social.youtubeVisible && (
                  <a
                    href={social.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={SOCIAL_BTN}
                    aria-label="YouTube"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Collections */}
          <div className="flex flex-col gap-4">
            <h4 className="font-sans text-label-caps uppercase text-on-background">Collections</h4>
            <a href="/shop" className={FOOTER_LINK}>All Collections</a>
            <a href="/shop?sort=new" className={FOOTER_LINK}>New Arrivals</a>
            <a href="/cart" className={FOOTER_LINK}>Bag</a>
            <a href="/about" className={FOOTER_LINK}>About</a>
          </div>

          {/* Client Services */}
          <div className="flex flex-col gap-4">
            <h4 className="font-sans text-label-caps uppercase text-on-background">
              Client Services
            </h4>
            {email && (
              <a href={`mailto:${email}`} className={`${FOOTER_LINK} break-all`}>
                {email}
              </a>
            )}
            {phone && <span className={FOOTER_LINK}>{phone}</span>}
            {hours && <span className={FOOTER_LINK}>{hours}</span>}
            <a href="/account/orders" className={FOOTER_LINK}>Orders</a>
          </div>

          {/* Newsletter + Legal */}
          <div className="flex flex-col gap-6">
            <h4 className="font-sans text-label-caps uppercase text-on-background">Newsletter</h4>
            <form
              className="relative filter-border pb-2"
              onSubmit={(e) => e.preventDefault()}
              aria-label="Newsletter signup"
            >
              <input
                type="email"
                placeholder="EMAIL ADDRESS"
                aria-label="Email address"
                className="w-full bg-transparent border-0 p-0 font-sans text-label-caps text-on-background placeholder:text-on-surface-variant focus:ring-0 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-0 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-background transition-colors"
                aria-label="Subscribe"
              >
                <span className="material-symbols-outlined" aria-hidden>arrow_forward</span>
              </button>
            </form>

            <div className="flex flex-col gap-3 mt-2">
              <a href="/privacy" className={FOOTER_LINK}>Privacy Policy</a>
              <a href="/terms" className={FOOTER_LINK}>Terms of Service</a>
              <a href="/shipping" className={FOOTER_LINK}>Shipping &amp; Returns</a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-outline-variant">
        <div
          className={`${SITE_CONTAINER_CLASS} py-6 flex flex-col sm:flex-row items-center justify-between gap-3`}
        >
          <p className="font-sans text-label-caps text-on-surface-variant">
            {copyrightText || `© ${new Date().getFullYear()} ${brandName.toUpperCase()}. ALL RIGHTS RESERVED.`}
          </p>
          <p className="font-sans text-label-caps text-on-surface-variant">
            CRAFTED WITH INTENT
          </p>
        </div>
      </div>
    </footer>
  );
}
