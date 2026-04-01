import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAdminStrategy } from './strategies/google-admin.strategy';
import { AuthService } from './auth.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService): JwtModuleOptions => {
        const secret = (
          config.get<string>('JWT_SECRET') ?? 'change-me-in-production'
        ).trim();
        return {
          secret,
          signOptions: {
            expiresIn: config.get<number>('jwt.accessExpiresSec', 86400),
            algorithm: 'HS256',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [AuthService, JwtStrategy, GoogleStrategy, GoogleAdminStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
