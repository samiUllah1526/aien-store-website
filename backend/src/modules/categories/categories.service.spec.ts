import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const categoryId = '11111111-1111-1111-1111-111111111111';

const mockCategory = {
  id: categoryId,
  name: 'Electronics',
  slug: 'electronics',
  description: 'Electronic items',
  parentId: null as string | null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    $transaction: jest.Mock;
    category: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    product: {
      findMany: jest.Mock;
    };
    productCategory: {
      createMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (cb: (tx: typeof prisma) => Promise<unknown>) =>
        cb(prisma),
      ),
      category: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
      },
      productCategory: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('create', () => {
    it('creates category and returns it', async () => {
      const dto: CreateCategoryDto = {
        name: 'Electronics',
        slug: 'electronics',
      };
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue(mockCategory);

      const result = await service.create(dto);

      expect(result).toMatchObject({ name: dto.name, slug: dto.slug });
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: dto.name, slug: dto.slug }),
      });
    });

    it('throws ConflictException when slug exists', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.create({ name: 'Electronics', slug: 'existing-slug' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when parentId not found', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(
        service.create({
          name: 'Sub',
          slug: 'sub',
          parentId: 'missing-parent',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('returns categories with productCount', async () => {
      prisma.category.findMany.mockResolvedValue([
        { ...mockCategory, _count: { productCategories: 5 } },
      ]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: mockCategory.name,
        productCount: 5,
      });
    });

    it('applies search filter when provided', async () => {
      prisma.category.findMany.mockResolvedValue([]);
      await service.findAll('electronics');

      expect(prisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'electronics', mode: 'insensitive' } },
              { description: { contains: 'electronics', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns category with parent and productCount', async () => {
      prisma.category.findUnique.mockResolvedValue({
        ...mockCategory,
        _count: { productCategories: 3 },
        parent: null,
      });

      const result = await service.findOne(categoryId);

      expect(result.id).toBe(categoryId);
      expect(result.productCount).toBe(3);
    });

    it('throws NotFoundException when not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('updates and returns category', async () => {
      const dto: UpdateCategoryDto = { name: 'Updated Name' };
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.category.update.mockResolvedValue({ ...mockCategory, ...dto });

      const result = await service.update(categoryId, dto);

      expect(result.name).toBe('Updated Name');
    });

    it('throws NotFoundException when not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ConflictException when new slug exists', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({ ...mockCategory, slug: 'old-slug' })
        .mockResolvedValueOnce({ id: 'other' });

      await expect(
        service.update(categoryId, { slug: 'taken-slug' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException when category is its own parent', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);

      await expect(
        service.update(categoryId, { parentId: categoryId }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when parentId not found', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce(null);

      await expect(
        service.update(categoryId, { parentId: 'missing-parent' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('syncs product membership in a transaction when productIds is set', async () => {
      const productId = '22222222-2222-2222-2222-222222222222';
      const dto: UpdateCategoryDto = {
        name: 'Renamed',
        productIds: [productId],
      };
      prisma.category.findUnique
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce({
          ...mockCategory,
          name: 'Renamed',
          _count: { productCategories: 1 },
          parent: null,
        });
      prisma.product.findMany.mockResolvedValue([{ id: productId }]);
      prisma.category.update.mockResolvedValue({ ...mockCategory, name: 'Renamed' });
      prisma.productCategory.deleteMany.mockResolvedValue({ count: 1 });
      prisma.productCategory.createMany.mockResolvedValue({ count: 1 });

      const result = await service.update(categoryId, dto);

      expect(result.name).toBe('Renamed');
      expect(result.productCount).toBe(1);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.productCategory.deleteMany).toHaveBeenCalledWith({
        where: { categoryId },
      });
      expect(prisma.productCategory.createMany).toHaveBeenCalledWith({
        data: [{ productId, categoryId }],
        skipDuplicates: true,
      });
    });

    it('clears all products when productIds is empty array', async () => {
      const dto: UpdateCategoryDto = { productIds: [] };
      prisma.category.findUnique
        .mockResolvedValueOnce(mockCategory)
        .mockResolvedValueOnce({
          ...mockCategory,
          _count: { productCategories: 0 },
          parent: null,
        });
      prisma.category.findUniqueOrThrow.mockResolvedValue(mockCategory);
      prisma.productCategory.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.update(categoryId, dto);

      expect(result.productCount).toBe(0);
      expect(prisma.category.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: categoryId },
      });
      expect(prisma.productCategory.deleteMany).toHaveBeenCalledWith({
        where: { categoryId },
      });
      expect(prisma.productCategory.createMany).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when productIds contains unknown id', async () => {
      const productId = '22222222-2222-2222-2222-222222222222';
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.product.findMany.mockResolvedValue([]);

      await expect(
        service.update(categoryId, { name: 'X', productIds: [productId] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deletes category', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.category.delete.mockResolvedValue(mockCategory);

      await service.remove(categoryId);

      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: categoryId },
      });
    });

    it('throws NotFoundException when not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });
  });

  describe('attachProducts', () => {
    const productId = '22222222-2222-2222-2222-222222222222';

    it('throws NotFoundException when category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.attachProducts(categoryId, [productId]),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when a product id is unknown', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: categoryId });
      prisma.product.findMany.mockResolvedValue([]);

      await expect(
        service.attachProducts(categoryId, [productId]),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.productCategory.createMany).not.toHaveBeenCalled();
    });

    it('creates product category links and returns count', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: categoryId });
      prisma.product.findMany.mockResolvedValue([{ id: productId }]);
      prisma.productCategory.createMany.mockResolvedValue({ count: 1 });

      const result = await service.attachProducts(categoryId, [productId]);

      expect(result).toEqual({ attached: 1 });
      expect(prisma.productCategory.createMany).toHaveBeenCalledWith({
        data: [{ productId, categoryId }],
        skipDuplicates: true,
      });
    });

    it('returns attached 0 when productIds is empty', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: categoryId });

      const result = await service.attachProducts(categoryId, []);

      expect(result).toEqual({ attached: 0 });
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });
  });

  describe('detachProducts', () => {
    const productId = '22222222-2222-2222-2222-222222222222';

    it('throws NotFoundException when category does not exist', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(
        service.detachProducts(categoryId, [productId]),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.productCategory.deleteMany).not.toHaveBeenCalled();
    });

    it('deletes links and returns count', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: categoryId });
      prisma.productCategory.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.detachProducts(categoryId, [productId]);

      expect(result).toEqual({ detached: 1 });
      expect(prisma.productCategory.deleteMany).toHaveBeenCalledWith({
        where: {
          categoryId,
          productId: { in: [productId] },
        },
      });
    });

    it('returns detached 0 when productIds is empty', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: categoryId });

      const result = await service.detachProducts(categoryId, []);

      expect(result).toEqual({ detached: 0 });
      expect(prisma.productCategory.deleteMany).not.toHaveBeenCalled();
    });
  });
});
