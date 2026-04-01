import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

/** Admin routes that do not require JWT (auth issuance only). No other admin routes are public. */
const ADMIN_PUBLIC_PATHS = new Set([
  '/admin/auth/login',
  '/admin/auth/register',
  '/admin/auth/google',
  '/admin/auth/google/callback',
  '/admin/auth/forgot-password',
  '/admin/auth/reset-password',
]);

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const path =
      (req.path || req.url || '').replace(/\?.*$/, '').replace(/\/$/, '') ||
      '/';

    if (!path.startsWith('/admin')) {
      return true;
    }

    if (ADMIN_PUBLIC_PATHS.has(path)) {
      return true;
    }

    const user = req.user as
      | { aud?: string; permissions?: string[] }
      | undefined;

    if (!user) {
      throw new ForbiddenException('Admin access required');
    }
    if (user.aud !== 'admin') {
      throw new ForbiddenException('Token not valid for admin portal');
    }
    const permissions = Array.isArray(user.permissions) ? user.permissions : [];
    if (!permissions.includes('admin:access')) {
      throw new ForbiddenException('Admin access required');
    }
    return true;
  }
}
