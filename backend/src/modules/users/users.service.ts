import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from '../jobs/queues/email-queue.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { UserQueryDto } from './dto/user-query.dto';
import type {
  UserResponseDto,
  UserRoleDto,
  RoleResponseDto,
} from './dto/user-response.dto';
import { UserStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

const SALT_ROUNDS = 10;
const PASSWORD_RESET_EXPIRES_SEC = 3600;
const SUPER_ADMIN_ROLE_NAME = 'Super Admin';

const userInclude = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
  directPermissions: { include: { permission: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
    private readonly config: ConfigService,
  ) {}

  async findAll(
    query: UserQueryDto,
  ): Promise<{ data: UserResponseDto[]; total: number }> {
    const { page = 1, limit = 20, search, status, roleId } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (roleId) {
      where.roles = { some: { roleId } };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: userInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users.map((u) => this.toResponseDto(u)), total };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    return this.toResponseDto(user);
  }

  /** Invite user to admin portal (set-password email). Super Admin only. */
  async invite(dto: InviteUserDto): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email.trim().toLowerCase(), mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException(`User with email "${dto.email}" already exists`);
    }
    if (dto.roleIds?.length) await this.validateRoleIds(dto.roleIds);
    if (dto.permissionIds?.length) await this.validatePermissionIds(dto.permissionIds);

    const tempPassword = randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRES_SEC * 1000);

    const firstName = dto.firstName?.trim() || null;
    const lastName = dto.lastName?.trim() || null;
    const name =
      dto.name?.trim() ||
      [firstName, lastName].filter(Boolean).join(' ').trim() ||
      dto.email;
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.create({
      data: {
        name,
        firstName,
        lastName,
        email,
        passwordHash,
        status: UserStatus.ACTIVE,
        passwordResetToken: token,
        passwordResetExpiresAt: expiresAt,
        roles: dto.roleIds?.length
          ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
        directPermissions: dto.permissionIds?.length
          ? { create: dto.permissionIds.map((permissionId) => ({ permissionId, granted: true })) }
          : undefined,
      },
      include: userInclude,
    });

    const setPasswordLink = this.buildAdminResetLink(token);
    this.emailQueue.enqueueInvite({
      to: user.email,
      name: user.name,
      setPasswordLink,
    }).catch((err) => {
      console.warn('[UsersService] Failed to enqueue invite email:', err);
    });

    return this.toResponseDto(user);
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(`User with email "${dto.email}" already exists`);
    }
    if (dto.roleIds?.length) {
      await this.validateRoleIds(dto.roleIds);
    }
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const firstName = dto.firstName?.trim() || null;
    const lastName = dto.lastName?.trim() || null;
    const name =
      dto.name?.trim() ||
      [firstName, lastName].filter(Boolean).join(' ').trim() ||
      dto.email;
    const user = await this.prisma.user.create({
      data: {
        name,
        firstName,
        lastName,
        email: dto.email,
        passwordHash,
        status: (dto.status as UserStatus) ?? UserStatus.ACTIVE,
        roles: dto.roleIds?.length
          ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      include: userInclude,
    });
    this.emailQueue.enqueueUserCreated({ to: user.email, name: user.name }).catch((err) => {
      console.warn('[UsersService] Failed to enqueue user-created email:', err);
    });
    return this.toResponseDto(user);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    callerPermissions: string[] = [],
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    const canManageRoles =
      callerPermissions.includes('superadmin:manage');
    if ((dto.roleIds !== undefined || (dto.directPermissions !== undefined && dto.directPermissions.length > 0)) && !canManageRoles) {
      throw new ForbiddenException('Only Super Admins can assign roles or permissions');
    }
    if (dto.roleIds !== undefined) {
      await this.validateRoleIds(dto.roleIds);
    }
    if (dto.directPermissions !== undefined) {
      await this.validatePermissionIds(dto.directPermissions.map((p) => p.permissionId));
    }
    if (dto.email !== undefined) {
      const normalized = dto.email.trim().toLowerCase();
      const existing = await this.prisma.user.findFirst({
        where: { email: { equals: normalized, mode: 'insensitive' } },
        select: { id: true },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`An account with this email already exists`);
      }
    }
    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim() || null;
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim() || null;
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.firstName !== undefined || dto.lastName !== undefined) {
      const first = (dto.firstName ?? user.firstName)?.trim() || '';
      const last = (dto.lastName ?? user.lastName)?.trim() || '';
      data.name = [first, last].filter(Boolean).join(' ').trim() || user.name;
    }
    if (dto.status !== undefined) data.status = dto.status as UserStatus;
    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }
    if (dto.roleIds !== undefined) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      if (dto.roleIds.length > 0) {
        await this.prisma.userRole.createMany({
          data: dto.roleIds.map((roleId) => ({ userId: id, roleId })),
          skipDuplicates: true,
        });
      }
    }
    if (dto.directPermissions !== undefined) {
      await this.prisma.userPermission.deleteMany({ where: { userId: id } });
      if (dto.directPermissions.length > 0) {
        await this.prisma.userPermission.createMany({
          data: dto.directPermissions.map((p) => ({
            userId: id,
            permissionId: p.permissionId,
            granted: p.granted,
          })),
        });
      }
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: userInclude,
    });
    return this.toResponseDto(updated);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserResponseDto> {
    return this.update(userId, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: dto.password,
    });
  }

  /** Promote user to Super Admin. Super Admin only. */
  async promoteSuperAdmin(userId: string): Promise<UserResponseDto> {
    const superAdminRole = await this.prisma.role.findFirst({
      where: { name: SUPER_ADMIN_ROLE_NAME },
    });
    if (!superAdminRole) {
      throw new BadRequestException('Super Admin role not found; run database seed.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userInclude,
    });
    if (!user) {
      throw new NotFoundException(`User with id "${userId}" not found`);
    }
    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: { userId, roleId: superAdminRole.id },
      },
      create: { userId, roleId: superAdminRole.id },
      update: {},
    });
    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userInclude,
    });
    return this.toResponseDto(updated!);
  }

  /** Demote user from Super Admin. Super Admin only. */
  async demoteSuperAdmin(userId: string): Promise<UserResponseDto> {
    const superAdminRole = await this.prisma.role.findFirst({
      where: { name: SUPER_ADMIN_ROLE_NAME },
    });
    if (!superAdminRole) {
      throw new BadRequestException('Super Admin role not found; run database seed.');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userInclude,
    });
    if (!user) {
      throw new NotFoundException(`User with id "${userId}" not found`);
    }
    await this.prisma.userRole.deleteMany({
      where: { userId, roleId: superAdminRole.id },
    });
    const updated = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userInclude,
    });
    return this.toResponseDto(updated!);
  }

  async remove(id: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    await this.prisma.user.delete({ where: { id } });
  }

  async listRoles(): Promise<RoleResponseDto[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, description: true },
    });
    return roles;
  }

  private buildAdminResetLink(token: string): string {
    const mainWebsiteUrl = (this.config.get<string>('APP_URL') ?? 'https://example.com').replace(/\/$/, '');
    const adminPortalUrl = this.config.get<string>('ADMIN_URL')?.replace(/\/$/, '');
    const base = adminPortalUrl ?? mainWebsiteUrl;
    return `${base}/admin/reset-password?token=${encodeURIComponent(token)}`;
  }

  private async validatePermissionIds(permissionIds: string[]): Promise<void> {
    const found = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    });
    const foundSet = new Set(found.map((p) => p.id));
    const missing = permissionIds.filter((id) => !foundSet.has(id));
    if (missing.length) {
      throw new BadRequestException(`Permissions not found: ${missing.join(', ')}`);
    }
  }

  private async validateRoleIds(roleIds: string[]): Promise<void> {
    const found = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      select: { id: true },
    });
    const foundSet = new Set(found.map((r) => r.id));
    const missing = roleIds.filter((id) => !foundSet.has(id));
    if (missing.length) {
      throw new BadRequestException(`Roles not found: ${missing.join(', ')}`);
    }
  }

  private toResponseDto(user: {
    id: string;
    name: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    status: string;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    roles: Array<{
      role: {
        id: string;
        name: string;
        permissions?: Array<{ permission: { name: string } }>;
      };
    }>;
    directPermissions?: Array<{ permission: { id: string; name: string }; granted: boolean }>;
  }): UserResponseDto {
    const roles: UserRoleDto[] = user.roles.map((ur) => ({
      roleId: ur.role.id,
      roleName: ur.role.name,
    }));
    const permissionsSet = new Set<string>();
    for (const ur of user.roles) {
      for (const rp of ur.role.permissions ?? []) {
        permissionsSet.add(rp.permission.name);
      }
    }
    for (const up of user.directPermissions ?? []) {
      if (up.granted) permissionsSet.add(up.permission.name);
      else permissionsSet.delete(up.permission.name);
    }
    const isSuperAdmin = user.roles.some((ur) => ur.role.name === SUPER_ADMIN_ROLE_NAME);
    const directPermissionIds = (user.directPermissions ?? [])
      .filter((up) => up.granted)
      .map((up) => up.permission.id);
    return {
      id: user.id,
      name: user.name,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      email: user.email,
      status: user.status,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      roleIds: roles.map((r) => r.roleId),
      roles,
      permissions: Array.from(permissionsSet),
      isSuperAdmin,
      directPermissionIds,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
