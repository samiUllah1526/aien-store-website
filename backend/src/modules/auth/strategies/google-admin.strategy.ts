import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import type { GoogleLoginResult } from './google.strategy';

@Injectable()
export class GoogleAdminStrategy extends PassportStrategy(
  Strategy,
  'google-admin',
) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const apiUrl = configService.get<string>('API_URL')?.replace(/\/$/, '');
    const callbackURL = apiUrl
      ? `${apiUrl}/admin/auth/google/callback`
      : 'http://localhost:3000/admin/auth/google/callback';
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
    return this.authService.findOrCreateFromGoogle(profile, 'admin');
  }
}
