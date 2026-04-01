import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

/** Result of findOrCreateFromGoogle — attached to request after Google callback. */
export interface GoogleLoginResult {
  accessToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    permissions: string[];
    roleNames: string[];
  };
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google-store') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const apiUrl = configService.get<string>('API_URL')?.replace(/\/$/, '');
    const callbackURL = apiUrl
      ? `${apiUrl}/store/auth/google/callback`
      : 'http://localhost:3000/store/auth/google/callback';
    super({
      clientID: clientID ?? '',
      clientSecret: clientSecret ?? '',
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      displayName?: string;
      name?: { familyName?: string; givenName?: string };
      emails?: Array<{ value: string }>;
    },
  ): Promise<GoogleLoginResult> {
    return this.authService.findOrCreateFromGoogle(profile, 'store');
  }
}
