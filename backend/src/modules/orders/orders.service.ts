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
import { canTransitionOrderStatus } from './order-status.enum';
import { OrderStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async create(dto: CreateOrderDto): Promise<OrderResponseDto> {
    if (!dto.items?.length) {
      throw new BadRequestException('Order must have at least one item');
    }
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, priceCents: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));
    const missing = productIds.filter((id) => !productMap.has(id));
    if (missing.length) {
      throw new BadRequestException(`Products not found: ${missing.join(', ')}`);
    }

    let totalCents = 0;
    const orderItemsData = dto.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitCents = product.priceCents;
      totalCents += unitCents * item.quantity;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitCents,
      };
    });

    const order = await this.prisma.order.create({
      data: {
        status: OrderStatus.PENDING,
        totalCents,
        customerEmail: dto.customerEmail,
        items: {
          create: orderItemsData,
        },
        statusHistory: {
          create: { status: OrderStatus.PENDING },
        },
      },
      include: this.orderInclude(),
    });

    return this.toResponseDto(order);
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
      await this.sendStatusChangeEmail(updated, dto.status);
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
      items: { include: { product: { select: { id: true, name: true } } } },
      statusHistory: { orderBy: { createdAt: 'asc' as const } },
      assignedTo: { select: { id: true, name: true } },
    };
  }

  private toResponseDto(order: {
    id: string;
    status: OrderStatus;
    totalCents: number;
    customerEmail: string;
    assignedToUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    items: Array<{
      id: string;
      productId: string;
      quantity: number;
      unitCents: number;
      product: { id: string; name: string };
    }>;
    statusHistory: Array<{ status: OrderStatus; createdAt: Date }>;
    assignedTo: { id: string; name: string } | null;
  }): OrderResponseDto {
    const items: OrderItemResponseDto[] = order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
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
      customerEmail: order.customerEmail,
      assignedToUserId: order.assignedToUserId,
      assignedToUserName: order.assignedTo?.name ?? null,
      items,
      statusHistory,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
