/**
 * Storefront auth: access token for logged-in customers (checkout, my orders).
 * Persisted in localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const TOKEN_KEY = 'store_token';

type AuthState = {
  token: string | null;
  email: string | null;
  setAuth: (token: string, email: string) => void;
  clearAuth: () => void;
  isLoggedIn: () => boolean;
};

function decodeJwtPayload(token: string): { name?: string; email?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json) as { name?: string; email?: string };
  } catch {
    return null;
  }
}

/** Name and initial derived from the stored JWT (for display in header). */
export function getStoredUserDisplay(): { name: string; initial: string } | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const name = payload.name?.trim() || payload.email || 'Account';
  const initial = (name.charAt(0) || '?').toUpperCase();
  return { name, initial };
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      email: null,
      setAuth: (token, email) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(TOKEN_KEY, token);
        }
        set({ token, email });
      },
      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(TOKEN_KEY);
        }
        set({ token: null, email: null });
      },
      isLoggedIn: () => !!get().token,
    }),
    { name: 'store-auth', partialize: (s) => ({ token: s.token, email: s.email }) },
  ),
);

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
