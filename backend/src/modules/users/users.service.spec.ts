import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

const userId = '11111111-1111-1111-1111-111111111111';
const mockUser = {
  id: userId,
  name: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  status: 'ACTIVE',
  lastLoginAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  roles: [{ roleId: 'role-1', role: { id: 'role-1', name: 'Admin' } }],
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    userRole: { deleteMany: jest.Mock; createMany: jest.Mock };
    role: { findMany: jest.Mock };
  };
  let mail: { sendUserCreated: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      userRole: { deleteMany: jest.fn(), createMany: jest.fn() },
      role: { findMany: jest.fn() },
    };
    mail = { sendUserCreated: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('findAll', () => {
    it('returns paginated list with total', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser]);
      prisma.user.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].email).toBe('test@example.com');
    });

    it('applies search, status, and roleId filters', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);

      await service.findAll({
        search: 'john',
        status: 'ACTIVE',
        roleId: 'role-1',
      });

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            OR: [
              { name: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ],
            roles: { some: { roleId: 'role-1' } },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns user when found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(userId);

      expect(result.id).toBe(userId);
      expect(result.email).toBe('test@example.com');
      expect(result.roleIds).toEqual(['role-1']);
    });

    it('throws NotFoundException when not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates user and sends user-created email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ ...mockUser, email: 'new@test.com', name: 'New User' });

      const result = await service.create({
        name: 'New User',
        email: 'new@test.com',
        password: 'password123',
      });

      expect(result.email).toBe('new@test.com');
      expect(mail.sendUserCreated).toHaveBeenCalledWith({
        to: 'new@test.com',
        name: 'New User',
      });
    });

    it('throws ConflictException when email already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({
          name: 'User',
          email: 'existing@test.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when roleIds are invalid', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findMany.mockResolvedValue([{ id: 'role-1' }]);

      await expect(
        service.create({
          name: 'User',
          email: 'new@test.com',
          password: 'password123',
          roleIds: ['role-1', 'invalid-role'],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('derives name from firstName and lastName when name empty after trim', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          ...mockUser,
          ...data,
          roles: [{ roleId: 'role-1', role: { id: 'role-1', name: 'Admin' } }],
        }),
      );

      await service.create({
        name: '  ',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        password: 'password123',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'John Doe' }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates user and returns DTO', async () => {
      const updated = { ...mockUser, name: 'Updated Name', firstName: 'Updated', lastName: 'Name' };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(updated);

      const result = await service.update(userId, { firstName: 'Updated', lastName: 'Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('throws NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when email taken by another user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.findFirst.mockResolvedValue({ id: 'other-user-id' });

      await expect(
        service.update(userId, { email: 'taken@test.com' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('allows same user to keep their email', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.findFirst.mockResolvedValue({ id: userId });
      prisma.user.update.mockResolvedValue({ ...mockUser, email: 'test@example.com' });

      const result = await service.update(userId, { email: 'test@example.com' });

      expect(result).toBeDefined();
    });

    it('throws BadRequestException when roleIds invalid', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.role.findMany.mockResolvedValue([{ id: 'role-1' }]);

      await expect(
        service.update(userId, { roleIds: ['role-1', 'invalid'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deletes user when found', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.delete.mockResolvedValue(mockUser);

      await service.remove(userId);

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: userId } });
    });

    it('throws NotFoundException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(prisma.user.delete).not.toHaveBeenCalled();
    });
  });

  describe('listRoles', () => {
    it('returns roles ordered by name', async () => {
      prisma.role.findMany.mockResolvedValue([
        { id: 'r1', name: 'Admin' },
        { id: 'r2', name: 'Customer' },
      ]);

      const result = await service.listRoles();

      expect(result).toEqual([
        { id: 'r1', name: 'Admin' },
        { id: 'r2', name: 'Customer' },
      ]);
      expect(prisma.role.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      });
    });
  });
});
