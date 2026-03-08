import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getClass(), context.getHandler()],
    );

    const request = context.switchToHttp().getRequest();
    const path = (request.path || request.url || '').replace(/\?.*$/, '').replace(/\/$/, '') || '/';
    const isAdminRoute = path.startsWith('/admin');

    if (!requiredPermissions?.length) {
      if (isAdminRoute) {
        throw new ForbiddenException('No permission required for this admin route');
      }
      return true;
    }

    const { user } = request;
    if (!user?.permissions) {
      throw new ForbiddenException('User permissions not found');
    }
    const hasAll = requiredPermissions.every((p) =>
      (user.permissions as string[]).includes(p),
    );
    if (!hasAll) {
      throw new ForbiddenException(
        `Required permission(s): ${requiredPermissions.join(', ')}`,
      );
    }
    return true;
  }
}
