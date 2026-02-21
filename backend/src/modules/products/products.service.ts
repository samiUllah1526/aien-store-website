import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { ProductResponseDto, ProductListResponseDto } from './dto/product-response.dto';
import { Prisma } from '@prisma/client';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve category slug to id. */
  private async resolveCategoryId(value: string | undefined | null): Promise<string | null> {
    if (!value || value.trim() === '') return null;
    const trimmed = value.trim();
    if (UUID_REGEX.test(trimmed)) return trimmed;
    const category = await this.prisma.category.findUnique({
      where: { slug: trimmed },
    });
    if (!category) {
      throw new BadRequestException(`Category not found: "${trimmed}" (use a category UUID or slug)`);
    }
    return category.id;
  }

  /** Validate and resolve category IDs; throws if any invalid. */
  private async resolveCategoryIds(ids: string[] | undefined): Promise<string[]> {
    if (!ids?.length) return [];
    const validIds: string[] = [];
    for (const id of ids) {
      const resolved = await this.resolveCategoryId(id);
      if (resolved) validIds.push(resolved);
    }
    return validIds;
  }

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    const existing = await this.prisma.product.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(`Product with slug "${dto.slug}" already exists`);
    }
    if (dto.mediaIds?.length) {
      await this.validateMediaIds(dto.mediaIds);
    }
    const categoryIds = await this.resolveCategoryIds(dto.categoryIds);
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        priceCents: dto.priceCents,
        currency: dto.currency ?? 'PKR',
        sizes: (dto.sizes ?? []) as object,
        featured: dto.featured ?? false,
        urduVerse: dto.urduVerse ?? null,
        urduVerseTransliteration: dto.urduVerseTransliteration ?? null,
        productCategories: categoryIds.length
          ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
      },
      include: this.productInclude(),
    });
    if (dto.mediaIds?.length) {
      await this.attachMedia(product.id, dto.mediaIds);
    }
    return this.toResponseDto(
      await this.prisma.product.findUniqueOrThrow({
        where: { id: product.id },
        include: this.productInclude(),
      }),
    );
  }

  async findAll(
    query: ProductQueryDto,
  ): Promise<{ data: ProductListResponseDto[]; total: number }> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;
    let resolvedCategoryId: string | undefined = query.categoryId;
    if (query.category?.trim()) {
      resolvedCategoryId = await this.resolveCategoryId(query.category.trim()) ?? undefined;
    }
    const where = this.buildWhere(query, resolvedCategoryId);
    // Prisma uses priceCents, not price
    const orderByField = sortBy === 'price' ? 'priceCents' : sortBy;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: this.productInclude(),
        orderBy: { [orderByField]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    const data = items.map((p) => this.toListResponseDto(p));
    return { data, total };
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.productInclude(),
    });
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    return this.toResponseDto(product);
  }

  async findBySlug(slug: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: this.productInclude(),
    });
    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }
    return this.toResponseDto(product);
  }

  /** Find products by IDs; returns in the same order as the input array (missing IDs skipped). */
  async findByIds(ids: string[]): Promise<ProductResponseDto[]> {
    if (!ids?.length) return [];
    const uniqueIds = [...new Set(ids)];
    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueIds } },
      include: this.productInclude(),
    });
    const map = new Map(products.map((p) => [p.id, this.toResponseDto(p)]));
    return ids.filter((id) => map.has(id)).map((id) => map.get(id)!);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    if (dto.slug !== undefined && dto.slug !== product.slug) {
      const existing = await this.prisma.product.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException(`Product with slug "${dto.slug}" already exists`);
      }
    }
    if (dto.mediaIds !== undefined) {
      await this.validateMediaIds(dto.mediaIds);
    }
    if (dto.categoryIds !== undefined) {
      const categoryIds = await this.resolveCategoryIds(dto.categoryIds);
      await this.prisma.productCategory.deleteMany({ where: { productId: id } });
      if (categoryIds.length) {
        await this.prisma.productCategory.createMany({
          data: categoryIds.map((categoryId) => ({ productId: id, categoryId })),
        });
      }
    }
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.priceCents !== undefined && { priceCents: dto.priceCents }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.sizes !== undefined && { sizes: dto.sizes as object }),
        ...(dto.featured !== undefined && { featured: dto.featured }),
        ...(dto.urduVerse !== undefined && { urduVerse: dto.urduVerse }),
        ...(dto.urduVerseTransliteration !== undefined && {
          urduVerseTransliteration: dto.urduVerseTransliteration,
        }),
      },
      include: this.productInclude(),
    });
    if (dto.mediaIds !== undefined) {
      await this.prisma.productMedia.deleteMany({ where: { productId: id } });
      if (dto.mediaIds.length > 0) {
        await this.attachMedia(id, dto.mediaIds);
      }
    }
    return this.toResponseDto(
      await this.prisma.product.findUniqueOrThrow({
        where: { id },
        include: this.productInclude(),
      }),
    );
  }

  async remove(id: string): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with id "${id}" not found`);
    }
    await this.prisma.product.delete({ where: { id } });
  }

  private productInclude() {
    return {
      productCategories: { include: { category: true } },
      productMedia: {
        where: { media: { uploadError: { equals: Prisma.DbNull } } },
        include: { media: { select: { path: true, deliveryUrl: true } } },
        orderBy: { sortOrder: Prisma.SortOrder.asc },
      },
    };
  }

  private buildWhere(query: ProductQueryDto, resolvedCategoryId?: string): Record<string, unknown> {
    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const categoryId = resolvedCategoryId ?? query.categoryId;
    if (categoryId) {
      where.productCategories = { some: { categoryId } };
    }
    if (query.minPriceCents != null || query.maxPriceCents != null) {
      const priceFilter: { gte?: number; lte?: number } = {};
      if (query.minPriceCents != null) priceFilter.gte = query.minPriceCents;
      if (query.maxPriceCents != null) priceFilter.lte = query.maxPriceCents;
      where.priceCents = priceFilter;
    }
    if (query.featured === 'true') where.featured = true;
    if (query.featured === 'false') where.featured = false;
    if (query.stockFilter === 'in_stock') where.stockQuantity = { gt: 0 };
    if (query.stockFilter === 'out_of_stock') where.stockQuantity = 0;
    if (query.stockFilter === 'low_stock') {
      const max = query.lowStockMax ?? 5;
      where.stockQuantity = { gte: 1, lte: max };
    }
    return where;
  }

  private async validateMediaIds(mediaIds: string[]): Promise<void> {
    const found = await this.prisma.media.findMany({
      where: { id: { in: mediaIds }, uploadError: { equals: Prisma.DbNull } },
      select: { id: true },
    });
    const foundSet = new Set(found.map((m) => m.id));
    const missing = mediaIds.filter((id) => !foundSet.has(id));
    if (missing.length) {
      throw new BadRequestException(`Media not found: ${missing.join(', ')}`);
    }
  }

  private async attachMedia(productId: string, mediaIds: string[]): Promise<void> {
    await this.prisma.productMedia.createMany({
      data: mediaIds.map((mediaId, index) => ({
        productId,
        mediaId,
        sortOrder: index,
      })),
      skipDuplicates: true,
    });
  }

  private imageUrl(media: { path: string; deliveryUrl: string | null } | null): string {
    if (!media) return '';
    if (media.deliveryUrl) return media.deliveryUrl;
    if (media.path.startsWith('http')) return media.path;
    return `/media/file/${media.path}`;
  }

  private toResponseDto(p: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    priceCents: number;
    currency: string;
    sizes: unknown;
    featured: boolean;
    stockQuantity: number;
    urduVerse: string | null;
    urduVerseTransliteration: string | null;
    createdAt: Date;
    updatedAt: Date;
    productCategories: Array<{ category: { id: string; name: string; slug: string } }>;
    productMedia: Array<{ media: { path: string; deliveryUrl: string | null } }>;
  }): ProductResponseDto {
    const sizes = Array.isArray(p.sizes) ? (p.sizes as string[]) : [];
    const images = p.productMedia.map((pm) => this.imageUrl(pm.media));
    const image = images[0] ?? '';
    const categories = p.productCategories.map((pc) => pc.category);
    const first = categories[0];
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      price: p.priceCents,
      currency: p.currency,
      image,
      images,
      sizes,
      categories,
      category: first?.name ?? null,
      categoryId: first?.id ?? null,
      featured: p.featured,
      urduVerse: p.urduVerse,
      urduVerseTransliteration: p.urduVerseTransliteration,
      stockQuantity: p.stockQuantity,
      inStock: p.stockQuantity > 0,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private toListResponseDto(p: {
    id: string;
    name: string;
    slug: string;
    priceCents: number;
    currency: string;
    sizes: unknown;
    featured: boolean;
    stockQuantity: number;
    productCategories: Array<{ category: { name: string } }>;
    productMedia: Array<{ media: { path: string; deliveryUrl: string | null } }>;
  }): ProductListResponseDto {
    const sizes = Array.isArray(p.sizes) ? (p.sizes as string[]) : [];
    const image = p.productMedia[0]?.media
      ? this.imageUrl(p.productMedia[0].media)
      : '';
    const categories = p.productCategories.map((pc) => pc.category.name);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.priceCents,
      currency: p.currency,
      image,
      sizes,
      featured: p.featured,
      stockQuantity: p.stockQuantity,
      inStock: p.stockQuantity > 0,
      categories,
    };
  }
}
