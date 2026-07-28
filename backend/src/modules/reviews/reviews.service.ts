import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, ReviewSource, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateAdminReviewDto } from './dto/create-admin-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';
import { MAX_REVIEW_MEDIA } from '../media/storage/storage-provider.interface';

/** Order statuses that count as a completed (verified) purchase. */
const FULFILLED_STATUSES: OrderStatus[] = [
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

export interface ReviewSummary {
  count: number;
  average: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface ReviewMediaDto {
  id: string;
  url: string;
  mimeType: string;
  kind: 'image' | 'video';
}

const reviewMediaInclude = {
  reviewMedia: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      media: {
        select: {
          id: true,
          path: true,
          deliveryUrl: true,
          mimeType: true,
        },
      },
    },
  },
};

type ReviewMediaRow = {
  media: {
    id: string;
    path: string;
    deliveryUrl: string | null;
    mimeType: string;
  };
};

type PublicReviewRow = Prisma.ProductReviewGetPayload<{
  include: {
    user: { select: { name: true; firstName: true } };
    reviewMedia: typeof reviewMediaInclude.reviewMedia;
  };
}>;

type FeaturedReviewRow = Prisma.ProductReviewGetPayload<{
  include: {
    product: { select: { name: true; slug: true } };
    user: { select: { name: true; firstName: true } };
    reviewMedia: typeof reviewMediaInclude.reviewMedia;
  };
}>;

