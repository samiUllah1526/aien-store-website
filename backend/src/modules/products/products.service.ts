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
import {
  ProductResponseDto,
  ProductListResponseDto,
  ProductVariantResponseDto,
} from './dto/product-response.dto';
import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import {
  assertUniqueSkusAmongIncoming,
  diffProductVariants,
  normalizeVariantInputsForReplace,
  variantCompositeKey,
  type NormalizedVariantInput,
} from './product-variant-replace.util';
import { SalesCampaignsService } from '../sales-campaigns/sales-campaigns.service';
import {
  type SalePriceInfo,
  computeSalePrice,
} from '../sales-campaigns/sale-price.util';

/** Interactive transaction client (subset of PrismaClient). */
type TransactionClient = Parameters<
  Parameters<PrismaClient['$transaction']>[0]
>[0];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly salesCampaigns: SalesCampaignsService,
  ) {}

  /** Resolve category slug to id. */
  private async resolveCategoryId(
    value: string | undefined | null,
  ): Promise<string | null> {
    if (!value || value.trim() === '') return null;
    const trimmed = value.trim();
    if (UUID_REGEX.test(trimmed)) return trimmed;
    const category = await this.prisma.category.findUnique({
      where: { slug: trimmed },
    });
    if (!category) {
      throw new BadRequestException(
        `Category not found: "${trimmed}" (use a category UUID or slug)`,
      );
    }
    return category.id;
  }

  /** Validate and resolve category IDs; throws if any invalid. */
  private async resolveCategoryIds(
    ids: string[] | undefined,
  ): Promise<string[]> {
    if (!ids?.length) return [];
    const validIds: string[] = [];
    for (const id of ids) {
      const resolved = await this.resolveCategoryId(id);
      if (resolved) validIds.push(resolved);
    }
    return validIds;
  }

  private summarizeVariantDimensions(
    variants: Array<{
      color: string;
      size: string;
      stockQuantity: number;
      isActive: boolean;
    }>,
  ): {
    colors: string[];
    sizes: string[];
    stockQuantity: number;
    inStock: boolean;
  } {
    const colors = [...new Set(variants.map((v) => v.color))];
    const sizes = [...new Set(variants.map((v) => v.size))];
    const stockQuantity = variants.reduce(
      (sum, v) => sum + Math.max(0, v.stockQuantity),
      0,
    );
    const inStock = variants.some((v) => v.isActive && v.stockQuantity > 0);
    return { colors, sizes, stockQuantity, inStock };
  }

  private collectVariantMediaIds(
    variants: Array<{ mediaIds?: string[] }>,
  ): string[] {
    return [...new Set(variants.flatMap((variant) => variant.mediaIds ?? []))];
  }

  /**
   * Full replacement of variants inside an interactive transaction: explicit diff by
   * (color, size), ordered writes to avoid @@unique([productId, color, size]) and sku
   * collisions, and denormalized sizes/stock on Product.
   *
   * Order: delete removable (no order FK) → soft-remove remainder (clear sku) → clear skus
   * on updates → per-row updates → createMany → attach variant media → product rollup.
   */
  private async executeVariantFullReplace(
    tx: TransactionClient,
    productId: string,
    normalized: NormalizedVariantInput[],
  ): Promise<void> {
    const existingRows = await tx.productVariant.findMany({
      where: { productId },
      select: { id: true, color: true, size: true },
    });

    const { toCreate, toUpdate, toRemoveIds } = diffProductVariants(
      existingRows,
      normalized,
    );

    if (toRemoveIds.length > 0) {
      // Hard-delete only when no order_items reference the variant (onDelete: Restrict).
      await tx.productVariant.deleteMany({
        where: {
          productId,
          id: { in: toRemoveIds },
          orderItems: { none: {} },
        },
      });

      const stillPresent = await tx.productVariant.findMany({
        where: { productId, id: { in: toRemoveIds } },
        select: { id: true },
      });

      if (stillPresent.length > 0) {
        await tx.productVariant.updateMany({
          where: { id: { in: stillPresent.map((r) => r.id) } },
          data: {
            isActive: false,
            stockQuantity: 0,
            sku: null,
          },
        });
      }
    }

    if (toUpdate.length > 0) {
      await tx.productVariant.updateMany({
        where: {
          productId,
          id: { in: toUpdate.map((u) => u.id) },
        },
        data: { sku: null },
      });
    }

    for (const { id: variantId, input } of toUpdate) {
      await tx.productVariant.update({
        where: { id: variantId },
        data: {
          color: input.color,
          size: input.size,
          sku: input.sku,
          stockQuantity: input.stockQuantity,
          priceOverrideCents: input.priceOverrideCents,
          isActive: input.isActive,
        },
      });
      if (input.mediaIds !== undefined) {
        await this.syncVariantMediaTx(tx, variantId, input.mediaIds);
      }
    }

    if (toCreate.length > 0) {
      await tx.productVariant.createMany({
        data: toCreate.map((v) => ({
          productId,
          color: v.color,
          size: v.size,
          sku: v.sku,
          stockQuantity: v.stockQuantity,
          priceOverrideCents: v.priceOverrideCents,
          isActive: v.isActive,
        })),
      });

      const createdRows = await tx.productVariant.findMany({
        where: {
          productId,
          OR: toCreate.map((v) => ({ color: v.color, size: v.size })),
        },
        select: { id: true, color: true, size: true },
      });
      const idByKey = new Map(
        createdRows.map((r) => [variantCompositeKey(r.color, r.size), r.id]),
      );
      for (const v of toCreate) {
        const vid = idByKey.get(variantCompositeKey(v.color, v.size));
        if (vid && v.mediaIds?.length) {
          await this.attachVariantMediaTx(tx, vid, v.mediaIds);
        }
      }
    }

    const allVariants = await tx.productVariant.findMany({
      where: { productId },
      select: { size: true, stockQuantity: true },
    });
    await tx.product.update({
      where: { id: productId },
      data: {
        sizes: [...new Set(allVariants.map((v) => v.size))] as object,
        stockQuantity: allVariants.reduce((sum, v) => sum + v.stockQuantity, 0),
      },
    });
  }

  private async syncVariantMediaTx(
    tx: TransactionClient,
    variantId: string,
    mediaIds: string[],
  ): Promise<void> {
    await tx.productVariantMedia.deleteMany({ where: { variantId } });
    if (mediaIds.length > 0) {
      await tx.productVariantMedia.createMany({
        data: mediaIds.map((mediaId, index) => ({
          variantId,
          mediaId,
          sortOrder: index,
        })),
        skipDuplicates: true,
      });
    }
  }

  private async attachVariantMediaTx(
    tx: TransactionClient,
    variantId: string,
    mediaIds: string[],
  ): Promise<void> {
    await tx.productVariantMedia.createMany({
      data: mediaIds.map((mediaId, index) => ({
        variantId,
        mediaId,
        sortOrder: index,
      })),
      skipDuplicates: true,
    });
  }

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    const existing = await this.prisma.product.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        `Product with slug "${dto.slug}" already exists`,
      );
    }
    const categoryIds = await this.resolveCategoryIds(dto.categoryIds);
    const variants = normalizeVariantInputsForReplace(dto.variants, false);
    const variantMediaIds = this.collectVariantMediaIds(variants);
    const allMediaIds = [
      ...new Set([...(dto.mediaIds ?? []), ...variantMediaIds]),
    ];
    if (allMediaIds.length) {
      await this.validateMediaIds(allMediaIds);
    }
    const stockQuantity = variants.reduce((sum, v) => sum + v.stockQuantity, 0);
    const derivedSizes = [...new Set(variants.map((v) => v.size))];
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description ?? null,
        priceCents: dto.priceCents,
        currency: dto.currency ?? 'PKR',
        sizes: derivedSizes as object,
        stockQuantity,
        featured: dto.featured ?? false,
        urduVerse: dto.urduVerse ?? null,
        urduVerseTransliteration: dto.urduVerseTransliteration ?? null,
        variants: {
          create: variants.map((variant) => ({
            color: variant.color,
            size: variant.size,
            sku: variant.sku,
            stockQuantity: variant.stockQuantity,
            priceOverrideCents: variant.priceOverrideCents,
            isActive: variant.isActive,
          })),
        },
        productCategories: categoryIds.length
          ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
      },
      include: this.productInclude(),
    });
    if (dto.mediaIds?.length) {
      await this.attachMedia(product.id, dto.mediaIds);
    }
    if (variantMediaIds.length) {
      const createdVariants = await this.prisma.productVariant.findMany({
        where: { productId: product.id },
        select: { id: true, color: true, size: true },
      });
      const createdVariantByKey = new Map(
        createdVariants.map((variant) => [
          `${variant.color.toLowerCase()}__${variant.size.toLowerCase()}`,
          variant.id,
        ]),
      );
      for (const variant of variants) {
        if (!variant.mediaIds?.length) continue;
        const key = `${variant.color.toLowerCase()}__${variant.size.toLowerCase()}`;
        const variantId = createdVariantByKey.get(key);
        if (!variantId) continue;
        await this.attachVariantMedia(variantId, variant.mediaIds);
      }
    }
    const created = await this.prisma.product.findUniqueOrThrow({
      where: { id: product.id },
      include: this.productInclude(),
    });
    const sale = await this.salesCampaigns.getActiveSalePrice(created.id);
    return this.toResponseDto(created, sale);
  }

  async findAll(
    query: ProductQueryDto,
  ): Promise<{ data: ProductListResponseDto[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;
    let resolvedCategoryId: string | undefined = query.categoryId;
    if (query.category?.trim()) {
      resolvedCategoryId =
        (await this.resolveCategoryId(query.category.trim())) ?? undefined;
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

    const salePrices = await this.salesCampaigns.getActiveSalePrices(
      items.map((p) => p.id),
    );
    const data = items.map((p) =>
      this.toListResponseDto(p, salePrices.get(p.id) ?? null),
    );
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
    const sale = await this.salesCampaigns.getActiveSalePrice(product.id);
    return this.toResponseDto(product, sale);
  }

  async findBySlug(slug: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: this.productInclude(),
    });
    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }
    const sale = await this.salesCampaigns.getActiveSalePrice(product.id);
    return this.toResponseDto(product, sale);
  }

  /** Find products by IDs; returns in the same order as the input array (missing IDs skipped). */
  async findByIds(ids: string[]): Promise<ProductResponseDto[]> {
    if (!ids?.length) return [];
    const uniqueIds = [...new Set(ids)];
    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueIds } },
      include: this.productInclude(),
    });
    const salePrices = await this.salesCampaigns.getActiveSalePrices(uniqueIds);
    const map = new Map(
      products.map((p) => [
        p.id,
        this.toResponseDto(p, salePrices.get(p.id) ?? null),
      ]),
    );
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
        throw new ConflictException(
          `Product with slug "${dto.slug}" already exists`,
        );
      }
    }
    const normalizedVariantsForMedia =
      dto.variants !== undefined
        ? normalizeVariantInputsForReplace(dto.variants, true)
        : undefined;
    const variantMediaIds = normalizedVariantsForMedia
      ? this.collectVariantMediaIds(normalizedVariantsForMedia)
      : [];
    const allMediaIds = [...(dto.mediaIds ?? []), ...variantMediaIds];
    if (allMediaIds.length) {
      await this.validateMediaIds([...new Set(allMediaIds)]);
    }
    if (dto.categoryIds !== undefined) {
      const categoryIds = await this.resolveCategoryIds(dto.categoryIds);
      await this.prisma.productCategory.deleteMany({
        where: { productId: id },
      });
      if (categoryIds.length) {
        await this.prisma.productCategory.createMany({
          data: categoryIds.map((categoryId) => ({
            productId: id,
            categoryId,
          })),
        });
      }
    }

    if (dto.variants !== undefined) {
      const normalized = normalizedVariantsForMedia ?? [];
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.productVariant.findMany({
          where: { productId: id },
          select: { id: true },
        });
        const existingIds = new Set(existing.map((v) => v.id));
        const seenIds = new Set<string>();
        for (const variant of normalized) {
          if (variant.id && existingIds.has(variant.id)) {
            seenIds.add(variant.id);
            await tx.productVariant.update({
              where: { id: variant.id },
              data: {
                color: variant.color,
                size: variant.size,
                sku: variant.sku,
                stockQuantity: variant.stockQuantity,
                priceOverrideCents: variant.priceOverrideCents,
                isActive: variant.isActive,
              },
            });
            if (variant.mediaIds !== undefined) {
              await this.syncVariantMedia(variant.id, variant.mediaIds, tx);
            }
          } else {
            const created = await tx.productVariant.create({
              data: {
                productId: id,
                color: variant.color,
                size: variant.size,
                sku: variant.sku,
                stockQuantity: variant.stockQuantity,
                priceOverrideCents: variant.priceOverrideCents,
                isActive: variant.isActive,
              },
              select: { id: true },
            });
            seenIds.add(created.id);
            if (variant.mediaIds?.length) {
              await this.attachVariantMedia(created.id, variant.mediaIds, tx);
            }
          }
        }
        const toDeactivate = [...existingIds].filter(
          (variantId) => !seenIds.has(variantId),
        );
        if (toDeactivate.length) {
          await tx.productVariant.updateMany({
            where: { id: { in: toDeactivate } },
            data: { isActive: false, stockQuantity: 0 },
          });
        }
        const allVariants = await tx.productVariant.findMany({
          where: { productId: id },
          select: { size: true, stockQuantity: true },
        });
        await tx.product.update({
          where: { id },
          data: {
            sizes: [...new Set(allVariants.map((v) => v.size))] as object,
            stockQuantity: allVariants.reduce(
              (sum, v) => sum + v.stockQuantity,
              0,
            ),
          },
        });
      });
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.priceCents !== undefined && { priceCents: dto.priceCents }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
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
    const refreshed = await this.prisma.product.findUniqueOrThrow({
      where: { id },
      include: this.productInclude(),
    });
    const sale = await this.salesCampaigns.getActiveSalePrice(refreshed.id);
    return this.toResponseDto(refreshed, sale);
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
        include: {
          media: { select: { id: true, path: true, deliveryUrl: true } },
        },
        orderBy: { sortOrder: Prisma.SortOrder.asc },
      },
      variants: {
        include: {
          variantMedia: {
            where: { media: { uploadError: { equals: Prisma.DbNull } } },
            include: {
              media: { select: { id: true, path: true, deliveryUrl: true } },
            },
            orderBy: { sortOrder: Prisma.SortOrder.asc },
          },
        },
        orderBy: [
          { color: Prisma.SortOrder.asc },
          { size: Prisma.SortOrder.asc },
        ],
      },
    };
  }

  private buildWhere(
    query: ProductQueryDto,
    resolvedCategoryId?: string,
  ): Record<string, unknown> {
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
    if (query.stockFilter === 'in_stock')
      where.variants = { some: { isActive: true, stockQuantity: { gt: 0 } } };
    if (query.stockFilter === 'out_of_stock')
      where.variants = { none: { isActive: true, stockQuantity: { gt: 0 } } };
    if (query.stockFilter === 'low_stock') {
      const max = query.lowStockMax ?? 5;
      where.variants = {
        some: { isActive: true, stockQuantity: { gte: 1, lte: max } },
      };
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

  private async attachMedia(
    productId: string,
    mediaIds: string[],
  ): Promise<void> {
    await this.prisma.productMedia.createMany({
      data: mediaIds.map((mediaId, index) => ({
        productId,
        mediaId,
        sortOrder: index,
      })),
      skipDuplicates: true,
    });
  }

  private async attachVariantMedia(
    variantId: string,
    mediaIds: string[],
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    await client.productVariantMedia.createMany({
      data: mediaIds.map((mediaId, index) => ({
        variantId,
        mediaId,
        sortOrder: index,
      })),
      skipDuplicates: true,
    });
  }

  private async syncVariantMedia(
    variantId: string,
    mediaIds: string[],
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    await client.productVariantMedia.deleteMany({ where: { variantId } });
    if (mediaIds.length > 0) {
      await this.attachVariantMedia(variantId, mediaIds, client);
    }
  }

  private imageUrl(
    media: { path: string; deliveryUrl: string | null } | null,
  ): string {
    if (!media) return '';
    if (media.deliveryUrl) return media.deliveryUrl;
    if (media.path.startsWith('http')) return media.path;
    return `/media/file/${media.path}`;
  }

  private saleFields(
    priceCents: number,
    sale: SalePriceInfo | null,
  ): {
    salePrice: number | null;
    originalPrice: number | null;
    onSale: boolean;
    saleBadgeText: string | null;
    saleEndsAt: string | null;
    saleCampaignId: string | null;
  } {
    if (!sale) {
      return {
        salePrice: null,
        originalPrice: null,
        onSale: false,
        saleBadgeText: null,
        saleEndsAt: null,
        saleCampaignId: null,
      };
    }
    const salePriceCents = computeSalePrice(priceCents, sale);
    return {
      salePrice: salePriceCents,
      originalPrice: priceCents,
      onSale: true,
      saleBadgeText:
        sale.badgeText ?? `${sale.discountValue}% OFF`,
      saleEndsAt: sale.endsAt.toISOString(),
      saleCampaignId: sale.campaignId,
    };
  }

  private toResponseDto(
    p: {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      priceCents: number;
      currency: string;
      featured: boolean;
      urduVerse: string | null;
      urduVerseTransliteration: string | null;
      createdAt: Date;
      updatedAt: Date;
      productCategories: Array<{
        category: { id: string; name: string; slug: string };
      }>;
      productMedia: Array<{
        media: { id: string; path: string; deliveryUrl: string | null };
      }>;
      variants: Array<{
        id: string;
        color: string;
        size: string;
        sku: string | null;
        stockQuantity: number;
        priceOverrideCents: number | null;
        isActive: boolean;
        variantMedia: Array<{
          media: { id: string; path: string; deliveryUrl: string | null };
        }>;
      }>;
    },
    sale: SalePriceInfo | null = null,
  ): ProductResponseDto {
    const variants: ProductVariantResponseDto[] = p.variants.map((variant) => {
      const images = variant.variantMedia.map((vm) => this.imageUrl(vm.media));
      return {
        id: variant.id,
        color: variant.color,
        size: variant.size,
        sku: variant.sku,
        stockQuantity: variant.stockQuantity,
        priceOverrideCents: variant.priceOverrideCents,
        isActive: variant.isActive,
        image: images[0] ?? '',
        images,
        mediaIds: variant.variantMedia.map((vm) => vm.media.id),
      };
    });
    const { colors, sizes, stockQuantity, inStock } =
      this.summarizeVariantDimensions(variants);
    const images = p.productMedia.map((pm) => this.imageUrl(pm.media));
    const mediaIds = p.productMedia.map((pm) => pm.media.id);
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
      mediaIds,
      variants,
      colors,
      sizes,
      categories,
      category: first?.name ?? null,
      categoryId: first?.id ?? null,
      featured: p.featured,
      urduVerse: p.urduVerse,
      urduVerseTransliteration: p.urduVerseTransliteration,
      stockQuantity,
      inStock,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      ...this.saleFields(p.priceCents, sale),
    };
  }

  private toListResponseDto(
    p: {
      id: string;
      name: string;
      slug: string;
      priceCents: number;
      currency: string;
      featured: boolean;
      productCategories: Array<{ category: { name: string } }>;
      productMedia: Array<{
        media: { id: string; path: string; deliveryUrl: string | null };
      }>;
      variants: Array<{
        id: string;
        color: string;
        size: string;
        sku: string | null;
        stockQuantity: number;
        priceOverrideCents: number | null;
        isActive: boolean;
        variantMedia: Array<{
          media: { id: string; path: string; deliveryUrl: string | null };
        }>;
      }>;
    },
    sale: SalePriceInfo | null = null,
  ): ProductListResponseDto {
    const variants: ProductVariantResponseDto[] = p.variants.map((variant) => {
      const images = variant.variantMedia.map((vm) => this.imageUrl(vm.media));
      return {
        id: variant.id,
        color: variant.color,
        size: variant.size,
        sku: variant.sku,
        stockQuantity: variant.stockQuantity,
        priceOverrideCents: variant.priceOverrideCents,
        isActive: variant.isActive,
        image: images[0] ?? '',
        images,
        mediaIds: variant.variantMedia.map((vm) => vm.media.id),
      };
    });
    const { colors, sizes, stockQuantity, inStock } =
      this.summarizeVariantDimensions(variants);
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
      variants,
      colors,
      sizes,
      featured: p.featured,
      stockQuantity,
      inStock,
      categories,
      ...this.saleFields(p.priceCents, sale),
    };
  }
}
