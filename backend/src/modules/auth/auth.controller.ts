import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  async register(
    @Body('firstName') firstName: string,
    @Body('lastName') lastName: string | undefined,
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    if (!firstName || typeof firstName !== 'string' || firstName.trim() === '') {
      throw new BadRequestException('First name is required');
    }
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      throw new BadRequestException('Email and password are required');
    }
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    return this.authService.register(firstName.trim(), lastName?.trim() || undefined, email, password);
  }

  @Public()
  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      throw new BadRequestException('Email and password are required');
    }
    return this.authService.login(email.trim(), password);
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(
    @Body('email') email: string,
    @Body('context') context?: string,
  ) {
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new BadRequestException('Email is required');
    }
    const ctx = context === 'admin' ? 'admin' : 'store';
    return this.authService.forgotPassword(email, ctx);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string,
  ) {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Reset token is required');
    }
    if (!password || typeof password !== 'string') {
      throw new BadRequestException('Password is required');
    }
    return this.authService.resetPassword(token, password);
  }
}
