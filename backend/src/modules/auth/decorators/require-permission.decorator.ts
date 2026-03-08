import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/** Use on controller (default for all handlers) or handler (overrides controller). Pass permission name(s) - user must have all. */
export function RequirePermission(permission: string) {
  return SetMetadata(PERMISSIONS_KEY, [permission]);
}
