import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
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
  let prisma: { category: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      category: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('create', () => {
    it('creates category and returns it', async () => {
      const dto: CreateCategoryDto = { name: 'Electronics', slug: 'electronics' };
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
        service.create({ name: 'Sub', slug: 'sub', parentId: 'missing-parent' }),
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
      expect(result[0]).toMatchObject({ name: mockCategory.name, productCount: 5 });
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

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
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

      await expect(service.update('missing', { name: 'X' })).rejects.toThrow(NotFoundException);
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
  });

  describe('remove', () => {
    it('deletes category', async () => {
      prisma.category.findUnique.mockResolvedValue(mockCategory);
      prisma.category.delete.mockResolvedValue(mockCategory);

      await service.remove(categoryId);

      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: categoryId } });
    });

    it('throws NotFoundException when not found', async () => {
      prisma.category.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });
  });
});
