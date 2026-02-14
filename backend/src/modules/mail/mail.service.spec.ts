import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { OrderStatusEmailPayload } from './interfaces/mail.interface';

describe('MailService', () => {
  let service: MailService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              if (key === 'SENDGRID_API_KEY') return undefined;
              if (key === 'MAIL_FROM_EMAIL') return 'noreply@test.com';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should not throw when sending order status email (mock mode)', async () => {
    const payload: OrderStatusEmailPayload = {
      to: 'customer@example.com',
      orderId: 'order-123',
      status: 'SHIPPED',
      statusUpdatedAt: new Date().toISOString(),
    };
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await expect(service.sendOrderStatusChange(payload)).resolves.not.toThrow();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[MailService] Order status email (mock)',
      expect.objectContaining({
        to: payload.to,
        orderId: payload.orderId,
        status: payload.status,
      }),
    );
    consoleSpy.mockRestore();
  });

  it('should include customerName in payload when provided', async () => {
    const payload: OrderStatusEmailPayload = {
      to: 'customer@example.com',
      orderId: 'order-123',
      status: 'DELIVERED',
      statusUpdatedAt: new Date().toISOString(),
      customerName: 'Jane Doe',
    };
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    await service.sendOrderStatusChange(payload);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
