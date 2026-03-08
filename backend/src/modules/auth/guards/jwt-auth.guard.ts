import { Injectable, ExecutionContext, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  private getTokenMeta(authorization: string | undefined): {
    sub?: string;
    aud?: string;
    iss?: string;
    exp?: number;
    iat?: number;
    expIso?: string;
    secondsUntilExp?: number;
  } | null {
    if (!authorization?.startsWith('Bearer ')) return null;
    const token = authorization.slice('Bearer '.length).trim();
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
      const payloadRaw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payloadRaw + '='.repeat((4 - (payloadRaw.length % 4)) % 4);
      const json = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as {
        sub?: string;
        aud?: string;
        iss?: string;
        exp?: number;
        iat?: number;
      };
      const nowSec = Math.floor(Date.now() / 1000);
      const exp = typeof json.exp === 'number' ? json.exp : undefined;
      return {
        sub: json.sub,
        aud: json.aud,
        iss: json.iss,
        exp,
        iat: json.iat,
        expIso: exp ? new Date(exp * 1000).toISOString() : undefined,
        secondsUntilExp: exp ? exp - nowSec : undefined,
      };
    } catch {
      return null;
    }
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: TUser | false,
    info: unknown,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      const req = context.switchToHttp().getRequest<Request>();
      const infoObj = (info ?? {}) as { name?: string; message?: string; expiredAt?: Date };
      const tokenMeta = this.getTokenMeta(req.headers.authorization);
      this.logger.warn(
        [
          `JWT rejected for ${req.method} ${req.originalUrl || req.url}`,
          `reason=${infoObj.name || (err instanceof Error ? err.name : 'Unauthorized')}`,
          `message=${infoObj.message || (err instanceof Error ? err.message : 'Unauthorized')}`,
          infoObj.expiredAt ? `expiredAt=${infoObj.expiredAt.toISOString()}` : '',
          tokenMeta ? `tokenMeta=${JSON.stringify(tokenMeta)}` : 'tokenMeta=unavailable',
        ]
          .filter(Boolean)
          .join(' | '),
      );
      if (err instanceof Error) throw err;
      throw new UnauthorizedException(infoObj.message || 'Unauthorized');
    }
    return user as TUser;
  }
}
