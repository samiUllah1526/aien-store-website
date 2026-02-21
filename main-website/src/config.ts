/**
 * Site configuration — single source of truth.
 * Set values via .env (see .env.example) or override defaults below.
 */

const env = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env : undefined;

function envStr(key: string, fallback: string): string {
  const v = env?.[key];
  return (typeof v === 'string' ? v.trim() : '') || fallback;
}

/** Backend API base URL (no trailing slash) */
export const apiBaseUrl = envStr('PUBLIC_API_URL', 'http://localhost:3000').replace(/\/$/, '');

/** Hero video: YouTube, Vimeo, or direct mp4/webm URL */
export const heroVideoUrl = envStr('PUBLIC_HERO_VIDEO_URL', '/videos/hero.mp4');

/** Hero poster: image URL for mobile/reduced-motion (optional; auto for YouTube) */
export const heroVideoPoster = envStr('PUBLIC_HERO_VIDEO_POSTER', '');

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
