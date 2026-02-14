/**
 * Storefront auth: token for logged-in customers (checkout, my orders).
 * Persisted in localStorage as store_token.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const STORAGE_KEY = 'store_token';

type AuthState = {
  token: string | null;
  email: string | null;
  setAuth: (token: string, email: string) => void;
  clearAuth: () => void;
  isLoggedIn: () => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      email: null,
      setAuth: (token, email) => {
        if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, token);
        set({ token, email });
      },
      clearAuth: () => {
        if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
        set({ token: null, email: null });
      },
      isLoggedIn: () => !!get().token,
    }),
    { name: 'store-auth', partialize: (s) => ({ token: s.token, email: s.email }) },
  ),
);

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}
