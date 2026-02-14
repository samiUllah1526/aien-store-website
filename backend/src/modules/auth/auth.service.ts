import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
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
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const payload = { sub: user.id, email: user.email, permissions };
    const accessToken = this.jwtService.sign(payload);
    return { accessToken, user: { id: user.id, email: user.email, permissions }, expiresIn: '7d' };
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
