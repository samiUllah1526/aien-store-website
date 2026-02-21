import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { FavoritesService } from './favorites.service';

const userId = '11111111-1111-1111-1111-111111111111';
const productId = '22222222-2222-2222-2222-222222222222';

describe('FavoritesService', () => {
  let service: FavoritesService;
  let prisma: {
    product: { findUnique: jest.Mock };
    userFavorite: { upsert: jest.Mock; deleteMany: jest.Mock; findMany: jest.Mock; findUnique: jest.Mock };
  };
  let productsService: { findByIds: jest.Mock };

  beforeEach(async () => {
    prisma = {
      product: { findUnique: jest.fn() },
      userFavorite: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    productsService = { findByIds: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
  });

  describe('add', () => {
    it('adds product to favorites', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: productId });
      prisma.userFavorite.upsert.mockResolvedValue({});

      const result = await service.add(userId, productId);

      expect(result).toEqual({ added: true });
      expect(prisma.userFavorite.upsert).toHaveBeenCalledWith({
        where: { userId_productId: { userId, productId } },
        create: { userId, productId },
        update: {},
      });
    });

    it('throws NotFoundException when product not found', async () => {
      prisma.product.findUnique.mockResolvedValue(null);

      await expect(service.add(userId, 'missing-product')).rejects.toThrow(NotFoundException);
      expect(prisma.userFavorite.upsert).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('returns removed: true when favorite existed', async () => {
      prisma.userFavorite.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.remove(userId, productId);

      expect(result).toEqual({ removed: true });
    });

    it('returns removed: false when no favorite to delete', async () => {
      prisma.userFavorite.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.remove(userId, productId);

      expect(result).toEqual({ removed: false });
    });
  });

  describe('getProductIds', () => {
    it('returns product ids ordered by createdAt desc', async () => {
      prisma.userFavorite.findMany.mockResolvedValue([
        { productId: 'p1' },
        { productId: 'p2' },
      ]);

      const result = await service.getProductIds(userId);

      expect(result).toEqual(['p1', 'p2']);
    });
  });

  describe('getFavoriteProducts', () => {
    it('returns empty array when no favorites', async () => {
      prisma.userFavorite.findMany.mockResolvedValue([]);

      const result = await service.getFavoriteProducts(userId);

      expect(result).toEqual([]);
      expect(productsService.findByIds).not.toHaveBeenCalled();
    });

    it('returns products from ProductsService when favorites exist', async () => {
      prisma.userFavorite.findMany.mockResolvedValue([{ productId }]);
      productsService.findByIds.mockResolvedValue([{ id: productId, name: 'Widget' }]);

      const result = await service.getFavoriteProducts(userId);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Widget');
      expect(productsService.findByIds).toHaveBeenCalledWith([productId]);
    });
  });

  describe('isFavorite', () => {
    it('returns true when favorite exists', async () => {
      prisma.userFavorite.findUnique.mockResolvedValue({ productId });

      const result = await service.isFavorite(userId, productId);

      expect(result).toBe(true);
    });

    it('returns false when favorite does not exist', async () => {
      prisma.userFavorite.findUnique.mockResolvedValue(null);

      const result = await service.isFavorite(userId, productId);

      expect(result).toBe(false);
    });
  });
});
