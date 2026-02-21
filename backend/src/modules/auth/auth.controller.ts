import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account', security: [] })
  @ApiResponse({ status: 201, description: 'User created; returns accessToken and user' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
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
  @ApiOperation({ summary: 'Login with email and password', security: [] })
  @ApiResponse({ status: 200, description: 'Returns accessToken and user' })
  @ApiResponse({ status: 400, description: 'Invalid credentials' })
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
  @ApiOperation({ summary: 'Request password reset email', security: [] })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
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
  @ApiOperation({ summary: 'Reset password with token from email', security: [] })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
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
