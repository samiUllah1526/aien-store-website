import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfileService } from './profile.service';

const userId = '11111111-1111-1111-1111-111111111111';

const mockSavedShipping = {
  userId,
  firstName: 'John',
  lastName: 'Doe',
  customerPhone: '+1234567890',
  shippingCountry: 'PK',
  shippingAddressLine1: '123 Main St',
  shippingAddressLine2: 'Apt 4',
  shippingCity: 'Lahore',
  shippingPostalCode: '54000',
};

describe('ProfileService', () => {
  let service: ProfileService;
  let prisma: { userSavedShipping: { findUnique: jest.Mock; upsert: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      userSavedShipping: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  describe('getSavedShipping', () => {
    it('returns null when no saved shipping', async () => {
      prisma.userSavedShipping.findUnique.mockResolvedValue(null);

      const result = await service.getSavedShipping(userId);

      expect(result).toBeNull();
    });

    it('returns DTO when saved shipping exists', async () => {
      prisma.userSavedShipping.findUnique.mockResolvedValue(mockSavedShipping);

      const result = await service.getSavedShipping(userId);

      expect(result).toEqual({
        firstName: 'John',
        lastName: 'Doe',
        customerPhone: '+1234567890',
        shippingCountry: 'PK',
        shippingAddressLine1: '123 Main St',
        shippingAddressLine2: 'Apt 4',
        shippingCity: 'Lahore',
        shippingPostalCode: '54000',
      });
    });
  });

  describe('saveShipping', () => {
    it('creates new record when none exists', async () => {
      prisma.userSavedShipping.upsert.mockResolvedValue(mockSavedShipping);

      const result = await service.saveShipping(userId, {
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.firstName).toBe('John');
      expect(prisma.userSavedShipping.upsert).toHaveBeenCalledWith({
        where: { userId },
        create: expect.objectContaining({ userId, firstName: 'John', lastName: 'Doe' }),
        update: expect.any(Object),
      });
    });

    it('trims whitespace and converts empty strings to null', async () => {
      prisma.userSavedShipping.upsert.mockImplementation(({ create }) =>
        Promise.resolve({ ...mockSavedShipping, ...create }),
      );

      await service.saveShipping(userId, {
        firstName: '  Jane  ',
        lastName: '',
        customerPhone: ' ',
      });

      expect(prisma.userSavedShipping.upsert).toHaveBeenCalledWith({
        where: { userId },
        create: expect.objectContaining({
          firstName: 'Jane',
          lastName: null,
          customerPhone: null,
        }),
        update: expect.objectContaining({
          firstName: 'Jane',
          lastName: null,
          customerPhone: null,
        }),
      });
    });
  });
});
