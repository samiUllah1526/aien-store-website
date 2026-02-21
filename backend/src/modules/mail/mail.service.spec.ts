import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from './mail.service';
import {
  OrderStatusEmailPayload,
  OrderConfirmationEmailPayload,
  WelcomeEmailPayload,
  UserCreatedEmailPayload,
  PasswordResetEmailPayload,
} from './interfaces/mail.interface';
import { MAIL_TRANSPORT } from './constants';

describe('MailService', () => {
  let service: MailService;
  let transportSend: jest.Mock;

  beforeEach(async () => {
    transportSend = jest.fn().mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'MAIL_FROM_EMAIL') return 'noreply@test.com';
              if (key === 'MAIL_FROM_NAME') return 'Test Store';
              return defaultValue;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: { emailLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }) } },
        },
        {
          provide: MAIL_TRANSPORT,
          useValue: { send: transportSend },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('sends order status change', async () => {
    const payload: OrderStatusEmailPayload = {
      to: 'customer@example.com',
      orderId: 'order-123',
      status: 'SHIPPED',
      statusUpdatedAt: new Date().toISOString(),
    };
    await expect(service.sendOrderStatusChange(payload)).resolves.not.toThrow();
    expect(transportSend).toHaveBeenCalledTimes(1);
    expect(transportSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: payload.to,
        from: 'noreply@test.com',
        subject: expect.stringContaining('order-123'),
        text: expect.any(String),
        html: expect.any(String),
      }),
    );
  });

  it('includes customerName in order status content when provided', async () => {
    const payload: OrderStatusEmailPayload = {
      to: 'customer@example.com',
      orderId: 'order-123',
      status: 'DELIVERED',
      statusUpdatedAt: new Date().toISOString(),
      customerName: 'Jane Doe',
    };
    await service.sendOrderStatusChange(payload);
    const call = transportSend.mock.calls[0][0];
    expect(call.text).toContain('Jane Doe');
    expect(call.html).toContain('Jane Doe');
  });

  it('throws when transport fails', async () => {
    transportSend.mockRejectedValueOnce(new Error('Brevo 401'));
    await expect(
      service.sendOrderStatusChange({
        to: 'c@ex.com',
        orderId: 'o1',
        status: 'SHIPPED',
        statusUpdatedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow('Brevo 401');
  });

  it('sends order confirmation', async () => {
    const payload: OrderConfirmationEmailPayload = {
      to: 'customer@example.com',
      orderId: 'ord-456',
      totalCents: 5299,
      currency: 'PKR',
      orderDate: '2025-01-15',
      items: [{ productName: 'Widget', quantity: 2, unitCents: 2500 }],
    };
    const logId = await service.sendOrderConfirmation(payload);
    expect(logId).toBeDefined();
    expect(transportSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: payload.to,
        from: 'noreply@test.com',
        subject: expect.stringContaining('ord-456'),
        text: expect.any(String),
        html: expect.any(String),
      }),
    );
  });

  it('sends welcome email', async () => {
    const payload: WelcomeEmailPayload = { to: 'new@user.com', name: 'New User' };
    await service.sendWelcome(payload);
    expect(transportSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: payload.to,
        subject: expect.stringContaining('Welcome'),
        text: expect.stringContaining('New User'),
      }),
    );
  });

  it('sends user-created email', async () => {
    const payload: UserCreatedEmailPayload = { to: 'staff@co.com', name: 'Staff' };
    await service.sendUserCreated(payload);
    expect(transportSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: payload.to,
        subject: expect.stringContaining('account has been created'),
        text: expect.any(String),
      }),
    );
  });

  it('sends password reset email', async () => {
    const payload: PasswordResetEmailPayload = {
      to: 'user@ex.com',
      name: 'User',
      resetLink: 'https://app.com/reset?token=abc123',
    };
    await service.sendPasswordReset(payload);
    const call = transportSend.mock.calls[0][0];
    expect(call.to).toBe(payload.to);
    expect(call.subject).toContain('Reset');
    expect(call.html).toContain('https://app.com/reset');
  });
});
