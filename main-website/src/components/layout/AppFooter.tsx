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
  copyrightText: string;
  tagline?: string;
  email: string;
  phone: string;
  hours: string;
  social: AppFooterSocial;
}

const SOCIAL_ICON_BASE =
  'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ease-out hover:scale-110 hover:-translate-y-1';
const SOCIAL_HOVER = {
  facebook: 'bg-white/10 text-off-white hover:bg-[#1877F2] hover:text-white',
  instagram: 'bg-white/10 text-off-white hover:bg-[#E4405F] hover:text-white',
  twitter: 'bg-white/10 text-off-white hover:bg-[#1DA1F2] hover:text-white',
  youtube: 'bg-white/10 text-off-white hover:bg-[#FF0000] hover:text-white',
} as const;

export default function AppFooter({ copyrightText, tagline, email, phone, hours, social }: AppFooterProps) {
  const hasSupport = email || phone || hours;
  return (
    <footer className="bg-charcoal text-off-white w-full">
      <div className={`${SITE_CONTAINER_CLASS} py-12 sm:py-14 md:py-16`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 md:gap-12 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <a href="/" className="font-display text-2xl text-off-white hover:text-off-white/90 transition-colors" aria-label={`${brandName} home`}>
              ع
            </a>
            {tagline ? (
              <p className="mt-3 text-sm text-off-white/70 max-w-xs">{tagline}</p>
            ) : null}
          </div>
          <div>
            <h3 className="font-display font-bold text-xs uppercase tracking-widest text-off-white/90 mb-4">Shop</h3>
            <ul className="space-y-3">
              <li><a href="/shop" className="text-sm text-off-white/70 hover:text-off-white transition-colors">All Products</a></li>
              <li><a href="/shop/category/beggy-tees" className="text-sm text-off-white/70 hover:text-off-white transition-colors">Beggy T-Shirts</a></li>
              <li><a href="/shop/category/hoodies" className="text-sm text-off-white/70 hover:text-off-white transition-colors">Hoodies</a></li>
              <li><a href="/cart" className="text-sm text-off-white/70 hover:text-off-white transition-colors">Cart</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-display font-bold text-xs uppercase tracking-widest text-off-white/90 mb-4">Contact Us</h3>
            {hasSupport ? (
              <ul className="space-y-3 text-sm text-off-white/70">
                {email ? (
                  <li>
                    <a href={`mailto:${email}`} className="hover:text-off-white transition-colors break-all">{email}</a>
                  </li>
                ) : null}
                {phone ? <li>{phone}</li> : null}
                {hours ? <li>{hours}</li> : null}
              </ul>
            ) : null}
          </div>
        </div>
        <div className="mt-10 pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-6">
          {email ? (
            <a
              href={`mailto:${email}`}
              className="font-display text-xs uppercase tracking-widest text-off-white/80 hover:text-off-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-off-white/40 rounded-sm"
            >
              Connect
            </a>
          ) : (
            <span className="font-display text-xs uppercase tracking-widest text-off-white/80">Connect</span>
          )}
          <div className="flex items-center gap-4">
            {social.facebook && social.facebookVisible === true ? (
              <a href={social.facebook} target="_blank" rel="noopener noreferrer" className={`${SOCIAL_ICON_BASE} ${SOCIAL_HOVER.facebook}`} aria-label="Facebook">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
            ) : null}
            {social.instagram && social.instagramVisible === true ? (
              <a href={social.instagram} target="_blank" rel="noopener noreferrer" className={`${SOCIAL_ICON_BASE} ${SOCIAL_HOVER.instagram}`} aria-label="Instagram">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.057-2.905.268-4.346 2.165-4.654 4.947-.045 1.281-.057 1.689-.057 4.947 0 3.259.012 3.668.057 4.947.308 2.782 1.749 4.739 4.654 4.947 1.28.043 1.689.057 4.947.057 3.259 0 3.668-.014 4.947-.057 2.905-.268 4.346-2.165 4.654-4.947.045-1.281.057-1.689.057-4.947 0-3.259-.012-3.667-.057-4.947-.308-2.782-1.749-4.739-4.654-4.947-1.28-.043-1.689-.057-4.947-.057zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
            ) : null}
            {social.twitter && social.twitterVisible === true ? (
              <a href={social.twitter} target="_blank" rel="noopener noreferrer" className={`${SOCIAL_ICON_BASE} ${SOCIAL_HOVER.twitter}`} aria-label="Twitter">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
            ) : null}
            {social.youtube && social.youtubeVisible === true ? (
              <a href={social.youtube} target="_blank" rel="noopener noreferrer" className={`${SOCIAL_ICON_BASE} ${SOCIAL_HOVER.youtube}`} aria-label="YouTube">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            ) : null}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className={`${SITE_CONTAINER_CLASS} py-5 sm:py-6 flex flex-col sm:flex-row items-center justify-between gap-3`}>
          {copyrightText ? (
            <p className="text-xs text-off-white/60 text-center sm:text-left">
              {copyrightText}
            </p>
          ) : (
            <span className="flex-1" />
          )}
          <nav className="flex items-center gap-6 text-xs text-off-white/60" aria-label="Footer legal">
            <a href="/about" className="hover:text-off-white/80 transition-colors">About</a>
            <a href="/shop" className="hover:text-off-white/80 transition-colors">Shop</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