type AdminReviewRow = Prisma.ProductReviewGetPayload<{
  include: {
    product: { select: { name: true; slug: true } };
    reviewMedia: typeof reviewMediaInclude.reviewMedia;
  };
}>;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Public storefront
  // ---------------------------------------------------------------------------

  async listForProduct(
    productId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    data: ReturnType<ReviewsService['toPublicDto']>[];
    total: number;
    summary: ReviewSummary;
  }> {
    const skip = (page - 1) * limit;
    const where: Prisma.ProductReviewWhereInput = {
      productId,
      status: ReviewStatus.APPROVED,
    };
    const [rows, total, summary] = await Promise.all([
      this.prisma.productReview.findMany({
        where,
        include: {
          user: { select: { name: true, firstName: true } },
          ...reviewMediaInclude,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.productReview.count({ where }),
      this.getSummary(productId),
    ]);
    return { data: rows.map((r) => this.toPublicDto(r)), total, summary };
  }

  /** Approved reviews marked for the landing-page testimonials carousel. */
  async listFeaturedForHomepage(
    limit = 12,
  ): Promise<ReturnType<ReviewsService['toFeaturedDto']>[]> {
    const take = Math.min(20, Math.max(1, limit));
    const rows = await this.prisma.productReview.findMany({
      where: {
        featuredOnHomepage: true,
        status: ReviewStatus.APPROVED,
      },
      include: {
        product: { select: { name: true, slug: true } },
        user: { select: { name: true, firstName: true } },
        ...reviewMediaInclude,
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map((r) => this.toFeaturedDto(r));
  }

  async getSummary(productId: string): Promise<ReviewSummary> {
    const grouped = await this.prisma.productReview.groupBy({
      by: ['rating'],
      where: { productId, status: ReviewStatus.APPROVED },
      _count: { _all: true },
    });
    const distribution: ReviewSummary['distribution'] = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let count = 0;
    let ratingSum = 0;
    for (const g of grouped) {
      const c = g._count._all;
      const r = g.rating as 1 | 2 | 3 | 4 | 5;
      if (r >= 1 && r <= 5) distribution[r] = c;
      count += c;
      ratingSum += g.rating * c;
    }
    const average = count > 0 ? Math.round((ratingSum / count) * 10) / 10 : 0;
    return { count, average, distribution };
  }

  async getEligibility(
    productId: string,
    userId: string,
    email?: string,
  ): Promise<{
    canReview: boolean;
    alreadyReviewed: boolean;
    hasVerifiedPurchase: boolean;
  }> {
    const [existing, verifiedOrderId] = await Promise.all([
      this.prisma.productReview.findUnique({
        where: { productId_userId: { productId, userId } },
        select: { id: true },
      }),
      this.findVerifiedOrderId(productId, userId, email),
    ]);
    const alreadyReviewed = !!existing;
    const hasVerifiedPurchase = !!verifiedOrderId;
    return {
      canReview: hasVerifiedPurchase && !alreadyReviewed,
      alreadyReviewed,
      hasVerifiedPurchase,
    };
  }

  async create(
    productId: string,
    author: { userId: string; email?: string; name?: string },
    dto: CreateReviewDto,
  ): Promise<ReturnType<ReviewsService['toPublicDto']>> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const existing = await this.prisma.productReview.findUnique({
      where: { productId_userId: { productId, userId: author.userId } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this product.');
    }

    const orderId = await this.findVerifiedOrderId(
      productId,
      author.userId,
      author.email,
    );
    if (!orderId) {
      throw new ForbiddenException(
        'Only verified buyers can review this product. We could not find a completed order for this item on your account.',
      );
    }

    const mediaIds = this.normalizeMediaIds(dto.mediaIds);
    await this.validateMediaIds(mediaIds);

    const authorName = this.resolveAuthorName(author.name, author.email);
    const created = await this.prisma.$transaction(async (tx) => {
      const review = await tx.productReview.create({
        data: {
          productId,
          userId: author.userId,
          orderId,
          authorName,
          authorEmail: author.email ?? null,
          rating: dto.rating,
          title: dto.title?.trim() || null,
          body: dto.body.trim(),
          status: ReviewStatus.APPROVED,
          source: ReviewSource.CUSTOMER,
          isVerified: true,
        },
      });
      await this.attachMedia(tx, review.id, mediaIds);
      return tx.productReview.findUniqueOrThrow({
        where: { id: review.id },
        include: {
          user: { select: { name: true, firstName: true } },
          ...reviewMediaInclude,
        },
      });
    });
    return this.toPublicDto(created);
  }

  // ---------------------------------------------------------------------------
  // Admin authoring + moderation
  // ---------------------------------------------------------------------------

  async adminCreate(
    dto: CreateAdminReviewDto,
    adminUserId: string,
  ): Promise<AdminReviewDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true },
    });
    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }

    if (dto.orderId) {
      const order = await this.prisma.order.findFirst({
        where: {
          id: dto.orderId,
          items: { some: { productId: dto.productId } },
        },
        select: { id: true },
      });
      if (!order) {
        throw new BadRequestException(
          'The linked order was not found or does not contain this product.',
        );
      }
    }

    let createdAt: Date | undefined;
    if (dto.reviewDate) {
      const d = new Date(dto.reviewDate);
      if (Number.isNaN(d.getTime())) {
        throw new BadRequestException('Invalid review date.');
      }
      createdAt = d;
    }

    const mediaIds = this.normalizeMediaIds(dto.mediaIds);
    await this.validateMediaIds(mediaIds);

    const row = await this.prisma.$transaction(async (tx) => {
      const review = await tx.productReview.create({
        data: {
          productId: dto.productId,
          userId: null,
          orderId: dto.orderId ?? null,
          authorName: dto.authorName.trim(),
          authorEmail: dto.authorEmail?.trim() || null,
          rating: dto.rating,
          title: dto.title?.trim() || null,
          body: dto.body.trim(),
          status: (dto.status as ReviewStatus) ?? ReviewStatus.APPROVED,
          source: ReviewSource.ADMIN,
          createdByUserId: adminUserId,
          isVerified: dto.isVerified ?? false,
          ...(createdAt ? { createdAt } : {}),
        },
      });
      await this.attachMedia(tx, review.id, mediaIds);
      return tx.productReview.findUniqueOrThrow({
        where: { id: review.id },
        include: {
          product: { select: { name: true, slug: true } },
          ...reviewMediaInclude,
        },
      });
    });
    return this.toAdminDto(row);
  }

  async findAll(
    query: ReviewQueryDto,
  ): Promise<{ data: AdminReviewDto[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      productId,
      status,
      featuredOnHomepage,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.ProductReviewWhereInput = {};
    if (productId) where.productId = productId;
    if (status) where.status = status as ReviewStatus;
    if (featuredOnHomepage === 'true') where.featuredOnHomepage = true;
    if (featuredOnHomepage === 'false') where.featuredOnHomepage = false;
    if (search?.trim()) {
      const s = search.trim();
      where.OR = [
        { authorName: { contains: s, mode: 'insensitive' } },
        { authorEmail: { contains: s, mode: 'insensitive' } },
        { title: { contains: s, mode: 'insensitive' } },
        { body: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where,
        include: {
          product: { select: { name: true, slug: true } },
          ...reviewMediaInclude,
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.productReview.count({ where }),
    ]);
    return { data: rows.map((r) => this.toAdminDto(r)), total };
  }

  async findOne(id: string): Promise<AdminReviewDto> {
    const row = await this.prisma.productReview.findUnique({
      where: { id },
      include: {
        product: { select: { name: true, slug: true } },
        ...reviewMediaInclude,
      },
    });
    if (!row) throw new NotFoundException(`Review ${id} not found`);
    return this.toAdminDto(row);
  }

  async moderate(id: string, status: ReviewStatus): Promise<AdminReviewDto> {
    await this.ensureExists(id);
    const row = await this.prisma.productReview.update({
      where: { id },
      data: { status },
      include: {
        product: { select: { name: true, slug: true } },
        ...reviewMediaInclude,
      },
    });
    return this.toAdminDto(row);
  }

  async setFeaturedOnHomepage(
    id: string,
    featuredOnHomepage: boolean,
  ): Promise<AdminReviewDto> {
    await this.ensureExists(id);
    const row = await this.prisma.productReview.update({
      where: { id },
      data: { featuredOnHomepage },
      include: {
        product: { select: { name: true, slug: true } },
        ...reviewMediaInclude,
      },
    });
    return this.toAdminDto(row);
  }

  async reply(id: string, reply?: string): Promise<AdminReviewDto> {
    await this.ensureExists(id);
    const trimmed = reply?.trim();
    const row = await this.prisma.productReview.update({
      where: { id },
      data: {
        adminReply: trimmed || null,
        adminReplyAt: trimmed ? new Date() : null,
      },
      include: {
        product: { select: { name: true, slug: true } },
        ...reviewMediaInclude,
      },
    });
    return this.toAdminDto(row);
  }

  async remove(id: string): Promise<void> {
    await this.ensureExists(id);
    await this.prisma.productReview.delete({ where: { id } });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async ensureExists(id: string): Promise<void> {
    const row = await this.prisma.productReview.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!row) throw new NotFoundException(`Review ${id} not found`);
  }

  private normalizeMediaIds(mediaIds?: string[]): string[] {
    if (!mediaIds?.length) return [];
    const unique = [...new Set(mediaIds)];
    if (unique.length > MAX_REVIEW_MEDIA) {
      throw new BadRequestException(
        `A review can include at most ${MAX_REVIEW_MEDIA} photos/videos.`,
      );
    }
    return unique;
  }

  private async validateMediaIds(mediaIds: string[]): Promise<void> {
    if (!mediaIds.length) return;
    const found = await this.prisma.media.findMany({
      where: {
        id: { in: mediaIds },
        source: 'review',
        uploadError: { equals: Prisma.DbNull },
      },
      select: { id: true },
    });
    const foundSet = new Set(found.map((m) => m.id));
    const missing = mediaIds.filter((id) => !foundSet.has(id));
    if (missing.length) {
      throw new BadRequestException(
        `Review media not found: ${missing.join(', ')}`,
      );
    }
  }

  private async attachMedia(
    tx: Prisma.TransactionClient,
    reviewId: string,
    mediaIds: string[],
  ): Promise<void> {
    if (!mediaIds.length) return;
    await tx.productReviewMedia.createMany({
      data: mediaIds.map((mediaId, index) => ({
        reviewId,
        mediaId,
        sortOrder: index,
      })),
      skipDuplicates: true,
    });
  }

  private async findVerifiedOrderId(
    productId: string,
    userId: string,
    email?: string,
  ): Promise<string | null> {
    const customerOr: Prisma.OrderWhereInput[] = [{ customerUserId: userId }];
    if (email?.trim()) {
      customerOr.push({
        customerEmail: { equals: email.trim(), mode: 'insensitive' },
      });
    }
    const order = await this.prisma.order.findFirst({
      where: {
        status: { in: FULFILLED_STATUSES },
        OR: customerOr,
        items: { some: { productId } },
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });
    return order?.id ?? null;
  }

  private resolveAuthorName(name?: string, email?: string): string {
    const trimmed = name?.trim();
    if (trimmed) return trimmed;
    const local = email?.split('@')[0]?.trim();
    return local || 'Verified buyer';
  }

  private mediaUrl(media: {
    path: string;
    deliveryUrl: string | null;
  }): string {
    if (media.deliveryUrl) return media.deliveryUrl;
    if (media.path.startsWith('http')) return media.path;
    return `/media/file/${media.path}`;
  }

  private mediaKind(mimeType: string): 'image' | 'video' {
    return mimeType.startsWith('video/') ? 'video' : 'image';
  }

  private mapMedia(rows: ReviewMediaRow[]): ReviewMediaDto[] {
    return rows.map((rm) => ({
      id: rm.media.id,
      url: this.mediaUrl(rm.media),
      mimeType: rm.media.mimeType,
      kind: this.mediaKind(rm.media.mimeType),
    }));
  }

  private toPublicDto(row: PublicReviewRow) {
    const displayName =
      row.user?.firstName?.trim() || row.authorName?.trim() || 'Verified buyer';
    return {
      id: row.id,
      productId: row.productId,
      authorName: displayName,
      rating: row.rating,
      title: row.title,
      body: row.body,
      isVerified: row.isVerified,
      adminReply: row.adminReply,
      adminReplyAt: row.adminReplyAt,
      createdAt: row.createdAt,
      media: this.mapMedia(row.reviewMedia ?? []),
    };
  }

  private toFeaturedDto(row: FeaturedReviewRow) {
    const displayName =
      row.user?.firstName?.trim() || row.authorName?.trim() || 'Verified buyer';
    return {
      id: row.id,
      productId: row.productId,
      productName: row.product?.name ?? null,
      productSlug: row.product?.slug ?? null,
      authorName: displayName,
      rating: row.rating,
      title: row.title,
      body: row.body,
      isVerified: row.isVerified,
      createdAt: row.createdAt,
      media: this.mapMedia(row.reviewMedia ?? []),
    };
  }

  private toAdminDto(row: AdminReviewRow): AdminReviewDto {
    return {
      id: row.id,
      productId: row.productId,
      productName: row.product?.name ?? null,
      productSlug: row.product?.slug ?? null,
      userId: row.userId,
      orderId: row.orderId,
      authorName: row.authorName,
      authorEmail: row.authorEmail,
      rating: row.rating,
      title: row.title,
      body: row.body,
      status: row.status,
      source: row.source,
      isVerified: row.isVerified,
      featuredOnHomepage: row.featuredOnHomepage,
      adminReply: row.adminReply,
      adminReplyAt: row.adminReplyAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      media: this.mapMedia(row.reviewMedia ?? []),
    };
  }
}

export interface AdminReviewDto {
  id: string;
  productId: string;
  productName: string | null;
  productSlug: string | null;
  userId: string | null;
  orderId: string | null;
  authorName: string;
  authorEmail: string | null;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  source: ReviewSource;
  isVerified: boolean;
  featuredOnHomepage: boolean;
  adminReply: string | null;
  adminReplyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  media: ReviewMediaDto[];
}
