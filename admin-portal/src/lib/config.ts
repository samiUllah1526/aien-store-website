/**
 * Admin portal configuration — single source of truth.
 * Set values via .env (see .env.example / site.config.example) or override defaults below.
 */

const env = typeof import.meta !== 'undefined' ? (import.meta as { env?: Record<string, string> }).env : undefined;

function envStr(key: string, fallback: string): string {
  const v = env?.[key];
  return (typeof v === 'string' ? v.trim() : '') || fallback;
}

/** Backend API base URL (no trailing slash) */
export const apiBaseUrl = envStr('PUBLIC_API_URL', 'http://localhost:3000').replace(/\/$/, '');

/** Admin app display name (sidebar, page titles, login screen) */
export const appName = envStr('PUBLIC_ADMIN_APP_NAME', 'E-Commerce Admin');

/** Favicon path (from public folder) */
export const faviconPath = envStr('PUBLIC_ADMIN_FAVICON', '/favicon.svg');

/** Theme (dark mode) localStorage key */
export const themeStorageKey = envStr('PUBLIC_ADMIN_THEME_STORAGE_KEY', 'admin_dark');

/** JWT access token localStorage key */
export const authTokenKey = envStr('PUBLIC_ADMIN_AUTH_TOKEN_KEY', 'admin_token');

/** Path to redirect to on 401 (logout) */
export const loginRedirectPath = envStr('PUBLIC_ADMIN_LOGIN_PATH', '/admin/login');

/** Main storefront URL (optional; for "Back to store" links if needed) */
export const mainWebsiteUrl = envStr('PUBLIC_MAIN_WEBSITE_URL', '');

// Legacy alias for existing imports
export const API_BASE_URL = apiBaseUrl;
