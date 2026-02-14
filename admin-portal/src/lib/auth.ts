/**
 * Decode JWT payload without verification (client-side only).
 * Use for reading permissions for role-based UI. Token verification is done by the API.
 */

const TOKEN_KEY = 'admin_token';

export interface JwtPayload {
  sub?: string;
  email?: string;
  permissions?: string[];
  exp?: number;
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
  return localStorage.getItem(TOKEN_KEY);
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

export function hasPermission(permission: string): boolean {
  return getStoredPermissions().includes(permission);
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}
