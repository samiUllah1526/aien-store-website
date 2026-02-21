import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

export interface OrdersByStatusDto {
  PENDING: number;
  CONFIRMED: number;
  PROCESSING: number;
  SHIPPED: number;
  DELIVERED: number;
  CANCELLED: number;
}

export interface OrdersOverTimeDto {
  date: string;
  count: number;
  totalCents: number;
}

export interface SalesByCategoryDto {
  categoryId: string | null;
  categoryName: string;
  totalCents: number;
  orderCount: number;
}

export interface DashboardStatsDto {
  totalProducts: number;
  totalOrders: number;
  ordersByStatus: OrdersByStatusDto;
  ordersOverTime: OrdersOverTimeDto[];
  salesByCategory: SalesByCategoryDto[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(days = 30): Promise<DashboardStatsDto> {
    const [totalProducts, totalOrders, orderCountsByStatus, ordersInRange, orderItemsForCategory] =
      await Promise.all([
        this.prisma.product.count(),
        this.prisma.order.count(),
        this.prisma.order.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
        this.prisma.order.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
            },
          },
          select: { id: true, createdAt: true, totalCents: true },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.orderItem.findMany({
          where: { order: { status: { not: OrderStatus.CANCELLED } } },
          select: {
            orderId: true,
            quantity: true,
            unitCents: true,
            product: {
              select: {
                productCategories: {
                  take: 1,
                  select: { category: { select: { id: true, name: true } } },
                },
              },
            },
          },
        }),
      ]);

    const ordersByStatus: OrdersByStatusDto = {
      PENDING: 0,
      CONFIRMED: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };
    for (const row of orderCountsByStatus) {
      ordersByStatus[row.status] = row._count.id;
    }

    const dateMap = new Map<string, { count: number; totalCents: number }>();
    for (const order of ordersInRange) {
      const date = order.createdAt.toISOString().slice(0, 10);
      const prev = dateMap.get(date) ?? { count: 0, totalCents: 0 };
      dateMap.set(date, {
        count: prev.count + 1,
        totalCents: prev.totalCents + order.totalCents,
      });
    }
    const sortedDates = Array.from(dateMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const ordersOverTime: OrdersOverTimeDto[] = sortedDates.map(([date, v]) => ({
      date,
      count: v.count,
      totalCents: v.totalCents,
    }));

    const categoryMap = new Map<
      string,
      { categoryId: string | null; categoryName: string; totalCents: number; orderIds: Set<string> }
    >();
    const uncategorizedKey = '__uncategorized__';
    for (const item of orderItemsForCategory) {
      const firstPc = item.product.productCategories?.[0]?.category;
      const name = firstPc?.name ?? 'Uncategorized';
      const id = firstPc?.id ?? uncategorizedKey;
      const key = id === null ? uncategorizedKey : id;
      const revenue = item.quantity * item.unitCents;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          categoryId: firstPc?.id ?? null,
          categoryName: name,
          totalCents: 0,
          orderIds: new Set(),
        });
      }
      const rec = categoryMap.get(key)!;
      rec.totalCents += revenue;
      rec.orderIds.add(item.orderId);
    }
    const salesByCategory: SalesByCategoryDto[] = Array.from(categoryMap.values()).map((rec) => ({
      categoryId: rec.categoryId,
      categoryName: rec.categoryName,
      totalCents: rec.totalCents,
      orderCount: rec.orderIds.size,
    }));
    salesByCategory.sort((a, b) => b.totalCents - a.totalCents);

    return {
      totalProducts,
      totalOrders,
      ordersByStatus,
      ordersOverTime,
      salesByCategory,
    };
  }
}
