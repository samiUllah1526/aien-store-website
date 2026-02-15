import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateOrderDto } from './dto/create-order.dto';
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
import { OrderStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { CURRENCIES } from '../../common/constants/currency';
import { SHIPPING_COST_CENTS } from './constants';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

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
  async quote(items: Array<{ productId: string; quantity: number }>): Promise<QuoteResponseDto> {
    const { quoteItems, subtotalCents, currency } = await this.computeOrderFromItems(items);
    const totalCents = subtotalCents + SHIPPING_COST_CENTS;
    return {
      items: quoteItems,
      subtotalCents,
      shippingCents: SHIPPING_COST_CENTS,
      totalCents,
      currency,
    };
  }

  async create(dto: CreateOrderDto, customerUserId?: string | null): Promise<OrderResponseDto> {
    const { orderItemsData, subtotalCents, currency } = await this.computeOrderFromItems(dto.items);

    const order = await this.prisma.order.create({
      data: {
        status: OrderStatus.PENDING,
        totalCents: subtotalCents,
        currency,
        customerEmail: dto.customerEmail,
        customerName: dto.customerName?.trim() || undefined,
        customerPhone: dto.customerPhone?.trim() || undefined,
        shippingCountry: dto.shippingCountry?.trim() || undefined,
        shippingAddressLine1: dto.shippingAddressLine1?.trim() || undefined,
        shippingAddressLine2: dto.shippingAddressLine2?.trim() || undefined,
        shippingCity: dto.shippingCity?.trim() || undefined,
        shippingPostalCode: dto.shippingPostalCode?.trim() || undefined,
        customerUserId: customerUserId ?? undefined,
        items: {
          create: orderItemsData,
        },
        statusHistory: {
          create: { status: OrderStatus.PENDING },
        },
      },
      include: this.orderInclude(),
    });

    await this.sendOrderConfirmationEmail(order);
    return this.toResponseDto(order);
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
    const { page = 1, limit = 20, status, customerEmail, dateFrom, dateTo, assignedToUserId } = query;
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {};
    if (status) where.status = status;
    if (customerEmail) {
      where.customerEmail = { equals: customerEmail, mode: 'insensitive' };
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

    const updated = await this.prisma.order.update({
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
    customerEmail: string;
    customerName: string | null;
    customerPhone: string | null;
    shippingCountry: string | null;
    shippingAddressLine1: string | null;
    shippingAddressLine2: string | null;
    shippingCity: string | null;
    shippingPostalCode: string | null;
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
      customerEmail: order.customerEmail,
      customerName: order.customerName ?? null,
      customerPhone: order.customerPhone ?? null,
      shippingCountry: order.shippingCountry ?? null,
      shippingAddressLine1: order.shippingAddressLine1 ?? null,
      shippingAddressLine2: order.shippingAddressLine2 ?? null,
      shippingCity: order.shippingCity ?? null,
      shippingPostalCode: order.shippingPostalCode ?? null,
      assignedToUserId: order.assignedToUserId,
      assignedToUserName: order.assignedTo?.name ?? null,
      items,
      statusHistory,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
