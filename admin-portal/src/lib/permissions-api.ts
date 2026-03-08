/**
 * Backend-driven permissions: fetch full list from GET /admin/permissions and cache.
 * Use getCachedPermissions() / fetchPermissions() instead of a frontend constant.
 * User's own permissions for show/hide still come from the JWT (getStoredPermissions).
 */

import { api } from './api';

export interface PermissionDto {
  id: string;
  name: string;
  category: string | null;
}

let cached: PermissionDto[] | null = null;

/**
 * Returns the cached list of all permissions, or null if not yet fetched.
 */
export function getCachedPermissions(): PermissionDto[] | null {
  return cached;
}

/**
 * Fetches the full list of permissions from the backend and caches it.
 * Call after login or when the admin app loads. Returns the list.
 */
export async function fetchPermissions(): Promise<PermissionDto[]> {
  const res = await api.get<PermissionDto[]>('/permissions');
  const data = res.data ?? [];
  cached = data;
  return data;
}

/**
 * Returns permission names from cache (or empty array if not loaded).
 * Use for validation or when you need "all permission names" without refetching.
 */
export function getCachedPermissionNames(): string[] {
  return (cached ?? []).map((p) => p.name);
}

/** Clear cache (e.g. on logout). */
export function clearPermissionsCache(): void {
  cached = null;
}
