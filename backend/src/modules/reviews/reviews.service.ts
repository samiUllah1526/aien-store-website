import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma, ReviewStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewQueryDto } from './dto/review-query.dto';

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

type ReviewRow = Prisma.ProductReviewGetPayload<{
  include: { user: { select: { name: true; firstName: true } } };
}>;

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Public storefront
  // ---------------------------------------------------------------------------

  /** Approved reviews for a product (public), newest first, paginated. */
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
        include: { user: { select: { name: true, firstName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.productReview.count({ where }),
      this.getSummary(productId),
    ]);
    return { data: rows.map((r) => this.toPublicDto(r)), total, summary };
  }

  /** Aggregate rating for a product (approved reviews only). */
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

  /**
   * Whether the given authenticated user may review this product. Requires a
   * fulfilled order (SHIPPED/DELIVERED) containing the product, matched by user
   * id or the user's email, and that they have not already reviewed it.
   */
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

  /** Create a verified review. Rejects non-purchasers and duplicate reviews. */
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

    const authorName = this.resolveAuthorName(author.name, author.email);
    const created = await this.prisma.productReview.create({
      data: {
        productId,
        userId: author.userId,
        orderId,
        authorName,
        authorEmail: author.email ?? '',
        rating: dto.rating,
        title: dto.title?.trim() || null,
        body: dto.body.trim(),
        status: ReviewStatus.APPROVED,
        isVerified: true,
      },
      include: { user: { select: { name: true, firstName: true } } },
    });
    return this.toPublicDto(created);
  }

  // ---------------------------------------------------------------------------
  // Admin moderation
  // ---------------------------------------------------------------------------

  async findAll(
    query: ReviewQueryDto,
  ): Promise<{ data: AdminReviewDto[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      productId,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.ProductReviewWhereInput = {};
    if (productId) where.productId = productId;
    if (status) where.status = status as ReviewStatus;
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
        include: { product: { select: { name: true, slug: true } } },
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
      include: { product: { select: { name: true, slug: true } } },
    });
    if (!row) throw new NotFoundException(`Review ${id} not found`);
    return this.toAdminDto(row);
  }

  async moderate(id: string, status: ReviewStatus): Promise<AdminReviewDto> {
    await this.ensureExists(id);
    const row = await this.prisma.productReview.update({
      where: { id },
      data: { status },
      include: { product: { select: { name: true, slug: true } } },
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
      include: { product: { select: { name: true, slug: true } } },
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

  /** Returns the id of a fulfilled order for this user containing the product, or null. */
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

  private toPublicDto(row: ReviewRow) {
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
    };
  }

  private toAdminDto(
    row: Prisma.ProductReviewGetPayload<{
      include: { product: { select: { name: true; slug: true } } };
    }>,
  ): AdminReviewDto {
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
      isVerified: row.isVerified,
      adminReply: row.adminReply,
      adminReplyAt: row.adminReplyAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export interface AdminReviewDto {
  id: string;
  productId: string;
  productName: string | null;
  productSlug: string | null;
  userId: string;
  orderId: string | null;
  authorName: string;
  authorEmail: string;
  rating: number;
  title: string | null;
  body: string;
  status: ReviewStatus;
  isVerified: boolean;
  adminReply: string | null;
  adminReplyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
