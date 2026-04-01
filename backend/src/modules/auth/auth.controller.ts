import {
  Controller,
  Post,
  Get,
  Body,
  BadRequestException,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { AuthGuard } from '@nestjs/passport';
import * as express from 'express';
import type { GoogleLoginResult } from './strategies/google.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('google')
  @ApiOperation({ summary: 'Redirect to Google OAuth', security: [] })
  @ApiResponse({ status: 302, description: 'Redirects to Google' })
  async googleAuth(@Req() req: express.Request, @Res() res: express.Response) {
    const context = (req.query.context as string) || 'admin';
    const state = Buffer.from(JSON.stringify({ context })).toString(
      'base64url',
    );
    const base =
      process.env.API_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
    const callback = `${base}/auth/google/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.redirect(
        `${process.env.ADMIN_URL || 'http://localhost:4322'}/admin/login?error=Google+login+not+configured`,
      );
    }
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callback,
      response_type: 'code',
      scope: 'email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });
    return res.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    );
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback', security: [] })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with token' })
  async googleCallback(
    @Req() req: express.Request,
    @Res() res: express.Response,
  ) {
    const result = req.user as GoogleLoginResult | undefined;
    let state: { context?: string } = {};
    try {
      const raw = (req.query.state as string) || '';
      state = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    } catch {
      state = { context: 'admin' };
    }
    const context = state.context || 'admin';
    const adminUrl = (process.env.ADMIN_URL || 'http://localhost:4322').replace(
      /\/$/,
      '',
    );
    const appUrl = (process.env.APP_URL || 'http://localhost:4321').replace(
      /\/$/,
      '',
    );
    const base = context === 'admin' ? adminUrl : appUrl;
    const loginPath = context === 'admin' ? '/admin/login' : '/login';
    if (!result?.accessToken) {
      const error =
        (req as { query?: { error?: string } }).query?.error ||
        'Google sign-in failed';
      return res.redirect(
        `${base}${loginPath}?error=${encodeURIComponent(error)}`,
      );
    }
    return res.redirect(
      `${base}${loginPath}?token=${encodeURIComponent(result.accessToken)}`,
    );
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new customer account', security: [] })
  @ApiResponse({
    status: 201,
    description: 'User created; returns accessToken and user',
  })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(
    @Body('firstName') firstName: string,
    @Body('lastName') lastName: string | undefined,
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    if (
      !firstName ||
      typeof firstName !== 'string' ||
      firstName.trim() === ''
    ) {
      throw new BadRequestException('First name is required');
    }
    if (
      !email ||
      typeof email !== 'string' ||
      !password ||
      typeof password !== 'string'
    ) {
      throw new BadRequestException('Email and password are required');
    }
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    return this.authService.register(
      firstName.trim(),
      lastName?.trim() || undefined,
      email,
      password,
    );
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
    if (
      !email ||
      typeof email !== 'string' ||
      !password ||
      typeof password !== 'string'
    ) {
      throw new BadRequestException('Email and password are required');
    }
    return this.authService.login(email.trim(), password);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email', security: [] })
  @ApiResponse({
    status: 200,
    description: 'Reset email sent if account exists',
  })
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
  @ApiOperation({
    summary: 'Reset password with token from email',
    security: [],
  })
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
