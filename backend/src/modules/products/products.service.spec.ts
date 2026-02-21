import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';

const mockProduct = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Test Product',
  slug: 'test-product',
  description: 'Desc',
  priceCents: 4200,
  currency: 'PKR',
  sizes: ['S', 'M', 'L'],
  featured: false,
  urduVerse: null,
  urduVerseTransliteration: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  productCategories: [],
  productMedia: [{ media: { path: 'products/abc.jpg' } }],
};

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    media: { findMany: jest.Mock };
    productMedia: { createMany: jest.Mock; deleteMany: jest.Mock };
    productCategory: { deleteMany: jest.Mock; createMany: jest.Mock };
    category: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      media: { findMany: jest.fn() },
      productMedia: { createMany: jest.fn(), deleteMany: jest.fn() },
      productCategory: { deleteMany: jest.fn(), createMany: jest.fn() },
      category: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('create', () => {
    it('creates product and returns DTO', async () => {
      const dto: CreateProductDto = {
        name: 'Test Product',
        slug: 'test-product',
        priceCents: 4200,
      };
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({ ...mockProduct, id: mockProduct.id });
      prisma.product.findUniqueOrThrow.mockResolvedValue(mockProduct);

      const result = await service.create(dto);

      expect(result).toMatchObject({
        id: mockProduct.id,
        name: mockProduct.name,
        slug: mockProduct.slug,
        price: 4200,
        currency: 'PKR',
        sizes: ['S', 'M', 'L'],
      });
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: dto.name,
            slug: dto.slug,
            priceCents: dto.priceCents,
            currency: 'PKR',
          }),
        }),
      );
    });

    it('throws ConflictException when slug exists', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(
        service.create({ name: 'A', slug: 'existing-slug', priceCents: 100 }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when mediaIds are invalid', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.media.findMany.mockResolvedValue([]);
      await expect(
        service.create({
          name: 'A',
          slug: 'new-slug',
          priceCents: 100,
          mediaIds: ['missing-media-id'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('returns paginated list and total', async () => {
      prisma.product.findMany.mockResolvedValue([mockProduct]);
      prisma.product.count.mockResolvedValue(1);
      const query: ProductQueryDto = { page: 1, limit: 20 };

      const result = await service.findAll(query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0]).toMatchObject({
        id: mockProduct.id,
        name: mockProduct.name,
        price: 4200,
        image: '/media/file/products/abc.jpg',
      });
    });

    it('applies search, sort, and filters in where', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);
      await service.findAll({
        search: 'tee',
        categoryId: 'cat-id',
        sortBy: 'name',
        sortOrder: 'asc',
        minPriceCents: 1000,
        maxPriceCents: 5000,
        featured: 'true',
      });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
            productCategories: { some: { categoryId: 'cat-id' } },
            priceCents: { gte: 1000, lte: 5000 },
            featured: true,
          }),
          orderBy: { name: 'asc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns product by id', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      const result = await service.findOne(mockProduct.id);
      expect(result.id).toBe(mockProduct.id);
      expect(prisma.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: mockProduct.id } }),
      );
    });

    it('throws NotFoundException when not found', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByIds', () => {
    it('returns empty array when ids empty', async () => {
      const result = await service.findByIds([]);
      expect(result).toEqual([]);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });

    it('returns products in input order and skips missing ids', async () => {
      const p1 = { ...mockProduct, id: 'a' };
      const p2 = { ...mockProduct, id: 'b' };
      prisma.product.findMany.mockResolvedValue([p2, p1]);

      const result = await service.findByIds(['a', 'b', 'missing']);

      expect(result.map((r) => r.id)).toEqual(['a', 'b']);
    });
  });

  describe('findBySlug', () => {
    it('returns product by slug', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      const result = await service.findBySlug('test-product');
      expect(result.slug).toBe('test-product');
    });

    it('throws NotFoundException when slug not found', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.findBySlug('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates and returns product', async () => {
      const dto: UpdateProductDto = { name: 'Updated Name', priceCents: 5000 };
      prisma.product.findUnique
        .mockResolvedValueOnce({ id: mockProduct.id, slug: mockProduct.slug })
        .mockResolvedValueOnce(null);
      prisma.product.update.mockResolvedValue({ ...mockProduct, ...dto });
      prisma.product.findUniqueOrThrow.mockResolvedValue({ ...mockProduct, ...dto });

      const result = await service.update(mockProduct.id, dto);
      expect(result.name).toBe('Updated Name');
      expect(result.price).toBe(5000);
    });

    it('throws NotFoundException when product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(
        service.update('missing', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when new slug already exists', async () => {
      prisma.product.findUnique
        .mockResolvedValueOnce({ id: mockProduct.id, slug: 'old-slug' })
        .mockResolvedValueOnce({ id: 'other' });
      await expect(
        service.update(mockProduct.id, { slug: 'taken-slug' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deletes product', async () => {
      prisma.product.findUnique.mockResolvedValue(mockProduct);
      prisma.product.delete.mockResolvedValue(mockProduct);
      await service.remove(mockProduct.id);
      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: mockProduct.id } });
    });

    it('throws NotFoundException when product does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });
  });
});
