import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardService } from './dashboard.service';
import { OrderStatus } from '@prisma/client';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    product: { count: jest.Mock };
    order: { count: jest.Mock; groupBy: jest.Mock; findMany: jest.Mock };
    orderItem: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      product: { count: jest.fn() },
      order: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
      orderItem: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('returns stats with correct shape', async () => {
    prisma.product.count.mockResolvedValue(10);
    prisma.order.count.mockResolvedValue(25);
    prisma.order.groupBy.mockResolvedValue([
      { status: OrderStatus.PENDING, _count: { id: 5 } },
      { status: OrderStatus.SHIPPED, _count: { id: 10 } },
      { status: OrderStatus.DELIVERED, _count: { id: 8 } },
    ]);
    prisma.order.findMany.mockResolvedValue([]);
    prisma.orderItem.findMany.mockResolvedValue([]);

    const result = await service.getStats(30);

    expect(result).toMatchObject({
      totalProducts: 10,
      totalOrders: 25,
      ordersByStatus: expect.objectContaining({
        PENDING: 5,
        SHIPPED: 10,
        DELIVERED: 8,
        CONFIRMED: 0,
        PROCESSING: 0,
        CANCELLED: 0,
      }),
      ordersOverTime: expect.any(Array),
      salesByCategory: expect.any(Array),
    });
  });

  it('filters orders by createdAt >= (now - days)', async () => {
    prisma.product.count.mockResolvedValue(0);
    prisma.order.count.mockResolvedValue(0);
    prisma.order.groupBy.mockResolvedValue([]);
    prisma.order.findMany.mockResolvedValue([]);
    prisma.orderItem.findMany.mockResolvedValue([]);

    await service.getStats(30);
    const call = prisma.order.findMany.mock.calls[0][0];
    expect(call.where.createdAt).toMatchObject({ gte: expect.any(Date) });
    const msDiff = Date.now() - call.where.createdAt.gte.getTime();
    expect(msDiff).toBeGreaterThanOrEqual(29 * 24 * 60 * 60 * 1000);
  });

  it('aggregates ordersOverTime by date', async () => {
    const baseDate = new Date('2025-01-15');
    prisma.product.count.mockResolvedValue(0);
    prisma.order.count.mockResolvedValue(2);
    prisma.order.groupBy.mockResolvedValue([]);
    prisma.order.findMany.mockResolvedValue([
      { id: '1', createdAt: baseDate, totalCents: 1000 },
      { id: '2', createdAt: baseDate, totalCents: 2000 },
    ]);
    prisma.orderItem.findMany.mockResolvedValue([]);

    const result = await service.getStats(30);

    expect(result.ordersOverTime).toHaveLength(1);
    expect(result.ordersOverTime[0]).toEqual({
      date: '2025-01-15',
      count: 2,
      totalCents: 3000,
    });
  });

  it('groups salesByCategory and sorts by totalCents desc', async () => {
    prisma.product.count.mockResolvedValue(0);
    prisma.order.count.mockResolvedValue(0);
    prisma.order.groupBy.mockResolvedValue([]);
    prisma.order.findMany.mockResolvedValue([]);
    prisma.orderItem.findMany.mockResolvedValue([
      {
        orderId: 'o1',
        quantity: 1,
        unitCents: 500,
        product: {
          productCategories: [{ category: { id: 'cat-a', name: 'Electronics' } }],
        },
      },
      {
        orderId: 'o1',
        quantity: 1,
        unitCents: 1500,
        product: {
          productCategories: [{ category: { id: 'cat-a', name: 'Electronics' } }],
        },
      },
      {
        orderId: 'o2',
        quantity: 1,
        unitCents: 3000,
        product: {
          productCategories: [{ category: { id: 'cat-b', name: 'Clothing' } }],
        },
      },
    ]);

    const result = await service.getStats(30);

    expect(result.salesByCategory[0]).toMatchObject({
      categoryName: 'Clothing',
      totalCents: 3000,
      orderCount: 1,
    });
    expect(result.salesByCategory[1]).toMatchObject({
      categoryName: 'Electronics',
      totalCents: 2000,
      orderCount: 1,
    });
  });

  it('handles uncategorized products in salesByCategory', async () => {
    prisma.product.count.mockResolvedValue(0);
    prisma.order.count.mockResolvedValue(0);
    prisma.order.groupBy.mockResolvedValue([]);
    prisma.order.findMany.mockResolvedValue([]);
    prisma.orderItem.findMany.mockResolvedValue([
      {
        orderId: 'ord-1',
        quantity: 2,
        unitCents: 500,
        product: { productCategories: [] },
      },
    ]);

    const result = await service.getStats(30);

    expect(result.salesByCategory).toContainEqual(
      expect.objectContaining({
        categoryId: null,
        categoryName: 'Uncategorized',
        totalCents: 1000,
        orderCount: 1,
      }),
    );
  });
});
