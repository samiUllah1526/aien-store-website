import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from '../jobs/queues/email-queue.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const SALT_ROUNDS = 10;
/** Default 24h; override with JWT_ACCESS_EXPIRES_SEC. */
const ACCESS_EXPIRES_DEFAULT = 86400;
/** Password reset token validity in seconds (1 hour). */
const PASSWORD_RESET_EXPIRES_SEC = 3600;
/** JWT audience: 'store' for storefront, 'admin' for admin portal. */
export type JwtAudience = 'store' | 'admin';

@Injectable()
export class AuthService {
  private readonly accessExpiresSec: number;
  private readonly jwtIssuer: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailQueue: EmailQueueService,
    private readonly config: ConfigService,
  ) {
    this.accessExpiresSec = this.config.get<number>('JWT_ACCESS_EXPIRES_SEC', ACCESS_EXPIRES_DEFAULT);
    this.jwtIssuer = this.config.get<string>('jwt.issuer') ?? this.config.get<string>('urls.api');
  }

  private buildTokens(
    user: {
      id: string;
      email: string;
      name: string;
      permissions: string[];
      roleNames: string[];
    },
    audience: JwtAudience,
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      permissions: user.permissions,
      roleNames: user.roleNames,
      aud: audience,
      iss: this.jwtIssuer,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: this.accessExpiresSec });
    return { accessToken, payload };
  }

  async register(firstName: string, lastName: string | undefined, email: string, password: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }
    const customerRole = await this.prisma.role.findFirst({ where: { name: 'Customer' } });
    if (!customerRole) {
      throw new ConflictException('Customer role not found; run database seed.');
    }
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const name = [firstName.trim(), lastName?.trim()].filter(Boolean).join(' ').trim() || firstName.trim();
    const user = await this.prisma.user.create({
      data: {
        name,
        firstName: firstName.trim(),
        lastName: lastName?.trim() || null,
        email: email.trim().toLowerCase(),
        passwordHash,
        status: 'ACTIVE',
        roles: { create: [{ roleId: customerRole.id }] },
      },
    });
    const { accessToken, payload } = this.buildTokens(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        permissions: [],
        roleNames: ['Customer'],
      },
      'store',
    );
    this.emailQueue.enqueueWelcome({ to: user.email, name: user.name }).catch((err) => {
      console.warn('[AuthService] Failed to enqueue welcome email:', err);
    });
    return {
      accessToken,
      expiresIn: this.accessExpiresSec,
      user: { id: user.id, email: user.email, name: user.name, permissions: payload.permissions ?? [], roleNames: payload.roleNames ?? ['Customer'] },
    };
  }

  async login(email: string, password: string, audience: JwtAudience = 'store') {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        directPermissions: { include: { permission: true } },
      },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException('This account uses Google sign-in. Sign in with Google.');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const permissions = this.resolvePermissions(user);
    const roleNames = user.roles.map((ur) => ur.role.name);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const { accessToken, payload } = this.buildTokens(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        permissions,
        roleNames,
      },
      audience,
    );
    return {
      accessToken,
      expiresIn: this.accessExpiresSec,
      user: { id: user.id, email: user.email, name: user.name, permissions, roleNames },
    };
  }

  /** Used by Google OAuth: find user by email or googleId, or create a new Customer. Returns same shape as login(). */
  async findOrCreateFromGoogle(
    profile: {
      id: string;
      displayName?: string;
      name?: { familyName?: string; givenName?: string };
      emails?: Array<{ value: string; type?: string }>;
    },
    audience: JwtAudience = 'store',
  ) {
    const emailRaw = profile.emails?.[0]?.value;
    if (!emailRaw || typeof emailRaw !== 'string') {
      throw new UnauthorizedException('Google account has no email');
    }
    const email = emailRaw.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          { googleId: profile.id },
        ],
      },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
        directPermissions: { include: { permission: true } },
      },
    });
    if (existing) {
      if (existing.status !== 'ACTIVE') {
        throw new UnauthorizedException('Account is disabled');
      }
      const updateData: { lastLoginAt: Date; googleId?: string } = { lastLoginAt: new Date() };
      if (!existing.googleId) updateData.googleId = profile.id;
      await this.prisma.user.update({
        where: { id: existing.id },
        data: updateData,
      });
      const permissions = this.resolvePermissions(existing);
      const roleNames = existing.roles.map((ur) => ur.role.name);
      const { accessToken } = this.buildTokens(
        {
          id: existing.id,
          email: existing.email,
          name: existing.name,
          permissions,
          roleNames,
        },
        audience,
      );
      return {
        accessToken,
        expiresIn: this.accessExpiresSec,
        user: { id: existing.id, email: existing.email, name: existing.name, permissions, roleNames },
      };
    }
    const customerRole = await this.prisma.role.findFirst({ where: { name: 'Customer' } });
    if (!customerRole) {
      throw new UnauthorizedException('Customer role not found; run database seed.');
    }
    const givenName = profile.name?.givenName?.trim() ?? '';
    const familyName = profile.name?.familyName?.trim() ?? '';
    const name =
      [givenName, familyName].filter(Boolean).join(' ').trim() ||
      profile.displayName?.trim() ||
      email;
    const newUser = await this.prisma.user.create({
      data: {
        name,
        firstName: givenName || null,
        lastName: familyName || null,
        email,
        passwordHash: null,
        googleId: profile.id,
        status: 'ACTIVE',
        roles: { create: [{ roleId: customerRole.id }] },
      },
    });
    const { accessToken } = this.buildTokens(
      {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        permissions: [],
        roleNames: ['Customer'],
      },
      audience,
    );
    return {
      accessToken,
      expiresIn: this.accessExpiresSec,
      user: { id: newUser.id, email: newUser.email, name: newUser.name, permissions: [], roleNames: ['Customer'] },
    };
  }

  /**
   * Forgot password: if a user exists with this email, set a reset token and send email.
   * Does not reveal whether the email exists (same response either way).
   * @param context 'admin' = link goes to admin portal reset page; 'store' or omitted = link goes to main website reset page.
   */
  async forgotPassword(email: string, context?: 'store' | 'admin'): Promise<{ message: string }> {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
    });
    if (user && user.status === 'ACTIVE') {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRES_SEC * 1000);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: token, passwordResetExpiresAt: expiresAt },
      });
      const resetLink = this.buildResetLink(token, context);
      this.emailQueue.enqueuePasswordReset({ to: user.email, name: user.name, resetLink }).catch((err) => {
        console.warn('[AuthService] Failed to enqueue password reset email:', err);
      });
    }
    return { message: 'If an account exists with this email, you will receive a password reset link shortly.' };
  }

  /** Build reset URL: admin portal or main website depending on context. Uses APP_URL and ADMIN_URL from env. */
  private buildResetLink(token: string, context?: 'store' | 'admin'): string {
    const mainWebsiteUrl = (this.config.get<string>('APP_URL') ?? 'https://example.com').replace(/\/$/, '');
    const adminPortalUrl = this.config.get<string>('ADMIN_URL')?.replace(/\/$/, '');
    if (context === 'admin') {
      const base = adminPortalUrl ?? mainWebsiteUrl;
      if (!adminPortalUrl && mainWebsiteUrl === 'https://example.com') {
        console.warn('[Auth] Set ADMIN_URL in .env so admin reset links use your admin portal URL.');
      }
      return `${base}/admin/reset-password?token=${encodeURIComponent(token)}`;
    }
    return `${mainWebsiteUrl}/reset-password?token=${encodeURIComponent(token)}`;
  }

  /**
   * Reset password using token from email. Invalidates the token on success.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    if (!token || typeof token !== 'string' || token.trim() === '') {
      throw new BadRequestException('Reset token is required');
    }
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token.trim(),
        passwordResetExpiresAt: { gt: new Date() },
      },
    });
    if (!user) {
      throw new BadRequestException('Invalid or expired reset link. Please request a new one.');
    }
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });
    return { message: 'Your password has been reset. You can now sign in.' };
  }

  private resolvePermissions(user: {
    roles: Array<{ role: { permissions: Array<{ permission: { name: string } }> } }>;
    directPermissions: Array<{ permission: { name: string }; granted: boolean }>;
  }): string[] {
    const fromRoles = new Set<string>();
    for (const ur of user.roles) {
      for (const rp of ur.role.permissions) {
        fromRoles.add(rp.permission.name);
      }
    }
    const result = new Set(fromRoles);
    for (const up of user.directPermissions) {
      if (up.granted) result.add(up.permission.name);
      else result.delete(up.permission.name);
    }
    return Array.from(result);
  }
}
