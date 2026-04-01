import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/create-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/create-permission.dto';
import type {
  RoleDetailDto,
  PermissionGroupDto,
  PermissionDetailDto,
} from './dto/role-response.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RoleDetailDto[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { users: true, permissions: true } },
        permissions: { select: { permissionId: true } },
      },
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      userCount: r._count.users,
      permissionCount: r._count.permissions,
      permissionIds: r.permissions.map((p) => p.permissionId),
    }));
  }

  async findOne(id: string): Promise<RoleDetailDto> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, permissions: true } },
        permissions: { select: { permissionId: true } },
      },
    });
    if (!role) {
      throw new NotFoundException(`Role with id "${id}" not found`);
    }
    return {
      id: role.id,
      name: role.name,
      description: role.description ?? null,
      userCount: role._count.users,
      permissionCount: role._count.permissions,
      permissionIds: role.permissions.map((p) => p.permissionId),
    };
  }

  async create(dto: CreateRoleDto): Promise<RoleDetailDto> {
    const name = dto.name.trim();
    const existing = await this.prisma.role.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException(`Role with name "${name}" already exists`);
    }
    if (dto.permissionIds?.length) {
      await this.validatePermissionIds(dto.permissionIds);
    }
    const role = await this.prisma.role.create({
      data: {
        name,
        description: dto.description?.trim() || null,
        permissions: dto.permissionIds?.length
          ? {
              create: dto.permissionIds.map((permissionId) => ({
                permissionId,
              })),
            }
          : undefined,
      },
      include: {
        _count: { select: { users: true, permissions: true } },
        permissions: { select: { permissionId: true } },
      },
    });
    return {
      id: role.id,
      name: role.name,
      description: role.description ?? null,
      userCount: role._count.users,
      permissionCount: role._count.permissions,
      permissionIds: role.permissions.map((p) => p.permissionId),
    };
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleDetailDto> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: { select: { permissionId: true } } },
    });
    if (!role) {
      throw new NotFoundException(`Role with id "${id}" not found`);
    }
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      const existing = await this.prisma.role.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ConflictException(`Role with name "${name}" already exists`);
      }
    }
    if (dto.permissionIds !== undefined) {
      await this.validatePermissionIds(dto.permissionIds);
    }
    const data: { name?: string; description?: string | null } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined)
      data.description = dto.description?.trim() || null;

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.role.update({ where: { id }, data });
      }
      if (dto.permissionIds !== undefined) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (dto.permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: dto.permissionIds.map((permissionId) => ({
              roleId: id,
              permissionId,
            })),
            skipDuplicates: true,
          });
        }
      }
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) {
      throw new NotFoundException(`Role with id "${id}" not found`);
    }
    if (role.name === 'Super Admin' || role.name === 'Customer') {
      throw new BadRequestException(
        'Cannot delete system roles (Super Admin, Customer)',
      );
    }
    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.name}": ${role._count.users} user(s) still have this role. Remove the role from users first.`,
      );
    }
    await this.prisma.role.delete({ where: { id } });
  }

  async listPermissions(): Promise<
    { id: string; name: string; category: string | null }[]
  > {
    const list = await this.prisma.permission.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, category: true },
    });
    return list.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category ?? null,
    }));
  }

  async listPermissionsGrouped(): Promise<PermissionGroupDto[]> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, description: true, category: true },
    });
    const byCategory = new Map<
      string | null,
      PermissionGroupDto['permissions']
    >();
    for (const p of permissions) {
      const cat = p.category ?? null;
      if (!byCategory.has(cat)) {
        byCategory.set(cat, []);
      }
      byCategory.get(cat)!.push({
        id: p.id,
        name: p.name,
        description: p.description ?? null,
      });
    }
    const categories = Array.from(byCategory.keys()).sort((a, b) => {
      if (a == null) return 1;
      if (b == null) return -1;
      return a.localeCompare(b);
    });
    return categories.map((category) => ({
      category,
      permissions: byCategory.get(category)!,
    }));
  }

  async createPermission(
    dto: CreatePermissionDto,
  ): Promise<PermissionDetailDto> {
    const name = dto.name.trim().toLowerCase();
    const existing = await this.prisma.permission.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) {
      throw new ConflictException(`Permission "${name}" already exists`);
    }
    const permission = await this.prisma.permission.create({
      data: {
        name,
        description: dto.description?.trim() || null,
        category: dto.category?.trim() || null,
      },
    });
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description ?? null,
      category: permission.category ?? null,
      createdAt: permission.createdAt.toISOString(),
      updatedAt: permission.updatedAt.toISOString(),
    };
  }

  async updatePermission(
    id: string,
    dto: UpdatePermissionDto,
  ): Promise<PermissionDetailDto> {
    const permission = await this.prisma.permission.findUnique({
      where: { id },
    });
    if (!permission) {
      throw new NotFoundException(`Permission with id "${id}" not found`);
    }
    const data: { description?: string | null; category?: string | null } = {};
    if (dto.description !== undefined)
      data.description = dto.description?.trim() || null;
    if (dto.category !== undefined)
      data.category = dto.category?.trim() || null;
    if (Object.keys(data).length === 0) {
      return {
        id: permission.id,
        name: permission.name,
        description: permission.description ?? null,
        category: permission.category ?? null,
        createdAt: permission.createdAt.toISOString(),
        updatedAt: permission.updatedAt.toISOString(),
      };
    }
    const updated = await this.prisma.permission.update({
      where: { id },
      data,
    });
    return {
      id: updated.id,
      name: updated.name,
      description: updated.description ?? null,
      category: updated.category ?? null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  private async validatePermissionIds(permissionIds: string[]): Promise<void> {
    const found = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    });
    const foundSet = new Set(found.map((p) => p.id));
    const missing = permissionIds.filter((id) => !foundSet.has(id));
    if (missing.length) {
      throw new BadRequestException(
        `Permissions not found: ${missing.join(', ')}`,
      );
    }
  }
}
