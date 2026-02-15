import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
/** Default 24h so admin sessions survive a work day; override with JWT_ACCESS_EXPIRES_SEC. */
const ACCESS_EXPIRES_DEFAULT = 86400;

@Injectable()
export class AuthService {
  private readonly accessExpiresSec: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {
    this.accessExpiresSec = this.config.get<number>('JWT_ACCESS_EXPIRES_SEC', ACCESS_EXPIRES_DEFAULT);
  }

  private buildTokens(user: {
    id: string;
    email: string;
    name: string;
    permissions: string[];
    roleNames: string[];
  }) {
    const payload = { sub: user.id, email: user.email, name: user.name, permissions: user.permissions, roleNames: user.roleNames };
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
    const { accessToken, payload } = this.buildTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      permissions: [],
      roleNames: ['Customer'],
    });
    this.mail.sendWelcome({ to: user.email, name: user.name }).catch((err) => {
      console.warn('[AuthService] Welcome email failed:', err);
    });
    return {
      accessToken,
      expiresIn: this.accessExpiresSec,
      user: { id: user.id, email: user.email, name: user.name, permissions: payload.permissions ?? [], roleNames: payload.roleNames ?? ['Customer'] },
    };
  }

  async login(email: string, password: string) {
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
    const { accessToken, payload } = this.buildTokens({
      id: user.id,
      email: user.email,
      name: user.name,
      permissions,
      roleNames,
    });
    return {
      accessToken,
      expiresIn: this.accessExpiresSec,
      user: { id: user.id, email: user.email, name: user.name, permissions, roleNames },
    };
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
