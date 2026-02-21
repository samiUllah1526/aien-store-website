import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;
  let prisma: {
    siteSetting: { findUnique: jest.Mock; findMany: jest.Mock; upsert: jest.Mock };
    media: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      siteSetting: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      media: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  describe('getByKey', () => {
    it('returns null when key not found', async () => {
      prisma.siteSetting.findUnique.mockResolvedValue(null);

      const result = await service.getByKey('missing');

      expect(result).toBeNull();
    });

    it('returns value when found', async () => {
      prisma.siteSetting.findUnique.mockResolvedValue({ key: 'general', value: { logoMediaId: 'm1' } });

      const result = await service.getByKey('general');

      expect(result).toEqual({ logoMediaId: 'm1' });
    });
  });

  describe('getAll', () => {
    it('returns empty object when no settings', async () => {
      prisma.siteSetting.findMany.mockResolvedValue([]);

      const result = await service.getAll();

      expect(result).toEqual({});
    });

    it('returns keyed map of values', async () => {
      prisma.siteSetting.findMany.mockResolvedValue([
        { key: 'general', value: { logoMediaId: 'm1' } },
        { key: 'about', value: { title: 'About' } },
      ]);

      const result = await service.getAll();

      expect(result).toEqual({
        general: { logoMediaId: 'm1' },
        about: { title: 'About' },
      });
    });
  });

  describe('set', () => {
    it('calls upsert with key and value', async () => {
      prisma.siteSetting.upsert.mockResolvedValue({});

      await service.set('delivery', { deliveryChargesCents: 500 });

      expect(prisma.siteSetting.upsert).toHaveBeenCalledWith({
        where: { key: 'delivery' },
        create: { key: 'delivery', value: { deliveryChargesCents: 500 } },
        update: { value: { deliveryChargesCents: 500 } },
      });
    });
  });

  describe('getPublic', () => {
    const emptySettings = () => {
      prisma.siteSetting.findUnique.mockResolvedValue(null);
    };

    it('returns defaults when no settings exist', async () => {
      emptySettings();

      const result = await service.getPublic();

      expect(result.logoPath).toBeNull();
      expect(result.deliveryChargesCents).toBe(0);
      expect(result.about).toEqual({});
      expect(result.footer).toEqual({});
      expect(result.social).toEqual({});
      expect(result.banking).toEqual({});
      expect(result.seo).toEqual({});
      expect(result.marketing).toEqual({ enabled: true });
    });

    it('resolves logoPath from media when general has logoMediaId', async () => {
      prisma.siteSetting.findUnique.mockImplementation(({ where }: { where: { key: string } }) =>
        Promise.resolve(where.key === 'general' ? { value: { logoMediaId: 'media-1' } } : null),
      );
      prisma.media.findUnique.mockResolvedValue({ path: '/img/logo.png', deliveryUrl: 'https://cdn/logo.png' });

      const result = await service.getPublic();

      expect(result.logoPath).toBe('https://cdn/logo.png');
    });

    it('returns null logoPath when media not found', async () => {
      prisma.siteSetting.findUnique.mockImplementation(({ where }: { where: { key: string } }) =>
        Promise.resolve(where.key === 'general' ? { value: { logoMediaId: 'missing-media' } } : null),
      );
      prisma.media.findUnique.mockResolvedValue(null);

      const result = await service.getPublic();

      expect(result.logoPath).toBeNull();
    });

    it('uses deliveryChargesCents when valid', async () => {
      prisma.siteSetting.findUnique.mockImplementation(({ where }: { where: { key: string } }) =>
        Promise.resolve(where.key === 'delivery' ? { value: { deliveryChargesCents: 300 } } : null),
      );

      const result = await service.getPublic();

      expect(result.deliveryChargesCents).toBe(300);
    });

    it('defaults deliveryChargesCents to 0 when negative', async () => {
      prisma.siteSetting.findUnique.mockImplementation(({ where }: { where: { key: string } }) =>
        Promise.resolve(where.key === 'delivery' ? { value: { deliveryChargesCents: -100 } } : null),
      );

      const result = await service.getPublic();

      expect(result.deliveryChargesCents).toBe(0);
    });

    it('normalizes marketing GTM format and metaPixelId digits', async () => {
      prisma.siteSetting.findUnique.mockImplementation(({ where }: { where: { key: string } }) =>
        Promise.resolve(
          where.key === 'marketing'
            ? {
                value: {
                  metaPixelId: '123-456-789',
                  googleTagManagerId: 'gtm-abc123',
                  enabled: true,
                },
              }
            : null,
        ),
      );

      const result = await service.getPublic();

      expect(result.marketing.metaPixelId).toBe('123456789');
      expect(result.marketing.googleTagManagerId).toBe('GTM-ABC123');
    });

    it('formats GTM from digits-only input', async () => {
      prisma.siteSetting.findUnique.mockImplementation(({ where }: { where: { key: string } }) =>
        Promise.resolve(where.key === 'marketing' ? { value: { googleTagManagerId: '123456' } } : null),
      );

      const result = await service.getPublic();

      expect(result.marketing.googleTagManagerId).toBe('GTM-123456');
    });
  });
});
