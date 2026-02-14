import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import type {
  UserResponseDto,
  UserRoleDto,
  RoleResponseDto,
} from './dto/user-response.dto';
import { UserStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
        include: { roles: { include: { role: true } } },
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
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
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
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        status: (dto.status as UserStatus) ?? UserStatus.ACTIVE,
        roles: dto.roleIds?.length
          ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      include: { roles: { include: { role: true } } },
    });
    return this.toResponseDto(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      throw new NotFoundException(`User with id "${id}" not found`);
    }
    if (dto.roleIds !== undefined) {
      await this.validateRoleIds(dto.roleIds);
    }
    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
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
    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: { roles: { include: { role: true } } },
    });
    return this.toResponseDto(updated);
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
      select: { id: true, name: true },
    });
    return roles;
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
    email: string;
    status: string;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    roles: Array<{ roleId: string; role: { id: string; name: string } }>;
  }): UserResponseDto {
    const roles: UserRoleDto[] = user.roles.map((ur) => ({
      roleId: ur.role.id,
      roleName: ur.role.name,
    }));
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      roleIds: roles.map((r) => r.roleId),
      roles,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
