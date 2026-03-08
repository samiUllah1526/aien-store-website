import { Controller, Post, Get, Body, BadRequestException, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import * as express from 'express';
import { AuthService } from '../../modules/auth/auth.service';
import { Public } from '../../modules/auth/decorators/public.decorator';
import { AdminGuard } from '../../modules/auth/guards/admin.guard';
import type { GoogleLoginResult } from '../../modules/auth/strategies/google.strategy';

@ApiTags('admin-auth')
@Controller('admin/auth')
@UseGuards(AdminGuard)
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Get('google')
  @ApiOperation({ summary: 'Redirect to Google OAuth (admin)', security: [] })
  @ApiResponse({ status: 302, description: 'Redirects to Google' })
  async googleAuth(@Req() req: express.Request, @Res() res: express.Response) {
    const state = Buffer.from(JSON.stringify({ context: 'admin' })).toString('base64url');
    const base = process.env.API_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
    const callback = `${base}/admin/auth/google/callback`;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      const adminUrl = (process.env.ADMIN_URL || 'http://localhost:4322').replace(/\/$/, '');
      return res.redirect(`${adminUrl}/admin/login?error=Google+login+not+configured`);
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
    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google-admin'))
  @ApiOperation({ summary: 'Google OAuth callback (admin)', security: [] })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with token' })
  async googleCallback(@Req() req: express.Request, @Res() res: express.Response) {
    const result = req.user as GoogleLoginResult | undefined;
    const adminUrl = (process.env.ADMIN_URL || 'http://localhost:4322').replace(/\/$/, '');
    if (!result?.accessToken) {
      const error = (req as { query?: { error?: string } }).query?.error || 'Google sign-in failed';
      return res.redirect(`${adminUrl}/admin/login?error=${encodeURIComponent(error)}`);
    }
    return res.redirect(`${adminUrl}/admin/login?token=${encodeURIComponent(result.accessToken)}`);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password (admin)', security: [] })
  @ApiResponse({ status: 200, description: 'Returns accessToken and user' })
  @ApiResponse({ status: 400, description: 'Invalid credentials' })
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      throw new BadRequestException('Email and password are required');
    }
    return this.authService.login(email.trim(), password, 'admin');
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email (admin)', security: [] })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
  async forgotPassword(@Body('email') email: string) {
    if (!email || typeof email !== 'string' || email.trim() === '') {
      throw new BadRequestException('Email is required');
    }
    return this.authService.forgotPassword(email, 'admin');
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
