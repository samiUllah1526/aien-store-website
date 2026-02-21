import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VoucherAuditService } from './voucher-audit.service';
import type { VoucherAuditContext } from './dto/voucher-audit-context.dto';
import { CreateVoucherDto, VoucherTypeDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { VoucherQueryDto } from './dto/voucher-query.dto';
import { VoucherAuditQueryDto } from './dto/voucher-audit-query.dto';
import { ValidateVoucherDto } from './dto/validate-voucher.dto';
import { VoucherType } from '@prisma/client';
import { Prisma } from '@prisma/client';

/** Standard error codes for voucher validation (customer-facing). */
export const VOUCHER_ERROR_CODES = {
  NOT_FOUND: 'VOUCHER_NOT_FOUND',
  EXPIRED: 'VOUCHER_EXPIRED',
  NOT_STARTED: 'VOUCHER_NOT_STARTED',
  INACTIVE: 'VOUCHER_INACTIVE',
  USAGE_LIMIT_REACHED: 'VOUCHER_USAGE_LIMIT_REACHED',
  USER_LIMIT_REACHED: 'VOUCHER_USER_LIMIT_REACHED',
  MIN_ORDER_NOT_MET: 'VOUCHER_MIN_ORDER_NOT_MET',
  NO_ELIGIBLE_PRODUCTS: 'VOUCHER_NO_ELIGIBLE_PRODUCTS',
} as const;

export interface ValidateVoucherResult {
  valid: true;
  voucherId: string;
  code: string;
  type: string;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  subtotalCents: number;
  currency: string;
}

export interface ValidateVoucherError {
  valid: false;
  errorCode: string;
  message: string;
}

@Injectable()
export class VouchersService {
  private readonly logger = new Logger(VouchersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: VoucherAuditService,
  ) {}

  private toVoucherType(dto: VoucherTypeDto): VoucherType {
    return dto as unknown as VoucherType;
  }

  private async getDeliveryChargesCents(): Promise<number> {
    const delivery = await this.prisma.siteSetting.findUnique({
      where: { key: 'delivery' },
    });
    const value = delivery?.value as { deliveryChargesCents?: number } | null;
    const cents = value?.deliveryChargesCents;
    return typeof cents === 'number' && cents >= 0 ? cents : 0;
  }

  /** Check product/category eligibility for voucher. */
  private async getEligibleSubtotalCents(
    items: Array<{ productId: string; quantity: number }>,
    applicableProductIds: string[] | null,
    applicableCategoryIds: string[] | null,
  ): Promise<{ eligibleSubtotalCents: number; allProductIds: string[] }> {
    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, priceCents: true, productCategories: { select: { categoryId: true } } },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let eligibleSubtotalCents = 0;
    const eligibleProductIds: string[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;

      if (applicableProductIds?.length) {
        if (!applicableProductIds.includes(product.id)) continue;
      }
      if (applicableCategoryIds?.length) {
        const productCategoryIds = product.productCategories.map((pc) => pc.categoryId);
        const hasMatch = applicableCategoryIds.some((cid) => productCategoryIds.includes(cid));
        if (!hasMatch) continue;
      }

      eligibleSubtotalCents += product.priceCents * item.quantity;
      eligibleProductIds.push(product.id);
    }

    return { eligibleSubtotalCents, allProductIds: productIds };
  }

  /** Compute discount in cents for a voucher given eligible subtotal and shipping. */
  private computeDiscountCents(
    voucher: { type: VoucherType; value: number; maxDiscountCents: number | null },
    eligibleSubtotalCents: number,
    shippingCents: number,
    /** Order total (subtotal + shipping) - discount must never exceed this. */
    orderTotalCents: number,
  ): number {
    switch (voucher.type) {
      case 'PERCENTAGE': {
        const raw = Math.floor((eligibleSubtotalCents * voucher.value) / 100);
        const cap = voucher.maxDiscountCents ?? raw;
        const byCap = Math.min(raw, cap);
        return Math.min(byCap, orderTotalCents);
      }
      case 'FIXED_AMOUNT':
        return Math.min(voucher.value, eligibleSubtotalCents, orderTotalCents);
      case 'FREE_SHIPPING':
        // When shipping is already free, discount is 0
        if (shippingCents <= 0) return 0;
        return Math.min(shippingCents, orderTotalCents);
      default:
        return 0;
    }
  }

  /** Validate voucher for customer checkout. Returns result or error. */
  async validate(
    dto: ValidateVoucherDto,
    auditCtx?: VoucherAuditContext,
  ): Promise<ValidateVoucherResult | ValidateVoucherError> {
    const code = dto.code?.trim().toUpperCase();
    if (!code) {
      return { valid: false, errorCode: VOUCHER_ERROR_CODES.NOT_FOUND, message: 'Voucher code is required.' };
    }

    const voucher = await this.prisma.voucher.findFirst({
      where: {
        code: { equals: code, mode: 'insensitive' },
        deletedAt: null,
      },
    });

    if (!voucher) {
      this.logger.warn(`Voucher validation failed: code=${code} error=NOT_FOUND`);
      this.audit.publishAsync({
        action: 'VALIDATION_FAILED',
        actorType: 'CUSTOMER',
        actorId: dto.customerUserId ?? auditCtx?.actorId ?? null,
        code,
        result: 'INVALID',
        errorCode: VOUCHER_ERROR_CODES.NOT_FOUND,
        requestId: auditCtx?.requestId ?? null,
      });
      return { valid: false, errorCode: VOUCHER_ERROR_CODES.NOT_FOUND, message: 'Invalid voucher code.' };
    }

    const now = new Date();
    if (voucher.expiryDate < now) {
      this.logger.warn(`Voucher validation failed: code=${code} error=EXPIRED`);
      this.audit.publishAsync({
        voucherId: voucher.id,
        action: 'VALIDATION_FAILED',
        actorType: 'CUSTOMER',
        actorId: dto.customerUserId ?? auditCtx?.actorId ?? null,
        code,
        result: 'INVALID',
        errorCode: VOUCHER_ERROR_CODES.EXPIRED,
        requestId: auditCtx?.requestId ?? null,
      });
      return { valid: false, errorCode: VOUCHER_ERROR_CODES.EXPIRED, message: 'This voucher has expired.' };
    }
    if (voucher.startDate > now) {
      this.audit.publishAsync({
        voucherId: voucher.id,
        action: 'VALIDATION_FAILED',
        actorType: 'CUSTOMER',
        actorId: dto.customerUserId ?? auditCtx?.actorId ?? null,
        code,
        result: 'INVALID',
        errorCode: VOUCHER_ERROR_CODES.NOT_STARTED,
        requestId: auditCtx?.requestId ?? null,
      });
      return { valid: false, errorCode: VOUCHER_ERROR_CODES.NOT_STARTED, message: 'This voucher is not yet valid.' };
    }
    if (!voucher.isActive) {
      this.audit.publishAsync({
        voucherId: voucher.id,
        action: 'VALIDATION_FAILED',
        actorType: 'CUSTOMER',
        actorId: dto.customerUserId ?? auditCtx?.actorId ?? null,
        code,
        result: 'INVALID',
        errorCode: VOUCHER_ERROR_CODES.INACTIVE,
        requestId: auditCtx?.requestId ?? null,
      });
      return { valid: false, errorCode: VOUCHER_ERROR_CODES.INACTIVE, message: 'This voucher is no longer active.' };
    }

    if (voucher.usageLimitGlobal != null && voucher.usedCount >= voucher.usageLimitGlobal) {
      this.audit.publishAsync({
        voucherId: voucher.id,
        action: 'VALIDATION_FAILED',
        actorType: 'CUSTOMER',
        actorId: dto.customerUserId ?? auditCtx?.actorId ?? null,
        code,
        result: 'INVALID',
        errorCode: VOUCHER_ERROR_CODES.USAGE_LIMIT_REACHED,
        requestId: auditCtx?.requestId ?? null,
      });
      return {
        valid: false,
        errorCode: VOUCHER_ERROR_CODES.USAGE_LIMIT_REACHED,
        message: 'This voucher has reached its usage limit.',
      };
    }

    if (voucher.usageLimitPerUser != null && dto.customerUserId) {
      const userRedemptions = await this.prisma.voucherRedemption.count({
        where: { voucherId: voucher.id, userId: dto.customerUserId },
      });
      if (userRedemptions >= voucher.usageLimitPerUser) {
        this.audit.publishAsync({
          voucherId: voucher.id,
          action: 'VALIDATION_FAILED',
          actorType: 'CUSTOMER',
          actorId: dto.customerUserId ?? auditCtx?.actorId ?? null,
          code,
          result: 'INVALID',
          errorCode: VOUCHER_ERROR_CODES.USER_LIMIT_REACHED,
          requestId: auditCtx?.requestId ?? null,
        });
        return {
          valid: false,
          errorCode: VOUCHER_ERROR_CODES.USER_LIMIT_REACHED,
          message: 'You have already used this voucher the maximum number of times.',
        };
      }
    }

    const applicableProductIds = (voucher.applicableProductIds as string[] | null) ?? null;
    const applicableCategoryIds = (voucher.applicableCategoryIds as string[] | null) ?? null;

    const { eligibleSubtotalCents } = await this.getEligibleSubtotalCents(
      dto.items,
      applicableProductIds?.length ? applicableProductIds : null,
      applicableCategoryIds?.length ? applicableCategoryIds : null,
    );

    const products = await this.prisma.product.findMany({
      where: { id: { in: dto.items.map((i) => i.productId) } },
      select: { id: true, priceCents: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    let subtotalCents = 0;
    for (const item of dto.items) {
      const p = productMap.get(item.productId);
      if (p) subtotalCents += p.priceCents * item.quantity;
    }

    const minOrder = voucher.minOrderValueCents ?? 0;
    if (subtotalCents < minOrder) {
      this.audit.publishAsync({
        voucherId: voucher.id,
        action: 'VALIDATION_FAILED',
        actorType: 'CUSTOMER',
        actorId: dto.customerUserId ?? auditCtx?.actorId ?? null,
        code,
        result: 'INVALID',
        errorCode: VOUCHER_ERROR_CODES.MIN_ORDER_NOT_MET,
        requestId: auditCtx?.requestId ?? null,
      });
      return {
        valid: false,
        errorCode: VOUCHER_ERROR_CODES.MIN_ORDER_NOT_MET,
        message: `Minimum order value of ${(minOrder / 100).toFixed(0)} PKR required.`,
      };
    }

    if (eligibleSubtotalCents === 0 && (applicableProductIds?.length || applicableCategoryIds?.length)) {
      this.audit.publishAsync({
        voucherId: voucher.id,
        action: 'VALIDATION_FAILED',
        actorType: 'CUSTOMER',
        actorId: dto.customerUserId ?? auditCtx?.actorId ?? null,
        code,
        result: 'INVALID',
        errorCode: VOUCHER_ERROR_CODES.NO_ELIGIBLE_PRODUCTS,
        requestId: auditCtx?.requestId ?? null,
      });
      return {
        valid: false,
        errorCode: VOUCHER_ERROR_CODES.NO_ELIGIBLE_PRODUCTS,
        message: 'No items in your cart are eligible for this voucher.',
      };
    }

    const shippingCents = await this.getDeliveryChargesCents();
    const orderTotalCents = subtotalCents + shippingCents;
    const discountCents = this.computeDiscountCents(
      {
        type: voucher.type,
        value: voucher.value,
        maxDiscountCents: voucher.maxDiscountCents,
      },
      eligibleSubtotalCents,
      shippingCents,
      orderTotalCents,
    );

    const totalCents = Math.max(0, orderTotalCents - discountCents);

    this.logger.log(`Voucher validated: code=${code} valid=true discountCents=${discountCents}`);
    this.audit.publishAsync({
      voucherId: voucher.id,
      action: 'VALIDATED',
      actorType: 'CUSTOMER',
      actorId: dto.customerUserId ?? auditCtx?.actorId ?? null,
      code,
      result: 'VALID',
      metadata: { discountCents, subtotalCents, totalCents },
      requestId: auditCtx?.requestId ?? null,
    });

    return {
      valid: true,
      voucherId: voucher.id,
      code: voucher.code,
      type: voucher.type,
      discountCents,
      shippingCents,
      totalCents,
      subtotalCents,
      currency: 'PKR',
    };
  }

  /** Compute discount for order/quote (internal). Set throwOnInvalid=true for checkout to reject invalid vouchers. */
  async computeDiscountForOrder(
    voucherCode: string | undefined,
    items: Array<{ productId: string; quantity: number }>,
    customerUserId?: string | null,
    throwOnInvalid = false,
  ): Promise<{ voucherId: string; voucherCode: string; discountCents: number; discountType: string } | null> {
    if (!voucherCode?.trim()) return null;
    const result = await this.validate({
      code: voucherCode.trim(),
      items,
      customerUserId: customerUserId ?? undefined,
    });
    if (!result.valid) {
      if (throwOnInvalid) {
        throw new BadRequestException(
          result.message || 'Voucher is no longer valid. Please remove it and try again.',
        );
      }
      return null;
    }
    return {
      voucherId: result.voucherId,
      voucherCode: result.code,
      discountCents: result.discountCents,
      discountType: result.type,
    };
  }

  async create(dto: CreateVoucherDto, auditCtx?: VoucherAuditContext) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.voucher.findFirst({
      where: { code: { equals: code, mode: 'insensitive' }, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Voucher with code "${code}" already exists`);
    }

    const startDate = new Date(dto.startDate);
    const expiryDate = new Date(dto.expiryDate);
    if (expiryDate <= startDate) {
      throw new BadRequestException('Expiry date must be after start date');
    }

    if (dto.type === VoucherTypeDto.PERCENTAGE && (dto.value < 1 || dto.value > 100)) {
      throw new BadRequestException('Percentage value must be between 1 and 100');
    }
    if (dto.type === VoucherTypeDto.FIXED_AMOUNT && dto.value < 1) {
      throw new BadRequestException('Fixed amount must be positive');
    }

    const voucher = await this.prisma.voucher.create({
      data: {
        code,
        type: this.toVoucherType(dto.type),
        value: dto.value,
        minOrderValueCents: dto.minOrderValueCents ?? 0,
        maxDiscountCents: dto.maxDiscountCents ?? undefined,
        startDate,
        expiryDate,
        usageLimitGlobal: dto.usageLimitGlobal ?? undefined,
        usageLimitPerUser: dto.usageLimitPerUser ?? undefined,
        applicableProductIds: dto.applicableProductIds?.length ? dto.applicableProductIds : undefined,
        applicableCategoryIds: dto.applicableCategoryIds?.length ? dto.applicableCategoryIds : undefined,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.publish({
      voucherId: voucher.id,
      action: 'CREATED',
      actorType: 'ADMIN',
      actorId: auditCtx?.actorId ?? null,
      code: voucher.code,
      result: 'VALID',
      metadata: { type: voucher.type, value: voucher.value },
      requestId: auditCtx?.requestId ?? null,
    });
    return this.toResponseDto(voucher);
  }

  async findAll(query: VoucherQueryDto) {
    const { page = 1, limit = 20, search, statusFilter, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.VoucherWhereInput = { deletedAt: null };

    if (search?.trim()) {
      where.code = { contains: search.trim(), mode: 'insensitive' };
    }

    const now = new Date();
    if (statusFilter === 'active') {
      where.isActive = true;
      where.startDate = { lte: now };
      where.expiryDate = { gte: now };
    } else if (statusFilter === 'expired') {
      where.expiryDate = { lt: now };
    } else if (statusFilter === 'upcoming') {
      where.startDate = { gt: now };
    }

    const [items, total] = await Promise.all([
      this.prisma.voucher.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.voucher.count({ where }),
    ]);

    return {
      data: items.map((v) => this.toResponseDto(v)),
      total,
    };
  }

  async findOne(id: string) {
    const voucher = await this.prisma.voucher.findFirst({
      where: { id, deletedAt: null },
    });
    if (!voucher) throw new NotFoundException('Voucher not found');
    return this.toResponseDto(voucher);
  }

  async update(id: string, dto: UpdateVoucherDto, auditCtx?: VoucherAuditContext) {
    const existing = await this.prisma.voucher.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Voucher not found');

    if (dto.code != null) {
      const code = dto.code.trim().toUpperCase();
      const duplicate = await this.prisma.voucher.findFirst({
        where: {
          code: { equals: code, mode: 'insensitive' },
          deletedAt: null,
          id: { not: id },
        },
      });
      if (duplicate) throw new ConflictException(`Voucher with code "${code}" already exists`);
    }

    const data: Prisma.VoucherUpdateInput = {};
    if (dto.code != null) data.code = dto.code.trim().toUpperCase();
    if (dto.type != null) data.type = this.toVoucherType(dto.type as VoucherTypeDto);
    if (dto.value != null) data.value = dto.value;
    if (dto.minOrderValueCents != null) data.minOrderValueCents = dto.minOrderValueCents;
    if (dto.maxDiscountCents != null) data.maxDiscountCents = dto.maxDiscountCents;
    if (dto.startDate != null) data.startDate = new Date(dto.startDate);
    if (dto.expiryDate != null) data.expiryDate = new Date(dto.expiryDate);
    if (dto.usageLimitGlobal != null) data.usageLimitGlobal = dto.usageLimitGlobal;
    if (dto.usageLimitPerUser != null) data.usageLimitPerUser = dto.usageLimitPerUser;
    if (dto.applicableProductIds != null) data.applicableProductIds = dto.applicableProductIds;
    if (dto.applicableCategoryIds != null) data.applicableCategoryIds = dto.applicableCategoryIds;
    if (dto.isActive != null) data.isActive = dto.isActive;

    if (dto.expiryDate != null && dto.startDate != null) {
      const exp = new Date(dto.expiryDate);
      const start = new Date(dto.startDate);
      if (exp <= start) throw new BadRequestException('Expiry date must be after start date');
    }

    const voucher = await this.prisma.voucher.update({
      where: { id },
      data,
    });
    const changes: Record<string, unknown> = {};
    if (dto.code != null) changes.code = dto.code;
    if (dto.type != null) changes.type = dto.type;
    if (dto.value != null) changes.value = dto.value;
    if (dto.minOrderValueCents != null) changes.minOrderValueCents = dto.minOrderValueCents;
    if (dto.maxDiscountCents != null) changes.maxDiscountCents = dto.maxDiscountCents;
    if (dto.startDate != null) changes.startDate = dto.startDate;
    if (dto.expiryDate != null) changes.expiryDate = dto.expiryDate;
    if (dto.usageLimitGlobal != null) changes.usageLimitGlobal = dto.usageLimitGlobal;
    if (dto.usageLimitPerUser != null) changes.usageLimitPerUser = dto.usageLimitPerUser;
    if (dto.isActive != null) changes.isActive = dto.isActive;
    await this.audit.publish({
      voucherId: voucher.id,
      action: 'UPDATED',
      actorType: 'ADMIN',
      actorId: auditCtx?.actorId ?? null,
      metadata: { changes },
      requestId: auditCtx?.requestId ?? null,
    });
    return this.toResponseDto(voucher);
  }

  async updateStatus(id: string, isActive: boolean, auditCtx?: VoucherAuditContext) {
    const voucher = await this.prisma.voucher.findFirst({
      where: { id, deletedAt: null },
    });
    if (!voucher) throw new NotFoundException('Voucher not found');
    const updated = await this.prisma.voucher.update({
      where: { id },
      data: { isActive },
    });
    await this.audit.publish({
      voucherId: voucher.id,
      action: isActive ? 'ACTIVATED' : 'DEACTIVATED',
      actorType: 'ADMIN',
      actorId: auditCtx?.actorId ?? null,
      metadata: { isActive },
      requestId: auditCtx?.requestId ?? null,
    });
    return this.toResponseDto(updated);
  }

  /** Soft delete. */
  async remove(id: string, auditCtx?: VoucherAuditContext) {
    const voucher = await this.prisma.voucher.findFirst({
      where: { id, deletedAt: null },
    });
    if (!voucher) throw new NotFoundException('Voucher not found');
    await this.prisma.voucher.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.audit.publish({
      voucherId: voucher.id,
      action: 'DELETED',
      actorType: 'ADMIN',
      actorId: auditCtx?.actorId ?? null,
      code: voucher.code,
      metadata: { type: voucher.type },
      requestId: auditCtx?.requestId ?? null,
    });
    return { success: true };
  }

  async findAuditLogs(query: VoucherAuditQueryDto): Promise<{ data: unknown[]; total: number }> {
    const { page = 1, limit = 20, action, code, actorId, from, to } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.VoucherAuditLogWhereInput = {};
    if (action?.trim()) where.action = action.trim();
    if (code?.trim()) where.code = { contains: code.trim(), mode: 'insensitive' };
    if (actorId?.trim()) where.actorId = actorId.trim();
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const [logs, total] = await Promise.all([
      this.prisma.voucherAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.voucherAuditLog.count({ where }),
    ]);
    return {
      data: logs.map((l) => ({
        id: l.id,
        voucherId: l.voucherId,
        action: l.action,
        actorType: l.actorType,
        actorId: l.actorId,
        orderId: l.orderId,
        code: l.code,
        result: l.result,
        errorCode: l.errorCode,
        metadata: l.metadata,
        requestId: l.requestId,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
    };
  }

  async findAuditLogsByVoucher(
    voucherId: string,
    query: VoucherAuditQueryDto,
  ): Promise<{ data: unknown[]; total: number }> {
    const voucher = await this.prisma.voucher.findFirst({
      where: { id: voucherId, deletedAt: null },
      select: { id: true },
    });
    if (!voucher) throw new NotFoundException('Voucher not found');
    const { page = 1, limit = 20, action, from, to } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.VoucherAuditLogWhereInput = { voucherId };
    if (action?.trim()) where.action = action.trim();
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const [logs, total] = await Promise.all([
      this.prisma.voucherAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.voucherAuditLog.count({ where }),
    ]);
    return {
      data: logs.map((l) => ({
        id: l.id,
        voucherId: l.voucherId,
        action: l.action,
        actorType: l.actorType,
        actorId: l.actorId,
        orderId: l.orderId,
        code: l.code,
        result: l.result,
        errorCode: l.errorCode,
        metadata: l.metadata,
        requestId: l.requestId,
        createdAt: l.createdAt.toISOString(),
      })),
      total,
    };
  }

  async getStats(id: string) {
    const voucher = await this.prisma.voucher.findFirst({
      where: { id, deletedAt: null },
    });
    if (!voucher) throw new NotFoundException('Voucher not found');

    const redemptions = await this.prisma.voucherRedemption.findMany({
      where: { voucherId: id },
      include: { order: { select: { id: true, discountCents: true, totalCents: true, createdAt: true } } },
    });

    const totalRedemptions = redemptions.length;
    const revenueImpactCents = redemptions.reduce((sum, r) => sum + (r.order.discountCents ?? 0), 0);
    const remaining = voucher.usageLimitGlobal != null
      ? Math.max(0, voucher.usageLimitGlobal - voucher.usedCount)
      : null;

    return {
      totalRedemptions,
      revenueImpactCents,
      remainingUses: remaining,
      usedCount: voucher.usedCount,
      usageLimitGlobal: voucher.usageLimitGlobal,
      redemptions: redemptions.map((r) => ({
        id: r.id,
        orderId: r.orderId,
        userId: r.userId,
        createdAt: r.createdAt.toISOString(),
        order: { id: r.order.id, discountCents: r.order.discountCents, totalCents: r.order.totalCents, createdAt: r.order.createdAt.toISOString() },
      })),
    };
  }

  private toResponseDto(v: {
    id: string;
    code: string;
    type: string;
    value: number;
    minOrderValueCents: number;
    maxDiscountCents: number | null;
    startDate: Date;
    expiryDate: Date;
    usageLimitGlobal: number | null;
    usageLimitPerUser: number | null;
    usedCount: number;
    applicableProductIds: unknown;
    applicableCategoryIds: unknown;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: v.id,
      code: v.code,
      type: v.type,
      value: v.value,
      minOrderValueCents: v.minOrderValueCents,
      maxDiscountCents: v.maxDiscountCents,
      startDate: v.startDate.toISOString(),
      expiryDate: v.expiryDate.toISOString(),
      usageLimitGlobal: v.usageLimitGlobal,
      usageLimitPerUser: v.usageLimitPerUser,
      usedCount: v.usedCount,
      applicableProductIds: (v.applicableProductIds as string[]) ?? [],
      applicableCategoryIds: (v.applicableCategoryIds as string[]) ?? [],
      isActive: v.isActive,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    };
  }
}
