/**
 * Site configuration — single source of truth.
 * Set values via .env (see .env.example) or override defaults below.
 * Fails fast at build time if required variables are missing in production.
 */

const env = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env : undefined;

function envStr(key: string, fallback: string): string {
  const v = env?.[key];
  return (typeof v === 'string' ? v.trim() : '') || fallback;
}

function envRaw(key: string): string {
  const v = env?.[key];
  return (typeof v === 'string' ? v.trim() : '') || '';
}

// Fail fast in production build if required vars are missing
if (typeof import.meta !== 'undefined' && (import.meta as { env?: { PROD?: boolean } }).env?.PROD) {
  const apiUrl = envRaw('PUBLIC_API_URL');
  if (!apiUrl) {
    throw new Error(
      '[config] PUBLIC_API_URL is required in production. Set it in .env or your hosting environment (e.g. PUBLIC_API_URL=https://api.yoursite.com). See main-website/.env.example.',
    );
  }
}

/** Backend API base URL (no trailing slash) */
export const apiBaseUrl = envStr('PUBLIC_API_URL', 'http://localhost:3000').replace(/\/$/, '');

/** Store API base: all storefront requests use this (e.g. /store/auth, /store/products). */
export const storeApiBaseUrl = apiBaseUrl + '/store';

/** Hero video: YouTube, Vimeo, or direct mp4/webm URL */
export const heroVideoUrl = envStr('PUBLIC_HERO_VIDEO_URL', '/videos/hero.mp4');

/** Hero poster: image URL for mobile/reduced-motion (optional; auto for YouTube) */
export const heroVideoPoster = envStr('PUBLIC_HERO_VIDEO_POSTER', '');

/** Hero image carousel — minimal config. Replace with your image URLs. */
export type HeroSlide = { src: string; alt?: string };
export const heroSlides: HeroSlide[] = [
  { src: 'https://picsum.photos/seed/hero1/1920/1080', alt: 'Hero 1' },
  { src: 'https://picsum.photos/seed/hero2/1920/1080', alt: 'Hero 2' },
  { src: 'https://picsum.photos/seed/hero3/1920/1080', alt: 'Hero 3' },
];

/** Brand name */
export const brandName = envStr('PUBLIC_BRAND_NAME', 'Aien');

/** Default meta description */
export const defaultMetaDescription = envStr(
  'PUBLIC_META_DESCRIPTION',
  'Cultural-art streetwear. Poetry on fabric. Pakistan.'
);

/** Shop page meta description */
export const shopMetaDescription = envStr(
  'PUBLIC_SHOP_META_DESCRIPTION',
  'Cultural-art streetwear. Hoodies and oversized shirts. Pakistan.'
);

/** About page meta description */
export const aboutMetaDescription = envStr(
  'PUBLIC_ABOUT_META_DESCRIPTION',
  'Cultural-art streetwear. Poetry on fabric. Pakistan.'
);

/** Cart page meta description */
export const cartMetaDescription = envStr('PUBLIC_CART_META_DESCRIPTION', 'Your cart.');

/** Checkout page meta description */
export const checkoutMetaDescription = envStr('PUBLIC_CHECKOUT_META_DESCRIPTION', 'Complete your order.');

/** Auth/account page meta descriptions */
export const loginMetaDescription = envStr('PUBLIC_LOGIN_META_DESCRIPTION', 'Sign in to your account.');
export const registerMetaDescription = envStr('PUBLIC_REGISTER_META_DESCRIPTION', 'Create an account.');
export const forgotPasswordMetaDescription = envStr('PUBLIC_FORGOT_PASSWORD_META_DESCRIPTION', 'Request a password reset link.');
export const resetPasswordMetaDescription = envStr('PUBLIC_RESET_PASSWORD_META_DESCRIPTION', 'Set a new password.');
export const favoritesMetaDescription = envStr('PUBLIC_FAVORITES_META_DESCRIPTION', 'Your favorite products.');
export const ordersMetaDescription = envStr('PUBLIC_ORDERS_META_DESCRIPTION', 'Your order history.');
export const orderDetailMetaDescription = envStr('PUBLIC_ORDER_DETAIL_META_DESCRIPTION', 'Order details.');

/** Site URL for canonical/og (no trailing slash). Set in production. */
export const siteUrl = envStr('PUBLIC_SITE_URL', '').replace(/\/$/, '');

/** Favicon path (from public folder) */
export const faviconPath = envStr('PUBLIC_FAVICON', '/favicon.svg');

/** Theme localStorage key */
export const themeStorageKey = envStr('PUBLIC_THEME_STORAGE_KEY', 'aien-theme');

/** Landing: announcement bar text */
export const announcementText = envStr('PUBLIC_ANNOUNCEMENT_TEXT', 'FREE DELIVERY ON ORDERS PKR 2000 & ABOVE');

/** Landing: footer contact (Contact Us column) */
export const footerContact = {
  email: envStr('PUBLIC_FOOTER_EMAIL', 'contact.theclothingbrand@gmail.com'),
  phone: envStr('PUBLIC_FOOTER_PHONE', '000-0000000'),
  hours: envStr('PUBLIC_FOOTER_HOURS', 'MON - SAT | 9am - 5pm'),
};

/** Landing: feature strip (support, exchange, shipping) */
export const featureStrip = {
  supportText: envStr('PUBLIC_FEATURE_SUPPORT', 'Full customer support — we\'re here whenever you need us.'),
  supportHours: envStr('PUBLIC_FEATURE_SUPPORT_HOURS', 'MON - SAT | 9am - 5pm'), // kept for backwards compatibility if used elsewhere
  exchangeText: envStr('PUBLIC_FEATURE_EXCHANGE', '3 Days 100% Cash Back Gurantee.'),
  shippingText: envStr('PUBLIC_FEATURE_SHIPPING', 'Free delivery on every order.'),
};

/** Landing: category banner images (optional; placeholder or your asset URLs). */
export const categoryBannerImages = {
  tees: envStr('PUBLIC_BANNER_TEES_IMAGE', 'https://picsum.photos/seed/tees/600/750'),
  hoodie: envStr('PUBLIC_BANNER_HOODIE_IMAGE', 'https://picsum.photos/seed/hoodie/600/750'),
};
