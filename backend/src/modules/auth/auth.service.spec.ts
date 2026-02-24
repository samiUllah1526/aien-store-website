import { Test, TestingModule } from '@nestjs/testing';

jest.mock('pg-boss', () => ({
  PgBoss: jest.fn(),
}));

import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from '../jobs/queues/email-queue.service';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn(),
}));

const mockUser = {
  id: 'user-uuid',
  email: 'user@test.com',
  name: 'Test User',
  passwordHash: 'hashed-password',
  status: 'ACTIVE' as const,
  roles: [{ role: { name: 'Customer' } }],
  directPermissions: [],
};

const mockCustomerRole = { id: 'role-uuid', name: 'Customer' };

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock };
    role: { findFirst: jest.Mock };
  };
  let emailQueue: { enqueueWelcome: jest.Mock; enqueuePasswordReset: jest.Mock };
  let jwtSign: jest.Mock;

  beforeEach(async () => {
    jest.clearAllMocks();
    const bcrypt = require('bcrypt');
    bcrypt.compare.mockResolvedValue(true);

    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      role: { findFirst: jest.fn() },
    };
    emailQueue = {
      enqueueWelcome: jest.fn().mockResolvedValue(undefined),
      enqueuePasswordReset: jest.fn().mockResolvedValue(undefined),
    };
    jwtSign = jest.fn().mockReturnValue('jwt-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jwtSign } },
        { provide: EmailQueueService, useValue: emailQueue },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              if (key === 'JWT_ACCESS_EXPIRES_SEC') return 86400;
              if (key === 'APP_URL') return 'https://app.com';
              if (key === 'ADMIN_URL') return 'https://admin.com';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('creates user and returns accessToken', async () => {
      const createdUser = { ...mockUser, id: 'new-id', email: 'new@test.com', name: 'Test User' };
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findFirst.mockResolvedValue(mockCustomerRole);
      prisma.user.create.mockResolvedValue(createdUser);

      const result = await service.register('Test', 'User', 'new@test.com', 'password123');

      expect(result.accessToken).toBe('jwt-token');
      expect(result.user.email).toBe('new@test.com');
      expect(result.user.roleNames).toEqual(['Customer']);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@test.com',
            firstName: 'Test',
            lastName: 'User',
            status: 'ACTIVE',
          }),
        }),
      );
      expect(emailQueue.enqueueWelcome).toHaveBeenCalledWith({ to: 'new@test.com', name: expect.any(String) });
    });

    it('throws ConflictException when email exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
      prisma.role.findFirst.mockResolvedValue(mockCustomerRole);

      await expect(
        service.register('First', 'Last', 'existing@test.com', 'password123'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when Customer role missing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.role.findFirst.mockResolvedValue(null);

      await expect(
        service.register('First', 'Last', 'new@test.com', 'password123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns accessToken for valid credentials', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        roles: [{ role: { permissions: [], name: 'Customer' } }],
        directPermissions: [],
      });
      prisma.user.update.mockResolvedValue(undefined);

      const result = await service.login('user@test.com', 'password123');

      expect(result.accessToken).toBe('jwt-token');
      expect(result.user.email).toBe('user@test.com');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: { lastLoginAt: expect.any(Date) },
        }),
      );
    });

    it('throws UnauthorizedException for wrong password', async () => {
      const bcrypt = require('bcrypt');
      bcrypt.compare.mockResolvedValue(false);
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        roles: [],
        directPermissions: [],
      });

      await expect(service.login('user@test.com', 'wrong')).rejects.toThrow(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException for non-existent user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.login('nonexistent@test.com', 'any')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for disabled user', async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, status: 'DISABLED' });

      await expect(service.login('user@test.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    it('returns same message whether user exists or not', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      const result = await service.forgotPassword('maybe@test.com');
      expect(result.message).toContain('If an account exists');
    });

    it('sets reset token and sends email when user exists', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(undefined);

      const result = await service.forgotPassword('user@test.com');

      expect(result.message).toContain('If an account exists');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            passwordResetToken: expect.any(String),
            passwordResetExpiresAt: expect.any(Date),
          }),
        }),
      );
      expect(emailQueue.enqueuePasswordReset).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockUser.email,
          name: mockUser.name,
          resetLink: expect.stringContaining('/reset-password'),
        }),
      );
    });
  });

  describe('resetPassword', () => {
    it('resets password for valid token', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(undefined);

      const result = await service.resetPassword('valid-token-abc', 'newpassword123');

      expect(result.message).toContain('password has been reset');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
          data: expect.objectContaining({
            passwordHash: 'hashed-password',
            passwordResetToken: null,
            passwordResetExpiresAt: null,
          }),
        }),
      );
    });

    it('throws BadRequestException for empty token', async () => {
      await expect(service.resetPassword('', 'newpass123')).rejects.toThrow(BadRequestException);
      await expect(service.resetPassword('   ', 'newpass123')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for short password', async () => {
      await expect(service.resetPassword('valid-token', 'short')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for invalid or expired token', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.resetPassword('invalid-token', 'newpassword123'),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });
});
