import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export function RequirePermission(permission: string) {
  return SetMetadata(PERMISSIONS_KEY, [permission]);
}
