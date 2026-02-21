import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { EmailLogsService } from './email-logs.service';

const logId = '11111111-1111-1111-1111-111111111111';
const orderId = '22222222-2222-2222-2222-222222222222';

const mockFailedLog = {
  id: logId,
  type: 'order-status-change',
  to: 'user@test.com',
  subject: 'Order status',
  status: 'failed',
  error: null,
  content: null,
  metadata: { orderId, status: 'SHIPPED' },
  resentLogId: null,
  createdAt: new Date('2025-01-01'),
};

describe('EmailLogsService', () => {
  let service: EmailLogsService;
  let prisma: {
    emailLog: { findUnique: jest.Mock; findMany: jest.Mock; count: jest.Mock; update: jest.Mock };
    order: { findUnique: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let mail: { sendOrderStatusChange: jest.Mock };

  beforeEach(async () => {
    prisma = {
      emailLog: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      order: { findUnique: jest.fn() },
      $queryRaw: jest.fn(),
    };
    mail = { sendOrderStatusChange: jest.fn().mockResolvedValue('new-log-id') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailLogsService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get<EmailLogsService>(EmailLogsService);
  });

  describe('findOne', () => {
    it('returns log with ISO createdAt', async () => {
      prisma.emailLog.findUnique.mockResolvedValue(mockFailedLog);

      const result = await service.findOne(logId);

      expect(result.id).toBe(logId);
      expect(result.type).toBe('order-status-change');
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('throws NotFoundException when not found', async () => {
      prisma.emailLog.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('returns paginated logs', async () => {
      prisma.emailLog.findMany.mockResolvedValue([mockFailedLog]);
      prisma.emailLog.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('returns empty when orderId filter matches no logs', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.findAll({ orderId: 'non-existent' });

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(prisma.emailLog.findMany).not.toHaveBeenCalled();
    });
  });

  describe('resend', () => {
    it('resends failed order-status-change and updates resentLogId', async () => {
      prisma.emailLog.findUnique.mockResolvedValue(mockFailedLog);
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        customerEmail: 'user@test.com',
        customerName: null,
        totalCents: 5000,
        currency: 'PKR',
        createdAt: new Date('2025-01-01'),
        statusHistory: [{ createdAt: new Date('2025-01-01') }],
      });
      prisma.emailLog.update.mockResolvedValue({});

      const result = await service.resend(logId);

      expect(result.success).toBe(true);
      expect(mail.sendOrderStatusChange).toHaveBeenCalled();
      expect(prisma.emailLog.update).toHaveBeenCalledWith({
        where: { id: logId },
        data: { resentLogId: 'new-log-id' },
      });
    });

    it('throws NotFoundException when log not found', async () => {
      prisma.emailLog.findUnique.mockResolvedValue(null);

      await expect(service.resend('missing')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when status is not failed', async () => {
      prisma.emailLog.findUnique.mockResolvedValue({ ...mockFailedLog, status: 'sent' });

      await expect(service.resend(logId)).rejects.toThrow('Only failed emails can be resent');
    });

    it('throws BadRequestException when already resent', async () => {
      prisma.emailLog.findUnique.mockResolvedValue({
        ...mockFailedLog,
        resentLogId: 'already-resent-id',
      });

      await expect(service.resend(logId)).rejects.toThrow('already been resent');
    });

    it('throws BadRequestException for unsupported type', async () => {
      prisma.emailLog.findUnique.mockResolvedValue({
        ...mockFailedLog,
        type: 'unknown-type',
      });

      await expect(service.resend(logId)).rejects.toThrow(BadRequestException);
    });
  });
});
