import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrderStatus } from '@prisma/client';

const orderId = '11111111-1111-1111-1111-111111111111';
const productId = '22222222-2222-2222-2222-222222222222';

const mockOrder = {
  id: orderId,
  status: OrderStatus.PENDING,
  totalCents: 5000,
  currency: 'PKR',
  customerEmail: 'customer@example.com',
  customerName: null as string | null,
  customerPhone: null as string | null,
  shippingCountry: null as string | null,
  shippingAddressLine1: null as string | null,
  shippingAddressLine2: null as string | null,
  shippingCity: null as string | null,
  shippingPostalCode: null as string | null,
  assignedToUserId: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  items: [
    {
      id: 'item-1',
      productId,
      quantity: 2,
      unitCents: 2500,
      product: { id: productId, name: 'Test Product' },
    },
  ],
  statusHistory: [
    { status: OrderStatus.PENDING, createdAt: new Date('2025-01-01') },
  ],
  assignedTo: null,
};

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    order: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock; count: jest.Mock };
    product: { findMany: jest.Mock };
    user: { findUnique: jest.Mock };
  };
  let mail: { sendOrderStatusChange: jest.Mock };

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      product: { findMany: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    mail = { sendOrderStatusChange: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('create', () => {
    it('should create order with items and initial status history', async () => {
      const dto: CreateOrderDto = {
        customerEmail: 'customer@example.com',
        items: [{ productId, quantity: 2 }],
      };
      prisma.product.findMany.mockResolvedValue([
        { id: productId, priceCents: 2500, currency: 'PKR', name: 'Test Product' },
      ]);
      prisma.order.create.mockResolvedValue(mockOrder);

      const result = await service.create(dto);

      expect(result).toMatchObject({
        id: orderId,
        status: 'PENDING',
        totalCents: 5000,
        currency: 'PKR',
        customerEmail: 'customer@example.com',
        items: expect.arrayContaining([
          expect.objectContaining({ productId, quantity: 2, unitCents: 2500 }),
        ]),
        statusHistory: expect.arrayContaining([
          expect.objectContaining({ status: 'PENDING' }),
        ]),
      });
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: OrderStatus.PENDING,
            totalCents: 5000,
            currency: 'PKR',
            customerEmail: dto.customerEmail,
            items: { create: expect.any(Array) },
            statusHistory: { create: { status: OrderStatus.PENDING } },
          }),
        }),
      );
    });

    it('should throw BadRequestException when items have mixed currencies', async () => {
      const otherProductId = '33333333-3333-3333-3333-333333333333';
      prisma.product.findMany.mockResolvedValue([
        { id: productId, priceCents: 2500, currency: 'PKR', name: 'Product A' },
        { id: otherProductId, priceCents: 500, currency: 'USD', name: 'Product B' },
      ]);
      await expect(
        service.create({
          customerEmail: 'a@b.com',
          items: [
            { productId, quantity: 1 },
            { productId: otherProductId, quantity: 1 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when items empty', async () => {
      await expect(
        service.create({
          customerEmail: 'a@b.com',
          items: [],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when product not found', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      await expect(
        service.create({
          customerEmail: 'a@b.com',
          items: [{ productId: 'missing', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });
  });

  describe('quote', () => {
    it('should return server-computed totals from DB (no order created)', async () => {
      prisma.product.findMany.mockResolvedValue([
        { id: productId, priceCents: 2500, currency: 'PKR', name: 'Test Product' },
      ]);
      const result = await service.quote([{ productId, quantity: 2 }]);
      expect(result).toMatchObject({
        subtotalCents: 5000,
        shippingCents: 299,
        totalCents: 5299,
        currency: 'PKR',
        items: [
          {
            productId,
            productName: 'Test Product',
            quantity: 2,
            unitCents: 2500,
            lineTotalCents: 5000,
          },
        ],
      });
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('should throw when items empty', async () => {
      await expect(service.quote([])).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated orders and total', async () => {
      prisma.order.findMany.mockResolvedValue([mockOrder]);
      prisma.order.count.mockResolvedValue(1);
      const query: OrderQueryDto = { page: 1, limit: 20 };

      const result = await service.findAll(query);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].id).toBe(orderId);
      expect(result.data[0].status).toBe('PENDING');
    });

    it('should filter by status when provided', async () => {
      prisma.order.findMany.mockResolvedValue([]);
      prisma.order.count.mockResolvedValue(0);
      await service.findAll({ status: OrderStatus.SHIPPED });

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: OrderStatus.SHIPPED },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return order by id', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      const result = await service.findOne(orderId);
      expect(result.id).toBe(orderId);
      expect(prisma.order.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: orderId } }),
      );
    });

    it('should throw NotFoundException when not found', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update status, append history, and send email', async () => {
      const updatedOrder = {
        ...mockOrder,
        status: OrderStatus.SHIPPED,
        statusHistory: [
          ...mockOrder.statusHistory,
          { status: OrderStatus.SHIPPED, createdAt: new Date() },
        ],
      };
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.order.update.mockResolvedValue(updatedOrder);

      const dto: UpdateOrderDto = { status: OrderStatus.SHIPPED };
      const result = await service.update(orderId, dto);

      expect(result.status).toBe('SHIPPED');
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: orderId },
          data: expect.objectContaining({
            status: OrderStatus.SHIPPED,
            statusHistory: { create: { status: OrderStatus.SHIPPED } },
          }),
        }),
      );
      expect(mail.sendOrderStatusChange).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockOrder.customerEmail,
          orderId,
          status: OrderStatus.SHIPPED,
        }),
      );
    });

    it('should throw BadRequestException on invalid status transition', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.DELIVERED,
      });
      const dto: UpdateOrderDto = { status: OrderStatus.PENDING };

      await expect(service.update(orderId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(mail.sendOrderStatusChange).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(
        service.update('missing', { status: OrderStatus.SHIPPED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow assigning user when userId provided', async () => {
      const userId = 'user-uuid';
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.user.findUnique.mockResolvedValue({ id: userId });
      prisma.order.update.mockResolvedValue({
        ...mockOrder,
        assignedToUserId: userId,
        assignedTo: { id: userId, name: 'Staff' },
      });

      await service.update(orderId, { assignedToUserId: userId });

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            assignedTo: { connect: { id: userId } },
          }),
        }),
      );
    });

    it('should throw BadRequestException when assigned user not found', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.update(orderId, { assignedToUserId: 'missing-user' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignStaff', () => {
    it('should call update with userId', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.user.findUnique.mockResolvedValue({ id: 'user-123', name: 'Staff' });
      prisma.order.update.mockResolvedValue({
        ...mockOrder,
        assignedToUserId: 'user-123',
        assignedTo: { id: 'user-123', name: 'Staff' },
      });
      await service.assignStaff(orderId, 'user-123');
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: orderId },
          data: expect.objectContaining({
            assignedTo: { connect: { id: 'user-123' } },
          }),
        }),
      );
    });

    it('should allow unassign when userId is null', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrder);
      prisma.order.update.mockResolvedValue({ ...mockOrder, assignedToUserId: null });
      await service.update(orderId, { assignedToUserId: null });
      const call = prisma.order.update.mock.calls[0][0];
      expect(call.data).toBeDefined();
      expect(call.data.assignedTo).toEqual({ disconnect: true });
    });
  });
});
