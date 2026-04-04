import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        `Category with slug "${dto.slug}" already exists`,
      );
    }
    if (dto.parentId) {
      await this.validateParentId(dto.parentId);
    }
    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        bannerImageUrl: dto.bannerImageUrl ?? null,
        showOnLanding: dto.showOnLanding ?? false,
        landingOrder: dto.landingOrder ?? null,
        parentId: dto.parentId ?? null,
      },
    });
  }

  async findAll(search?: string): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      bannerImageUrl: string | null;
      showOnLanding: boolean;
      landingOrder: number | null;
      parentId: string | null;
      createdAt: Date;
      updatedAt: Date;
      productCount?: number;
    }>
  > {
    const where = search?.trim()
      ? {
          OR: [
            { name: { contains: search.trim(), mode: 'insensitive' as const } },
            {
              description: {
                contains: search.trim(),
                mode: 'insensitive' as const,
              },
            },
          ],
        }
      : undefined;
    const categories = await this.prisma.category.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { productCategories: true } },
      },
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      bannerImageUrl: c.bannerImageUrl,
      showOnLanding: c.showOnLanding,
      landingOrder: c.landingOrder,
      parentId: c.parentId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      productCount: c._count.productCategories,
    }));
  }

  /** Public: categories to show on storefront landing, with banner and product count. */
  async findLandingCategories(): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      bannerImageUrl: string | null;
      landingOrder: number | null;
      productCount: number;
    }>
  > {
    const categories = await this.prisma.category.findMany({
      where: { showOnLanding: true },
      orderBy: [{ landingOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { productCategories: true } } },
    });
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      bannerImageUrl: c.bannerImageUrl,
      landingOrder: c.landingOrder,
      productCount: c._count.productCategories,
    }));
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: { select: { productCategories: true } },
        parent: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }
    const { parent, _count, ...rest } = category;
    return {
      ...rest,
      productCount: _count.productCategories,
      parent: parent
        ? { id: parent.id, name: parent.name, slug: parent.slug }
        : null,
    };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }
    if (dto.slug !== undefined && dto.slug !== category.slug) {
      const existing = await this.prisma.category.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException(
          `Category with slug "${dto.slug}" already exists`,
        );
      }
    }
    if (dto.parentId !== undefined && dto.parentId !== null) {
      await this.validateParentId(dto.parentId, id);
    }

    const data = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.bannerImageUrl !== undefined && {
        bannerImageUrl: dto.bannerImageUrl,
      }),
      ...(dto.showOnLanding !== undefined && {
        showOnLanding: dto.showOnLanding,
      }),
      ...(dto.landingOrder !== undefined && {
        landingOrder: dto.landingOrder,
      }),
      ...(dto.parentId !== undefined && { parentId: dto.parentId }),
    };
    const hasCategoryFields = Object.keys(data).length > 0;

    if (dto.productIds !== undefined) {
      const uniqueIds = [...new Set(dto.productIds ?? [])].filter(Boolean);
      await this.prisma.$transaction(async (tx) => {
        if (hasCategoryFields) {
          await tx.category.update({
            where: { id },
            data,
          });
        } else {
          await tx.category.findUniqueOrThrow({
            where: { id },
          });
        }
        if (uniqueIds.length) {
          const products = await tx.product.findMany({
            where: { id: { in: uniqueIds } },
            select: { id: true },
          });
          const foundIds = new Set(products.map((p) => p.id));
          const missing = uniqueIds.filter((pid) => !foundIds.has(pid));
          if (missing.length) {
            throw new BadRequestException(
              `Unknown product id(s): ${missing.join(', ')}`,
            );
          }
        }
        await tx.productCategory.deleteMany({ where: { categoryId: id } });
        if (uniqueIds.length) {
          await tx.productCategory.createMany({
            data: uniqueIds.map((productId) => ({ productId, categoryId: id })),
            skipDuplicates: true,
          });
        }
      });
      return this.findOne(id);
    }

    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }
    await this.prisma.category.delete({ where: { id } });
  }

  /**
   * Idempotent: skips duplicate (productId, categoryId) pairs.
   * Returns count of rows inserted (may be less than requested when duplicates exist).
   */
  async attachProducts(
    categoryId: string,
    productIds: string[],
  ): Promise<{ attached: number }> {
    await this.ensureCategoryExists(categoryId);
    const uniqueIds = [...new Set(productIds)].filter(Boolean);
    if (!uniqueIds.length) {
      return { attached: 0 };
    }
    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const foundIds = new Set(products.map((p) => p.id));
    const missing = uniqueIds.filter((id) => !foundIds.has(id));
    if (missing.length) {
      throw new BadRequestException(
        `Unknown product id(s): ${missing.join(', ')}`,
      );
    }
    const result = await this.prisma.productCategory.createMany({
      data: uniqueIds.map((productId) => ({ productId, categoryId })),
      skipDuplicates: true,
    });
    return { attached: result.count };
  }

  async detachProducts(
    categoryId: string,
    productIds: string[],
  ): Promise<{ detached: number }> {
    await this.ensureCategoryExists(categoryId);
    const uniqueIds = [...new Set(productIds)].filter(Boolean);
    if (!uniqueIds.length) {
      return { detached: 0 };
    }
    const result = await this.prisma.productCategory.deleteMany({
      where: {
        categoryId,
        productId: { in: uniqueIds },
      },
    });
    return { detached: result.count };
  }

  private async ensureCategoryExists(id: string): Promise<void> {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }
  }

  private async validateParentId(
    parentId: string,
    excludeId?: string,
  ): Promise<void> {
    if (excludeId && parentId === excludeId) {
      throw new BadRequestException('Category cannot be its own parent');
    }
    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      throw new BadRequestException(
        `Parent category with id "${parentId}" not found`,
      );
    }
  }
}
