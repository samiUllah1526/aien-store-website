import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
    if (dto.sizeGuideMediaId) {
      await this.validateMediaId(dto.sizeGuideMediaId);
    }
    return this.mapCategory(
      await this.prisma.category.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          description: dto.description ?? null,
          highlights: dto.highlights ?? [],
          bannerImageUrl: dto.bannerImageUrl ?? null,
          sizeGuideMediaId: dto.sizeGuideMediaId ?? null,
          showOnLanding: dto.showOnLanding ?? false,
          landingOrder: dto.landingOrder ?? null,
          parentId: dto.parentId ?? null,
        },
        include: {
          sizeGuideMedia: {
            select: { id: true, path: true, deliveryUrl: true },
          },
          _count: { select: { productCategories: true } },
        },
      }),
    );
  }

  async findAll(search?: string): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      highlights: string[];
      bannerImageUrl: string | null;
      sizeGuideMediaId: string | null;
      sizeGuideUrl: string | null;
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
        sizeGuideMedia: {
          select: { id: true, path: true, deliveryUrl: true },
        },
        _count: { select: { productCategories: true } },
      },
    });
    return categories.map((c) => this.mapCategory(c));
  }

  /** Public: categories to show on storefront landing, with banner and product count. */
  async findLandingCategories(): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      description: string | null;
      highlights: string[];
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
      highlights: c.highlights,
      bannerImageUrl: c.bannerImageUrl,
      landingOrder: c.landingOrder,
      productCount: c._count.productCategories,
    }));
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        sizeGuideMedia: {
          select: { id: true, path: true, deliveryUrl: true },
        },
        _count: { select: { productCategories: true } },
        parent: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!category) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }
    const { parent, ...rest } = category;
    return {
      ...this.mapCategory(rest),
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
    if (dto.sizeGuideMediaId) {
      await this.validateMediaId(dto.sizeGuideMediaId);
    }

    const data = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.slug !== undefined && { slug: dto.slug }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.highlights !== undefined && { highlights: dto.highlights }),
      ...(dto.bannerImageUrl !== undefined && {
        bannerImageUrl: dto.bannerImageUrl,
      }),
      ...(dto.sizeGuideMediaId !== undefined && {
        sizeGuideMediaId: dto.sizeGuideMediaId,
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

    if (!hasCategoryFields) {
      return this.findOne(id);
    }

    await this.prisma.category.update({
      where: { id },
      data,
    });
    return this.findOne(id);
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

  private async validateMediaId(mediaId: string): Promise<void> {
    const found = await this.prisma.media.findFirst({
      where: {
        id: mediaId,
        uploadError: { equals: Prisma.DbNull },
      },
      select: { id: true },
    });
    if (!found) {
      throw new BadRequestException(`Media not found: ${mediaId}`);
    }
  }

  private mediaUrl(media: {
    path: string;
    deliveryUrl: string | null;
  }): string {
    if (media.deliveryUrl) return media.deliveryUrl;
    if (media.path.startsWith('http')) return media.path;
    return `/media/file/${media.path}`;
  }

  private mapCategory(c: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    highlights: string[];
    bannerImageUrl: string | null;
    sizeGuideMediaId?: string | null;
    showOnLanding: boolean;
    landingOrder: number | null;
    parentId: string | null;
    createdAt: Date;
    updatedAt: Date;
    sizeGuideMedia?: {
      id: string;
      path: string;
      deliveryUrl: string | null;
    } | null;
    _count?: { productCategories: number };
  }) {
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      highlights: c.highlights,
      bannerImageUrl: c.bannerImageUrl,
      sizeGuideMediaId: c.sizeGuideMediaId ?? null,
      sizeGuideUrl: c.sizeGuideMedia ? this.mediaUrl(c.sizeGuideMedia) : null,
      showOnLanding: c.showOnLanding,
      landingOrder: c.landingOrder,
      parentId: c.parentId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      productCount: c._count?.productCategories,
    };
  }
}
