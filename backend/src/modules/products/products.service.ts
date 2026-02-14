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

  /** Resolve categoryId: accept UUID or category slug (look up by slug). */
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
    const categoryId = await this.resolveCategoryId(dto.categoryId ?? null);
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        categoryId,
        priceCents: dto.priceCents,
        currency: dto.currency ?? 'PKR',
        sizes: (dto.sizes ?? []) as object,
        featured: dto.featured ?? false,
        urduVerse: dto.urduVerse ?? null,
        urduVerseTransliteration: dto.urduVerseTransliteration ?? null,
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
    const where = this.buildWhere(query);

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: this.productInclude(),
        orderBy: { [sortBy]: sortOrder },
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
    const categoryId =
      dto.categoryId !== undefined ? await this.resolveCategoryId(dto.categoryId || null) : undefined;
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(categoryId !== undefined && { categoryId }),
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
      category: true,
      productMedia: { include: { media: true }, orderBy: { sortOrder: Prisma.SortOrder.asc } },
    };
  }

  private buildWhere(query: ProductQueryDto): Record<string, unknown> {
    const where: Record<string, unknown> = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.minPriceCents != null || query.maxPriceCents != null) {
      const priceFilter: { gte?: number; lte?: number } = {};
      if (query.minPriceCents != null) priceFilter.gte = query.minPriceCents;
      if (query.maxPriceCents != null) priceFilter.lte = query.maxPriceCents;
      where.priceCents = priceFilter;
    }
    if (query.featured === 'true') where.featured = true;
    if (query.featured === 'false') where.featured = false;
    return where;
  }

  private async validateMediaIds(mediaIds: string[]): Promise<void> {
    const found = await this.prisma.media.findMany({
      where: { id: { in: mediaIds } },
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

  private imageUrl(mediaPath: string | null): string {
    if (!mediaPath) return '';
    if (mediaPath.startsWith('http')) return mediaPath;
    return `/api/media/file/${mediaPath}`;
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
    urduVerse: string | null;
    urduVerseTransliteration: string | null;
    createdAt: Date;
    updatedAt: Date;
    category: { id: string; name: string; slug: string } | null;
    productMedia: Array<{ media: { path: string } }>;
  }): ProductResponseDto {
    const sizes = Array.isArray(p.sizes) ? (p.sizes as string[]) : [];
    const images = p.productMedia.map((pm) => this.imageUrl(pm.media.path));
    const image = images[0] ?? '';
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
      category: p.category?.name ?? null,
      categoryId: p.category?.id ?? null,
      featured: p.featured,
      urduVerse: p.urduVerse,
      urduVerseTransliteration: p.urduVerseTransliteration,
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
    productMedia: Array<{ media: { path: string } }>;
  }): ProductListResponseDto {
    const sizes = Array.isArray(p.sizes) ? (p.sizes as string[]) : [];
    const image = p.productMedia[0]?.media?.path
      ? this.imageUrl(p.productMedia[0].media.path)
      : '';
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.priceCents,
      currency: p.currency,
      image,
      sizes,
      featured: p.featured,
    };
  }
}
