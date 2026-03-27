import { useEffect } from 'react';
import { fetchPermissions } from '../lib/permissions-api';

/**
 * Fetches the full list of permissions from the backend on mount.
 * Renders nothing. Include once in the admin layout so permissions are cached for the session.
 */
export default function PermissionsLoader() {
  useEffect(() => {
    fetchPermissions().catch(() => {});
  }, []);
  return null;
}
