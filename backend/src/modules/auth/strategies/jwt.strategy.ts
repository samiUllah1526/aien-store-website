import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  permissions?: string[];
  roleNames?: string[];
  aud?: string;
  iss?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);
  private readonly expectedIssuer: string | undefined;

  constructor(configService: ConfigService) {
    const secret = (
      configService.get<string>('JWT_SECRET') ??
      configService.get<string>('jwt.secret') ??
      'change-me-in-production'
    ).trim();
    const issuer =
      configService.get<string>('jwt.issuer') ??
      configService.get<string>('urls.api');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
    });
    this.expectedIssuer = issuer?.replace(/\/$/, '') || undefined;
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub) {
      this.logger.warn('Invalid JWT payload: missing sub');
      throw new UnauthorizedException('Invalid token payload');
    }
    if (
      this.expectedIssuer &&
      payload.iss &&
      payload.iss !== this.expectedIssuer
    ) {
      this.logger.warn(
        `Invalid JWT issuer: expected="${this.expectedIssuer}" received="${payload.iss}" sub="${payload.sub}" aud="${payload.aud ?? ''}"`,
      );
      throw new UnauthorizedException(
        `Invalid token issuer (expected ${this.expectedIssuer}, got ${payload.iss})`,
      );
    }
    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      permissions: payload.permissions ?? [],
      roleNames: payload.roleNames ?? [],
      aud: payload.aud,
      iss: payload.iss,
    };
  }
}
