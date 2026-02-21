import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from './inventory.service';
import { InventoryMovementType } from '@prisma/client';

const productId = '11111111-1111-1111-1111-111111111111';
const orderId = '22222222-2222-2222-2222-222222222222';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: {
    product: { update: jest.Mock; findUnique: jest.Mock };
    inventoryMovement: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock; findFirst: jest.Mock };
    orderItem: { findMany: jest.Mock };
    idempotencyKey: { findUnique: jest.Mock; create: jest.Mock };
    $executeRaw: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      product: { update: jest.fn(), findUnique: jest.fn() },
      inventoryMovement: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
      },
      orderItem: { findMany: jest.fn() },
      idempotencyKey: { findUnique: jest.fn(), create: jest.fn() },
      $executeRaw: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [InventoryService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('adjust', () => {
    it('increments stock when quantityDelta > 0', async () => {
      prisma.product.update.mockResolvedValue({});
      prisma.product.findUnique.mockResolvedValue({ stockQuantity: 15 });

      await service.adjust(productId, 5, 'Restock');

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: productId },
        data: { stockQuantity: { increment: 5 } },
      });
      expect(prisma.inventoryMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            quantityDelta: 5,
            type: InventoryMovementType.ADJUSTMENT,
            reference: 'Restock',
          }),
        }),
      );
    });

    it('decrements stock when quantityDelta < 0 and stock sufficient', async () => {
      prisma.$executeRaw.mockResolvedValue(1);
      prisma.product.findUnique.mockResolvedValue({ stockQuantity: 5 });

      await service.adjust(productId, -3, 'Damage');

      expect(prisma.inventoryMovement.create).toHaveBeenCalled();
    });

    it('throws BadRequestException when negative adjustment exceeds stock', async () => {
      prisma.$executeRaw.mockResolvedValue(0);
      prisma.product.findUnique.mockResolvedValue({ name: 'Widget', stockQuantity: 2 });

      await expect(service.adjust(productId, -5, 'Adjust')).rejects.toThrow('only 2 in stock');
    });

    it('returns early when quantityDelta is 0', async () => {
      await service.adjust(productId, 0, 'No-op');

      expect(prisma.product.update).not.toHaveBeenCalled();
      expect(prisma.inventoryMovement.create).not.toHaveBeenCalled();
    });
  });

  describe('deductForOrder', () => {
    const tx = {
      $executeRaw: jest.fn(),
      product: { findUnique: jest.fn() },
      inventoryMovement: { create: jest.fn() },
    } as unknown as Parameters<InventoryService['deductForOrder']>[2];

    beforeEach(() => {
      tx.$executeRaw.mockReset();
      tx.product.findUnique.mockReset();
      tx.inventoryMovement.create.mockReset();
    });

    it('deducts stock and creates SALE movement', async () => {
      tx.$executeRaw.mockResolvedValue(1);
      tx.inventoryMovement.create.mockResolvedValue({});

      const result = await service.deductForOrder(orderId, [{ productId, quantity: 2 }], tx);

      expect(result).toEqual({ success: true });
      expect(tx.inventoryMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          productId,
          orderId,
          type: InventoryMovementType.SALE,
          quantityDelta: -2,
        }),
      });
    });

    it('throws BadRequestException when insufficient stock', async () => {
      tx.$executeRaw.mockResolvedValue(0);
      tx.product.findUnique.mockResolvedValue({ name: 'Widget', stockQuantity: 1 });

      await expect(
        service.deductForOrder(orderId, [{ productId, quantity: 5 }], tx),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns success when items empty or all quantity <= 0', async () => {
      const result = await service.deductForOrder(orderId, [], tx);
      expect(result).toEqual({ success: true });
      expect(tx.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe('restoreForOrder', () => {
    const tx = {
      inventoryMovement: { findFirst: jest.fn() },
      orderItem: { findMany: jest.fn() },
      product: { update: jest.fn() },
      $executeRaw: jest.fn(),
    } as unknown as Parameters<InventoryService['restoreForOrder']>[1];

    it('returns early when already restored', async () => {
      tx.inventoryMovement.findFirst.mockResolvedValue({ id: 'existing' });

      await service.restoreForOrder(orderId, tx);

      expect(tx.orderItem.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getMovements', () => {
    it('returns paginated movements with total', async () => {
      prisma.inventoryMovement.findMany.mockResolvedValue([
        {
          id: 'mov-1',
          type: 'ADJUSTMENT',
          quantityDelta: 10,
          reference: 'Restock',
          performedByUserId: null,
          performedBy: null,
          stockAfter: 15,
          createdAt: new Date(),
        },
      ]);
      prisma.inventoryMovement.count.mockResolvedValue(1);

      const result = await service.getMovements(productId, { page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0]).toMatchObject({
        type: 'ADJUSTMENT',
        quantityDelta: 10,
        stockAfter: 15,
      });
    });
  });

  describe('getIdempotentOrderId', () => {
    const tx = {
      idempotencyKey: { findUnique: jest.fn() },
    } as unknown as Parameters<InventoryService['getIdempotentOrderId']>[1];

    it('returns orderId when key valid and not expired', async () => {
      tx.idempotencyKey.findUnique.mockResolvedValue({
        orderId,
        expiresAt: new Date(Date.now() + 60000),
      });

      const result = await service.getIdempotentOrderId('key-123', tx);

      expect(result).toBe(orderId);
    });

    it('returns null when key expired', async () => {
      tx.idempotencyKey.findUnique.mockResolvedValue({
        orderId,
        expiresAt: new Date(Date.now() - 1000),
      });

      const result = await service.getIdempotentOrderId('key-123', tx);

      expect(result).toBeNull();
    });
  });
});
