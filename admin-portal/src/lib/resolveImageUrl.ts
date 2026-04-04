import { getApiBaseUrl } from './api';

/** Absolute URL for admin previews (handles relative API paths and full URLs). */
export function resolveAdminImageUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = getApiBaseUrl().replace(/\/$/, '');
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}
