import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from './mail.service';
import { OrderStatusEmailPayload } from './interfaces/mail.interface';
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
          useValue: { emailLog: { create: jest.fn().mockResolvedValue({}) } },
        },
        {
          provide: MAIL_TRANSPORT,
          useValue: { send: transportSend },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call transport.send with order status email', async () => {
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

  it('should include customerName in built content when provided', async () => {
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

  it('should not throw when transport fails', async () => {
    transportSend.mockRejectedValueOnce(new Error('Brevo 401'));
    const payload: OrderStatusEmailPayload = {
      to: 'customer@example.com',
      orderId: 'order-123',
      status: 'SHIPPED',
      statusUpdatedAt: new Date().toISOString(),
    };
    await expect(service.sendOrderStatusChange(payload)).resolves.not.toThrow();
  });
});
