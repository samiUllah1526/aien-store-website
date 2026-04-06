import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  SalesCampaignStatus,
  SalesCampaignScope,
  SalesCampaignType,
} from '@prisma/client';
import { CreateSalesCampaignDto } from './dto/create-sales-campaign.dto';
import { UpdateSalesCampaignDto } from './dto/update-sales-campaign.dto';
import { SalesCampaignQueryDto } from './dto/sales-campaign-query.dto';
import { SalePriceInfo } from './sale-price.util';

@Injectable()
export class SalesCampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Query-time status derivation (Option C — no cron jobs)
  // ---------------------------------------------------------------------------

  private activeWhere(now: Date = new Date()): Prisma.SalesCampaignWhereInput {
    return {
      deletedAt: null,
      status: SalesCampaignStatus.SCHEDULED,
      startsAt: { lte: now },
      endsAt: { gt: now },
    };
  }

  deriveDisplayStatus(campaign: {
    status: SalesCampaignStatus;
    startsAt: Date;
    endsAt: Date;
    deletedAt: Date | null;
  }): string {
    if (campaign.deletedAt) return 'DELETED';
    if (campaign.status === SalesCampaignStatus.DRAFT) return 'DRAFT';
    if (campaign.status === SalesCampaignStatus.PAUSED) return 'PAUSED';
    const now = new Date();
    if (now < campaign.startsAt) return 'SCHEDULED';
    if (now < campaign.endsAt) return 'ACTIVE';
    return 'ENDED';
  }

  // ---------------------------------------------------------------------------
  // Sale price lookup — single entry point, cache-ready
  // ---------------------------------------------------------------------------

  async getActiveSalePrices(
    productIds: string[],
  ): Promise<Map<string, SalePriceInfo>> {
    if (!productIds.length) return new Map();
    return this._fetchActiveSalePrices(productIds);
  }

  async getActiveSalePrice(
    productId: string,
  ): Promise<SalePriceInfo | null> {
    const map = await this.getActiveSalePrices([productId]);
    return map.get(productId) ?? null;
  }

  private async _fetchActiveSalePrices(
    productIds: string[],
  ): Promise<Map<string, SalePriceInfo>> {
    const now = new Date();
    const result = new Map<string, SalePriceInfo>();
    const campaignSelect = {
      id: true,
      name: true,
      type: true,
      value: true,
      badgeText: true,
      priority: true,
      endsAt: true,
    } as const;

    const [directMatches, categoryMatches, allProductCampaigns] =
      await Promise.all([
        this.prisma.salesCampaignProduct.findMany({
          where: {
            productId: { in: productIds },
            campaign: this.activeWhere(now),
          },
          include: { campaign: { select: campaignSelect } },
        }),
        this.prisma.salesCampaignCategory.findMany({
          where: {
            campaign: {
              ...this.activeWhere(now),
              applyTo: SalesCampaignScope.SPECIFIC_CATEGORIES,
            },
            category: {
              productCategories: {
                some: { productId: { in: productIds } },
              },
            },
          },
          include: {
            campaign: { select: campaignSelect },
            category: {
              select: {
                productCategories: {
                  where: { productId: { in: productIds } },
                  select: { productId: true },
                },
              },
            },
          },
        }),
        this.prisma.salesCampaign.findMany({
          where: {
            ...this.activeWhere(now),
            applyTo: SalesCampaignScope.ALL_PRODUCTS,
          },
          select: campaignSelect,
        }),
      ]);

    // Map: productId → best candidate {campaign, overrideValue?}
    const candidates = new Map<
      string,
      { campaign: typeof campaignSelect extends infer S ? { id: string; name: string; type: SalesCampaignType; value: number; badgeText: string | null; priority: number; endsAt: Date } : never; overrideValue?: number | null }
    >();

    function setBest(
      productId: string,
      campaign: { id: string; name: string; type: SalesCampaignType; value: number; badgeText: string | null; priority: number; endsAt: Date },
      overrideValue?: number | null,
    ) {
      const existing = candidates.get(productId);
      if (!existing || campaign.priority > existing.campaign.priority) {
        candidates.set(productId, { campaign, overrideValue });
      }
    }

    for (const dm of directMatches) {
      setBest(dm.productId, dm.campaign, dm.overrideValue);
    }

    for (const cm of categoryMatches) {
      for (const pc of cm.category.productCategories) {
        setBest(pc.productId, cm.campaign);
      }
    }

    for (const ac of allProductCampaigns) {
      for (const pid of productIds) {
        setBest(pid, ac);
      }
    }

    for (const [productId, { campaign, overrideValue }] of candidates) {
      result.set(productId, {
        campaignId: campaign.id,
        campaignName: campaign.name,
        type: campaign.type,
        discountValue: overrideValue ?? campaign.value,
        badgeText: campaign.badgeText,
        endsAt: campaign.endsAt,
        priority: campaign.priority,
      });
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120);
  }

  async create(
    dto: CreateSalesCampaignDto,
    createdById?: string | null,
  ) {
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
      throw new BadRequestException('Invalid date format for startsAt or endsAt');
    }
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    if (dto.type === 'PERCENTAGE' && dto.value > 100) {
      throw new BadRequestException('Percentage value must be between 1 and 100');
    }

    const slug = dto.slug?.trim() || this.generateSlug(dto.name);
    const existing = await this.prisma.salesCampaign.findUnique({
      where: { slug },
    });
    if (existing) {
      throw new ConflictException(`Campaign with slug "${slug}" already exists`);
    }

    if (
      dto.applyTo === 'SPECIFIC_PRODUCTS' &&
      (!dto.productIds || dto.productIds.length === 0)
    ) {
      throw new BadRequestException(
        'productIds required when applyTo is SPECIFIC_PRODUCTS',
      );
    }
    if (
      dto.applyTo === 'SPECIFIC_CATEGORIES' &&
      (!dto.categoryIds || dto.categoryIds.length === 0)
    ) {
      throw new BadRequestException(
        'categoryIds required when applyTo is SPECIFIC_CATEGORIES',
      );
    }

    const overrideMap = new Map(
      (dto.productOverrides ?? []).map((o) => [o.productId, o.overrideValue]),
    );

    const campaign = await this.prisma.salesCampaign.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        type: dto.type as SalesCampaignType,
        value: dto.value,
        startsAt,
        endsAt,
        status: SalesCampaignStatus.DRAFT,
        applyTo: dto.applyTo as SalesCampaignScope,
        badgeText: dto.badgeText?.trim() || null,
        priority: dto.priority ?? 0,
        createdById: createdById ?? null,
        products:
          dto.productIds?.length
            ? {
                create: dto.productIds.map((productId) => ({
                  productId,
                  overrideValue: overrideMap.get(productId) ?? null,
                })),
              }
            : undefined,
        categories:
          dto.categoryIds?.length
            ? {
                create: dto.categoryIds.map((categoryId) => ({ categoryId })),
              }
            : undefined,
      },
      include: this.campaignInclude(),
    });

    return this.toResponseDto(campaign);
  }

  async findAll(query: SalesCampaignQueryDto) {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.SalesCampaignWhereInput = { deletedAt: null };

    if (query.search?.trim()) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.displayStatus) {
      const now = new Date();
      switch (query.displayStatus) {
        case 'draft':
          where.status = SalesCampaignStatus.DRAFT;
          break;
        case 'scheduled':
          where.status = SalesCampaignStatus.SCHEDULED;
          where.startsAt = { gt: now };
          break;
        case 'active':
          where.status = SalesCampaignStatus.SCHEDULED;
          where.startsAt = { lte: now };
          where.endsAt = { gt: now };
          break;
        case 'paused':
          where.status = SalesCampaignStatus.PAUSED;
          break;
        case 'ended':
          where.status = SalesCampaignStatus.SCHEDULED;
          where.endsAt = { lte: now };
          break;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.salesCampaign.findMany({
        where,
        include: this.campaignInclude(),
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.salesCampaign.count({ where }),
    ]);

    return {
      data: items.map((c) => this.toResponseDto(c)),
      total,
    };
  }

  async findOne(id: string) {
    const campaign = await this.prisma.salesCampaign.findFirst({
      where: { id, deletedAt: null },
      include: this.campaignInclude(),
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign with id "${id}" not found`);
    }
    return this.toResponseDto(campaign);
  }

  async update(id: string, dto: UpdateSalesCampaignDto) {
    const campaign = await this.prisma.salesCampaign.findFirst({
      where: { id, deletedAt: null },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign with id "${id}" not found`);
    }

    const displayStatus = this.deriveDisplayStatus(campaign);
    if (displayStatus === 'ENDED') {
      throw new BadRequestException('Cannot update an ended campaign');
    }

    if (dto.slug && dto.slug !== campaign.slug) {
      const existing = await this.prisma.salesCampaign.findUnique({
        where: { slug: dto.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Slug "${dto.slug}" already taken`);
      }
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : undefined;
    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be after startsAt');
    }
    if (dto.type === 'PERCENTAGE' && dto.value && dto.value > 100) {
      throw new BadRequestException('Percentage value must be between 1 and 100');
    }

    if (dto.productIds !== undefined) {
      await this.prisma.salesCampaignProduct.deleteMany({
        where: { campaignId: id },
      });
      if (dto.productIds.length > 0) {
        const overrideMap = new Map(
          (dto.productOverrides ?? []).map((o) => [o.productId, o.overrideValue]),
        );
        await this.prisma.salesCampaignProduct.createMany({
          data: dto.productIds.map((productId) => ({
            campaignId: id,
            productId,
            overrideValue: overrideMap.get(productId) ?? null,
          })),
        });
      }
    }

    if (dto.categoryIds !== undefined) {
      await this.prisma.salesCampaignCategory.deleteMany({
        where: { campaignId: id },
      });
      if (dto.categoryIds.length > 0) {
        await this.prisma.salesCampaignCategory.createMany({
          data: dto.categoryIds.map((categoryId) => ({
            campaignId: id,
            categoryId,
          })),
        });
      }
    }

    const updated = await this.prisma.salesCampaign.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.slug !== undefined && { slug: dto.slug.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description?.trim() || null,
        }),
        ...(dto.type !== undefined && { type: dto.type as SalesCampaignType }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(startsAt && { startsAt }),
        ...(endsAt && { endsAt }),
        ...(dto.applyTo !== undefined && {
          applyTo: dto.applyTo as SalesCampaignScope,
        }),
        ...(dto.badgeText !== undefined && {
          badgeText: dto.badgeText?.trim() || null,
        }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
      },
      include: this.campaignInclude(),
    });

    return this.toResponseDto(updated);
  }

  async publish(id: string) {
    const campaign = await this.prisma.salesCampaign.findFirst({
      where: { id, deletedAt: null },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== SalesCampaignStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT campaigns can be published');
    }
    const updated = await this.prisma.salesCampaign.update({
      where: { id },
      data: { status: SalesCampaignStatus.SCHEDULED },
      include: this.campaignInclude(),
    });
    return this.toResponseDto(updated);
  }

  async pause(id: string) {
    const campaign = await this.prisma.salesCampaign.findFirst({
      where: { id, deletedAt: null },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== SalesCampaignStatus.SCHEDULED) {
      throw new BadRequestException('Only SCHEDULED campaigns can be paused');
    }
    const updated = await this.prisma.salesCampaign.update({
      where: { id },
      data: { status: SalesCampaignStatus.PAUSED },
      include: this.campaignInclude(),
    });
    return this.toResponseDto(updated);
  }

  async resume(id: string) {
    const campaign = await this.prisma.salesCampaign.findFirst({
      where: { id, deletedAt: null },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.status !== SalesCampaignStatus.PAUSED) {
      throw new BadRequestException('Only PAUSED campaigns can be resumed');
    }
    const updated = await this.prisma.salesCampaign.update({
      where: { id },
      data: { status: SalesCampaignStatus.SCHEDULED },
      include: this.campaignInclude(),
    });
    return this.toResponseDto(updated);
  }

  async softDelete(id: string) {
    const campaign = await this.prisma.salesCampaign.findFirst({
      where: { id, deletedAt: null },
    });
    if (!campaign) throw new NotFoundException('Campaign not found');
    await this.prisma.salesCampaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async duplicate(id: string, createdById?: string | null) {
    const source = await this.prisma.salesCampaign.findFirst({
      where: { id, deletedAt: null },
      include: {
        products: { select: { productId: true, overrideValue: true } },
        categories: { select: { categoryId: true } },
      },
    });
    if (!source) throw new NotFoundException('Campaign not found');

    const baseSlug = `${source.slug}-copy`;
    let slug = baseSlug;
    let counter = 1;
    while (await this.prisma.salesCampaign.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const campaign = await this.prisma.salesCampaign.create({
      data: {
        name: `${source.name} (Copy)`,
        slug,
        description: source.description,
        type: source.type,
        value: source.value,
        startsAt: source.startsAt,
        endsAt: source.endsAt,
        status: SalesCampaignStatus.DRAFT,
        applyTo: source.applyTo,
        badgeText: source.badgeText,
        priority: source.priority,
        createdById: createdById ?? null,
        products: source.products.length
          ? {
              create: source.products.map((p) => ({
                productId: p.productId,
                overrideValue: p.overrideValue,
              })),
            }
          : undefined,
        categories: source.categories.length
          ? {
              create: source.categories.map((c) => ({
                categoryId: c.categoryId,
              })),
            }
          : undefined,
      },
      include: this.campaignInclude(),
    });

    return this.toResponseDto(campaign);
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private campaignInclude() {
    return {
      products: {
        include: {
          product: { select: { id: true, name: true, slug: true, priceCents: true } },
        },
      },
      categories: {
        include: {
          category: { select: { id: true, name: true, slug: true } },
        },
      },
      createdBy: { select: { id: true, name: true } },
    };
  }

  private toResponseDto(campaign: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    type: SalesCampaignType;
    value: number;
    startsAt: Date;
    endsAt: Date;
    status: SalesCampaignStatus;
    applyTo: SalesCampaignScope;
    badgeText: string | null;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    products: Array<{
      productId: string;
      overrideValue: number | null;
      product: { id: string; name: string; slug: string; priceCents: number };
    }>;
    categories: Array<{
      categoryId: string;
      category: { id: string; name: string; slug: string };
    }>;
    createdBy: { id: string; name: string } | null;
  }) {
    return {
      id: campaign.id,
      name: campaign.name,
      slug: campaign.slug,
      description: campaign.description,
      type: campaign.type,
      value: campaign.value,
      startsAt: campaign.startsAt.toISOString(),
      endsAt: campaign.endsAt.toISOString(),
      status: campaign.status,
      displayStatus: this.deriveDisplayStatus(campaign),
      applyTo: campaign.applyTo,
      badgeText: campaign.badgeText,
      priority: campaign.priority,
      productCount: campaign.products.length,
      categoryCount: campaign.categories.length,
      products: campaign.products.map((p) => ({
        productId: p.productId,
        overrideValue: p.overrideValue,
        product: p.product,
      })),
      categories: campaign.categories.map((c) => ({
        categoryId: c.categoryId,
        category: c.category,
      })),
      createdBy: campaign.createdBy,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    };
  }
}
