import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateOrderDto, CreateOrderPaymentMethod } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import {
  OrderResponseDto,
  OrderItemResponseDto,
  OrderStatusHistoryEntryDto,
} from './dto/order-response.dto';
import {
  QuoteResponseDto,
  QuoteLineItemDto,
} from './dto/quote-response.dto';
import { canTransitionOrderStatus } from './order-status.enum';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { CURRENCIES } from '../../common/constants/currency';
import { SettingsService } from '../settings/settings.service';
import { VouchersService } from '../vouchers/vouchers.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly settingsService: SettingsService,
    private readonly inventory: InventoryService,
    private readonly vouchersService: VouchersService,
  ) {}

  /** Resolve delivery charges from settings (0 = free delivery). Default free delivery when unset. */
  private async getDeliveryChargesCents(): Promise<number> {
    const delivery = await this.settingsService.getByKey('delivery');
    const cents = (delivery as { deliveryChargesCents?: number } | null)?.deliveryChargesCents;
    return typeof cents === 'number' && cents >= 0 ? cents : 0;
  }

  /**
   * Single source of truth for order totals. Computes from DB only; no client-supplied amounts.
   * Used by both quote() and create() so there is no room for calculation drift or integrity issues.
   */
  async computeOrderFromItems(
    items: Array<{ productId: string; quantity: number }>,
  ): Promise<{
    orderItemsData: Array<{ productId: string; quantity: number; unitCents: number }>;
    quoteItems: QuoteLineItemDto[];
    subtotalCents: number;
    currency: string;
  }> {
    if (!items?.length) {
      throw new BadRequestException('Order must have at least one item');
    }
    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, priceCents: true, currency: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const missing = productIds.filter((id) => !productMap.has(id));
    if (missing.length) {
      throw new BadRequestException(`Products not found: ${missing.join(', ')}`);
    }

    const currencies = [...new Set(items.map((item) => productMap.get(item.productId)!.currency))];
    if (currencies.length > 1) {
      throw new BadRequestException(
        'All items must be in the same currency. Please create separate orders for different currencies.',
      );
    }
    const rawCurrency =
      currencies[0] && (CURRENCIES as readonly string[]).includes(currencies[0]) ? currencies[0] : 'PKR';
    if (rawCurrency !== 'PKR') {
      throw new BadRequestException('Only PKR currency is supported for orders.');
    }
    const currency = 'PKR';

    let subtotalCents = 0;
    const orderItemsData: Array<{ productId: string; quantity: number; unitCents: number }> = [];
    const quoteItems: QuoteLineItemDto[] = [];

    for (const item of items) {
      const product = productMap.get(item.productId)!;
      const unitCents = product.priceCents;
      const lineTotalCents = unitCents * item.quantity;
      subtotalCents += lineTotalCents;
      orderItemsData.push({
        productId: item.productId,
        quantity: item.quantity,
        unitCents,
      });
      quoteItems.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitCents,
        lineTotalCents,
      });
    }

    return { orderItemsData, quoteItems, subtotalCents, currency };
  }

  /** Returns server-computed quote (no order created). All amounts from DB. */
  async quote(
    items: Array<{ productId: string; quantity: number }>,
    voucherCode?: string,
  ): Promise<QuoteResponseDto> {
    const { quoteItems, subtotalCents, currency } = await this.computeOrderFromItems(items);
    const shippingCents = await this.getDeliveryChargesCents();
    let discountCents = 0;
    let appliedVoucherCode: string | undefined;

    if (voucherCode?.trim()) {
      const voucherResult = await this.vouchersService.computeDiscountForOrder(
        voucherCode,
        items,
      );
      if (voucherResult) {
        discountCents = voucherResult.discountCents;
        appliedVoucherCode = voucherResult.voucherCode;
      }
    }

    const totalCents = Math.max(0, subtotalCents - discountCents + shippingCents);
    return {
      items: quoteItems,
      subtotalCents,
      shippingCents,
      discountCents,
      totalCents,
      currency,
      voucherCode: appliedVoucherCode,
    };
  }

  async create(
    dto: CreateOrderDto,
    customerUserId?: string | null,
    idempotencyKey?: string | null,
  ): Promise<OrderResponseDto> {
    const { orderItemsData, subtotalCents, currency } = await this.computeOrderFromItems(dto.items);
    const deliveryCents = await this.getDeliveryChargesCents();

    const voucherResult = await this.vouchersService.computeDiscountForOrder(
      dto.voucherCode,
      dto.items,
      customerUserId,
    );
    const discountCents = voucherResult?.discountCents ?? 0;
    const totalCents = Math.max(0, subtotalCents - discountCents + deliveryCents);

    const paymentMethod =
      dto.paymentMethod === CreateOrderPaymentMethod.BANK_DEPOSIT
        ? PaymentMethod.BANK_DEPOSIT
        : PaymentMethod.COD;
    if (paymentMethod === PaymentMethod.BANK_DEPOSIT && !dto.paymentProofMediaId?.trim()) {
      throw new BadRequestException(
        'Payment proof (screenshot) is required when payment method is Bank Deposit.',
      );
    }

    const customerFirstName = dto.customerFirstName?.trim() || undefined;
    const customerLastName = dto.customerLastName?.trim() || undefined;
    const customerName = [customerFirstName, customerLastName].filter(Boolean).join(' ').trim() || undefined;
    const key = idempotencyKey?.trim() || undefined;
    const include = this.orderInclude();

    const result = await this.prisma.$transaction(async (tx) => {
      if (key) {
        const existingOrderId = await this.inventory.getIdempotentOrderId(key, tx);
        if (existingOrderId) {
          const existing = await tx.order.findUnique({
            where: { id: existingOrderId },
            include,
          });
          if (existing) return { order: existing, skipEmail: true };
        }
      }

      const newOrder = await tx.order.create({
        data: {
          status: OrderStatus.PENDING,
          totalCents,
          currency,
          discountCents,
          voucherId: voucherResult?.voucherId ?? undefined,
          voucherCode: voucherResult?.voucherCode ?? undefined,
          customerEmail: dto.customerEmail,
          customerFirstName,
          customerLastName,
          customerName,
          customerPhone: dto.customerPhone?.trim() || undefined,
          shippingCountry: dto.shippingCountry?.trim() || undefined,
          shippingAddressLine1: dto.shippingAddressLine1?.trim() || undefined,
          shippingAddressLine2: dto.shippingAddressLine2?.trim() || undefined,
          paymentMethod,
          paymentProofMediaId: dto.paymentProofMediaId?.trim() || undefined,
          customerUserId: customerUserId ?? undefined,
          items: { create: orderItemsData },
          statusHistory: { create: { status: OrderStatus.PENDING } },
        },
        include,
      });

      if (voucherResult) {
        await tx.voucherRedemption.create({
          data: {
            voucherId: voucherResult.voucherId,
            orderId: newOrder.id,
            userId: customerUserId ?? undefined,
          },
        });
        await tx.voucher.update({
          where: { id: voucherResult.voucherId },
          data: { usedCount: { increment: 1 } },
        });
      }

      await this.inventory.deductForOrder(newOrder.id, orderItemsData, tx);
      if (key) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        await this.inventory.setIdempotencyKey(key, newOrder.id, expiresAt, tx);
      }
      return { order: newOrder, skipEmail: false };
    });

    if (!result.skipEmail) {
      await this.sendOrderConfirmationEmail(result.order);
    }
    return this.toResponseDto(result.order);
  }

  private async sendOrderConfirmationEmail(
    order: {
      id: string;
      customerEmail: string;
      customerName: string | null;
      totalCents: number;
      currency: string;
      createdAt: Date;
      items: Array<{
        quantity: number;
        unitCents: number;
        product: { name: string };
      }>;
    },
  ): Promise<void> {
    try {
      await this.mail.sendOrderConfirmation({
        to: order.customerEmail,
        orderId: order.id,
        customerName: order.customerName ?? undefined,
        totalCents: order.totalCents,
        currency: order.currency,
        orderDate: order.createdAt.toISOString(),
        items: order.items.map((i) => ({
          productName: i.product.name,
          quantity: i.quantity,
          unitCents: i.unitCents,
        })),
      });
    } catch (err) {
      console.warn('[OrdersService] Order confirmation email failed:', err);
    }
  }

  async findAll(
    query: OrderQueryDto,
  ): Promise<{ data: OrderResponseDto[]; total: number }> {
    const {
      page = 1,
      limit = 20,
      status,
      orderId,
      customerEmail,
      totalMinCents,
      totalMaxCents,
      dateFrom,
      dateTo,
      assignedToUserId,
    } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status;
    if (orderId?.trim()) {
      const pattern = `%${orderId.trim()}%`;
      const matching = await this.prisma.$queryRaw<[{ id: string }]>`
        SELECT id FROM orders WHERE id::text LIKE ${pattern}
      `;
      const ids = matching.map((r) => r.id);
      where.id = { in: ids };
    }
    if (customerEmail?.trim()) {
      where.customerEmail = { contains: customerEmail.trim(), mode: 'insensitive' };
    }
    if (totalMinCents != null && totalMaxCents != null && totalMinCents >= 0 && totalMaxCents >= 0) {
      where.totalCents = { gte: totalMinCents, lte: totalMaxCents };
    } else if (totalMinCents != null && totalMinCents >= 0) {
      where.totalCents = { gte: totalMinCents };
    } else if (totalMaxCents != null && totalMaxCents >= 0) {
      where.totalCents = { lte: totalMaxCents };
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }
    if (assignedToUserId !== undefined && assignedToUserId !== '') {
      const userExists = await this.prisma.user.findUnique({
        where: { id: assignedToUserId },
        select: { id: true },
      });
      if (!userExists) {
        throw new BadRequestException('No user found with the given assigned staff ID.');
      }
      where.assignedToUserId = assignedToUserId;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: this.orderInclude(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data: orders.map((o) => this.toResponseDto(o)), total };
  }

  async findOne(id: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderInclude(),
    });
    if (!order) {
      throw new NotFoundException(`Order with id "${id}" not found`);
    }
    return this.toResponseDto(order);
  }

  /** Customer-facing: list orders for the given customer (ownership enforced). */
  async findMyOrders(
    customerUserId: string,
    query: { page?: number; limit?: number },
  ): Promise<{ data: OrderResponseDto[]; total: number }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = { customerUserId };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: this.orderInclude(),
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data: orders.map((o) => this.toResponseDto(o)), total };
  }

  /** Customer-facing: get one order by id only if it belongs to the customer (403-style not found). */
  async findOneByCustomer(customerUserId: string, orderId: string): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerUserId },
      include: this.orderInclude(),
    });
    if (!order) {
      throw new NotFoundException(`Order not found`);
    }
    return this.toResponseDto(order);
  }

  async update(id: string, dto: UpdateOrderDto): Promise<OrderResponseDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderInclude(),
    });
    if (!order) {
      throw new NotFoundException(`Order with id "${id}" not found`);
    }

    const updates: Prisma.OrderUpdateInput = {};

    if (dto.status !== undefined && dto.status !== order.status) {
      if (!canTransitionOrderStatus(order.status, dto.status)) {
        throw new BadRequestException(
          `Invalid status transition from ${order.status} to ${dto.status}`,
        );
      }
      updates.status = dto.status;
      updates.statusHistory = {
        create: { status: dto.status },
      };
    }

    if (dto.courierServiceName !== undefined) updates.courierServiceName = dto.courierServiceName;
    if (dto.trackingId !== undefined) updates.trackingId = dto.trackingId;

    if (dto.assignedToUserId !== undefined) {
      if (dto.assignedToUserId) {
        const user = await this.prisma.user.findUnique({
          where: { id: dto.assignedToUserId },
        });
        if (!user) {
          throw new BadRequestException(
            `User with id "${dto.assignedToUserId}" not found`,
          );
        }
        updates.assignedTo = { connect: { id: dto.assignedToUserId } };
      } else {
        updates.assignedTo = { disconnect: true };
      }
    }

    const isTransitionToCancelled =
      dto.status !== undefined &&
      dto.status === OrderStatus.CANCELLED &&
      order.status !== OrderStatus.CANCELLED;

    const updated = isTransitionToCancelled
      ? await this.prisma.$transaction(async (tx) => {
          const updatedOrder = await tx.order.update({
            where: { id },
            data: updates,
            include: this.orderInclude(),
          });
          await this.inventory.restoreForOrder(id, tx);
          return updatedOrder;
        })
      : await this.prisma.order.update({
          where: { id },
          data: updates,
          include: this.orderInclude(),
        });

    if (dto.status !== undefined && dto.status !== order.status) {
      this.sendStatusChangeEmail(updated, dto.status).catch((err) => {
        console.warn(`[OrdersService] Order ${updated.id} status-change email failed:`, err);
      });
    }

    return this.toResponseDto(updated);
  }

  async assignStaff(
    orderId: string,
    userId: string | null,
  ): Promise<OrderResponseDto> {
    return this.update(orderId, { assignedToUserId: userId ?? undefined });
  }

  private async sendStatusChangeEmail(
    order: {
      id: string;
      customerEmail: string;
      statusHistory: Array<{ status: OrderStatus; createdAt: Date }>;
    },
    newStatus: OrderStatus,
  ): Promise<void> {
    const latestEntry = order.statusHistory[order.statusHistory.length - 1];
    const statusUpdatedAt = latestEntry
      ? latestEntry.createdAt.toISOString()
      : new Date().toISOString();
    await this.mail.sendOrderStatusChange({
      to: order.customerEmail,
      orderId: order.id,
      status: newStatus,
      statusUpdatedAt,
    });
  }

  private orderInclude() {
    return {
      items: {
        include: {
          product: {
            include: {
              productMedia: {
                take: 1,
                orderBy: { sortOrder: 'asc' as const },
                include: { media: { select: { path: true } } },
              },
            },
          },
        },
      },
      statusHistory: { orderBy: { createdAt: 'asc' as const } },
      assignedTo: { select: { id: true, name: true } },
      paymentProof: { select: { path: true } },
    };
  }

  private productImagePath(
    product: { productMedia?: Array<{ media: { path: string } }> },
  ): string | null {
    const first = product.productMedia?.[0]?.media?.path;
    return first ? `/media/file/${first}` : null;
  }

  private toResponseDto(order: {
    id: string;
    status: OrderStatus;
    totalCents: number;
    currency: string;
    voucherCode?: string | null;
    discountCents?: number;
    customerEmail: string;
    customerFirstName: string | null;
    customerLastName: string | null;
    customerName: string | null;
    customerPhone: string | null;
    shippingCountry: string | null;
    shippingAddressLine1: string | null;
    shippingAddressLine2: string | null;
    shippingCity: string | null;
    shippingPostalCode: string | null;
    paymentMethod: PaymentMethod;
    paymentProof: { path: string } | null;
    courierServiceName: string | null;
    trackingId: string | null;
    assignedToUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      productId: string;
      quantity: number;
      unitCents: number;
      product: {
        id: string;
        name: string;
        productMedia?: Array<{ media: { path: string } }>;
      };
    }>;
    statusHistory: Array<{ status: OrderStatus; createdAt: Date }>;
    assignedTo: { id: string; name: string } | null;
  }): OrderResponseDto {
    const items: OrderItemResponseDto[] = order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      productImage: this.productImagePath(i.product),
      quantity: i.quantity,
      unitCents: i.unitCents,
    }));
    const statusHistory: OrderStatusHistoryEntryDto[] =
      order.statusHistory.map((h) => ({
        status: h.status,
        createdAt: h.createdAt.toISOString(),
      }));
    return {
      id: order.id,
      status: order.status,
      totalCents: order.totalCents,
      currency: order.currency,
      voucherCode: order.voucherCode ?? null,
      discountCents: order.discountCents ?? 0,
      customerEmail: order.customerEmail,
      customerFirstName: order.customerFirstName ?? null,
      customerLastName: order.customerLastName ?? null,
      customerName: order.customerName ?? ([order.customerFirstName, order.customerLastName].filter(Boolean).join(' ').trim() || null),
      customerPhone: order.customerPhone ?? null,
      shippingCountry: order.shippingCountry ?? null,
      shippingAddressLine1: order.shippingAddressLine1 ?? null,
      shippingAddressLine2: order.shippingAddressLine2 ?? null,
      shippingCity: order.shippingCity ?? null,
      shippingPostalCode: order.shippingPostalCode ?? null,
      paymentMethod: order.paymentMethod,
      paymentProofPath: order.paymentProof?.path ?? null,
      courierServiceName: order.courierServiceName ?? null,
      trackingId: order.trackingId ?? null,
      assignedToUserId: order.assignedToUserId,
      assignedToUserName: order.assignedTo?.name ?? null,
      items,
      statusHistory,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
