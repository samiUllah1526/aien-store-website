/**
 * Auth helpers for admin portal.
 * Access token stored in localStorage, sent with API requests.
 */

import { authTokenKey } from './config';

export interface JwtPayload {
  sub?: string;
  email?: string;
  name?: string;
  permissions?: string[];
  roleNames?: string[];
  exp?: number;
}

export interface StoredUser {
  name: string;
  email: string;
  roleDisplay: string;
  initial: string;
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  try {
    return decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return '';
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(authTokenKey);
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const json = base64UrlDecode(parts[1]);
    return json ? (JSON.parse(json) as JwtPayload) : null;
  } catch {
    return null;
  }
}

/** Permissions from the current JWT (for role-based UI). */
export function getStoredPermissions(): string[] {
  const token = getStoredToken();
  if (!token) return [];
  const payload = decodeToken(token);
  return payload?.permissions ?? [];
}

/** Current user display info from JWT (name, email, role, initial). */
export function getStoredUser(): StoredUser | null {
  const token = getStoredToken();
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload) return null;
  const name = payload.name?.trim() || payload.email || 'User';
  const email = payload.email || '';
  const roleDisplay = payload.roleNames?.length ? payload.roleNames.join(', ') : 'User';
  const initial = (name.charAt(0) || '?').toUpperCase();
  return { name, email, roleDisplay, initial };
}

export function hasPermission(permission: string): boolean {
  return getStoredPermissions().includes(permission);
}

export function setStoredToken(accessToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(authTokenKey, accessToken);
}

export function clearStoredTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(authTokenKey);
}

/** @deprecated Use clearStoredTokens for full cleanup */
export function clearStoredToken(): void {
  clearStoredTokens();
}
