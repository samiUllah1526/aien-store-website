import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, SalesCampaignStatus } from '@prisma/client';

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

export interface PromotionOverTimeDto {
  date: string;
  campaignRevenueCents: number;
  campaignSavingsCents: number;
  voucherDiscountCents: number;
  voucherRedemptions: number;
}

export interface TopCampaignDto {
  campaignId: string;
  campaignName: string;
  revenueCents: number;
  itemsSold: number;
  savingsCents: number;
}

export interface DashboardStatsDto {
  totalProducts: number;
  totalOrders: number;
  ordersByStatus: OrdersByStatusDto;
  ordersOverTime: OrdersOverTimeDto[];
  salesByCategory: SalesByCategoryDto[];

  activeCampaigns: number;
  campaignRevenueCents: number;
  campaignSavingsCents: number;
  activeVouchers: number;
  voucherRedemptionsCount: number;
  promotionOverTime: PromotionOverTimeDto[];
  topCampaigns: TopCampaignDto[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(days = 30): Promise<DashboardStatsDto> {
    const rangeStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const now = new Date();

    const [
      totalProducts,
      totalOrders,
      orderCountsByStatus,
      ordersInRange,
      orderItemsForCategory,
      activeCampaigns,
      activeVouchers,
      voucherRedemptionsCount,
      campaignOrderItems,
      voucherOrders,
    ] = await Promise.all([
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: rangeStart } },
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
      this.prisma.salesCampaign.count({
        where: {
          deletedAt: null,
          status: SalesCampaignStatus.SCHEDULED,
          startsAt: { lte: now },
          endsAt: { gt: now },
        },
      }),
      this.prisma.voucher.count({
        where: {
          isActive: true,
          deletedAt: null,
          startDate: { lte: now },
          expiryDate: { gt: now },
        },
      }),
      this.prisma.voucherRedemption.count({
        where: { createdAt: { gte: rangeStart } },
      }),
      this.prisma.orderItem.findMany({
        where: {
          campaignId: { not: null },
          order: {
            createdAt: { gte: rangeStart },
            status: { not: OrderStatus.CANCELLED },
          },
        },
        select: {
          campaignId: true,
          quantity: true,
          unitCents: true,
          originalUnitCents: true,
          order: { select: { createdAt: true } },
        },
      }),
      this.prisma.order.findMany({
        where: {
          voucherId: { not: null },
          createdAt: { gte: rangeStart },
          status: { not: OrderStatus.CANCELLED },
        },
        select: {
          createdAt: true,
          discountCents: true,
        },
      }),
    ]);

    // ---- existing: orders by status ----
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

    // ---- existing: orders over time ----
    const dateMap = new Map<string, { count: number; totalCents: number }>();
    for (const order of ordersInRange) {
      const date = order.createdAt.toISOString().slice(0, 10);
      const prev = dateMap.get(date) ?? { count: 0, totalCents: 0 };
      dateMap.set(date, {
        count: prev.count + 1,
        totalCents: prev.totalCents + order.totalCents,
      });
    }
    const sortedDates = Array.from(dateMap.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    const ordersOverTime: OrdersOverTimeDto[] = sortedDates.map(
      ([date, v]) => ({
        date,
        count: v.count,
        totalCents: v.totalCents,
      }),
    );

    // ---- existing: sales by category ----
    const categoryMap = new Map<
      string,
      {
        categoryId: string | null;
        categoryName: string;
        totalCents: number;
        orderIds: Set<string>;
      }
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
    const salesByCategory: SalesByCategoryDto[] = Array.from(
      categoryMap.values(),
    ).map((rec) => ({
      categoryId: rec.categoryId,
      categoryName: rec.categoryName,
      totalCents: rec.totalCents,
      orderCount: rec.orderIds.size,
    }));
    salesByCategory.sort((a, b) => b.totalCents - a.totalCents);

    // ---- new: campaign totals + per-day + top campaigns ----
    let campaignRevenueCents = 0;
    let campaignSavingsCents = 0;
    const promoDateMap = new Map<
      string,
      { campaignRevenueCents: number; campaignSavingsCents: number; voucherDiscountCents: number; voucherRedemptions: number }
    >();
    const campaignAgg = new Map<
      string,
      { revenueCents: number; itemsSold: number; savingsCents: number }
    >();

    for (const item of campaignOrderItems) {
      const revenue = item.unitCents * item.quantity;
      const original = (item.originalUnitCents ?? item.unitCents) * item.quantity;
      const savings = original - revenue;

      campaignRevenueCents += revenue;
      campaignSavingsCents += savings;

      const date = item.order.createdAt.toISOString().slice(0, 10);
      const prev = promoDateMap.get(date) ?? {
        campaignRevenueCents: 0,
        campaignSavingsCents: 0,
        voucherDiscountCents: 0,
        voucherRedemptions: 0,
      };
      prev.campaignRevenueCents += revenue;
      prev.campaignSavingsCents += savings;
      promoDateMap.set(date, prev);

      const cId = item.campaignId!;
      const agg = campaignAgg.get(cId) ?? { revenueCents: 0, itemsSold: 0, savingsCents: 0 };
      agg.revenueCents += revenue;
      agg.itemsSold += item.quantity;
      agg.savingsCents += savings;
      campaignAgg.set(cId, agg);
    }

    // ---- new: voucher per-day ----
    for (const order of voucherOrders) {
      const date = order.createdAt.toISOString().slice(0, 10);
      const prev = promoDateMap.get(date) ?? {
        campaignRevenueCents: 0,
        campaignSavingsCents: 0,
        voucherDiscountCents: 0,
        voucherRedemptions: 0,
      };
      prev.voucherDiscountCents += order.discountCents;
      prev.voucherRedemptions += 1;
      promoDateMap.set(date, prev);
    }

    const promotionOverTime: PromotionOverTimeDto[] = Array.from(promoDateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, ...v }));

    // ---- new: top campaigns (resolve names) ----
    const campaignIds = Array.from(campaignAgg.keys());
    const campaignNameMap = new Map<string, string>();
    if (campaignIds.length > 0) {
      const campaigns = await this.prisma.salesCampaign.findMany({
        where: { id: { in: campaignIds } },
        select: { id: true, name: true },
      });
      for (const c of campaigns) {
        campaignNameMap.set(c.id, c.name);
      }
    }
    const topCampaigns: TopCampaignDto[] = Array.from(campaignAgg.entries())
      .map(([id, agg]) => ({
        campaignId: id,
        campaignName: campaignNameMap.get(id) ?? 'Unknown',
        ...agg,
      }))
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 10);

    return {
      totalProducts,
      totalOrders,
      ordersByStatus,
      ordersOverTime,
      salesByCategory,
      activeCampaigns,
      campaignRevenueCents,
      campaignSavingsCents,
      activeVouchers,
      voucherRedemptionsCount,
      promotionOverTime,
      topCampaigns,
    };
  }
}
