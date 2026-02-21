import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { InventoryMovementType } from '@prisma/client';

export interface DeductItem {
  productId: string;
  quantity: number;
}

export interface DeductResult {
  success: true;
}

/**
 * Production-grade inventory: atomic deduct/restore, audit trail, no oversell.
 * All mutations run in transactions. Deduct uses atomic UPDATE to prevent races.
 */
@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deduct stock for an order. Call inside a transaction from OrdersService.
   * Fails if any product has insufficient stock (transaction rolled back).
   */
  async deductForOrder(
    orderId: string,
    items: DeductItem[],
    tx: Prisma.TransactionClient,
  ): Promise<DeductResult> {
    const productQuantities = new Map<string, number>();
    for (const { productId, quantity } of items) {
      if (quantity <= 0) continue;
      productQuantities.set(productId, (productQuantities.get(productId) ?? 0) + quantity);
    }
    if (productQuantities.size === 0) return { success: true };

    for (const [productId, qty] of productQuantities) {
      const updated = await tx.$executeRaw(
        Prisma.sql`UPDATE products SET stock_quantity = stock_quantity - ${qty} WHERE id = ${productId}::uuid AND stock_quantity >= ${qty}`,
      );
      if (updated === 0) {
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { name: true, stockQuantity: true },
        });
        throw new BadRequestException(
          product
            ? `Insufficient stock for "${product.name}". Available: ${product.stockQuantity}, requested: ${qty}.`
            : `Insufficient stock for product ${productId}`,
        );
      }
      await tx.inventoryMovement.create({
        data: {
          productId,
          orderId,
          type: InventoryMovementType.SALE,
          quantityDelta: -qty,
          reference: `Order ${orderId}`,
        },
      });
    }
    return { success: true };
  }

  /**
   * Restore stock when an order is cancelled. Idempotent: only restores if this order
   * had not been restored before (no existing RESTORE movements for this orderId).
   */
  async restoreForOrder(orderId: string, tx: Prisma.TransactionClient): Promise<void> {
    const alreadyRestored = await tx.inventoryMovement.findFirst({
      where: { orderId, type: InventoryMovementType.RESTORE },
    });
    if (alreadyRestored) return;

    const orderItems = await tx.orderItem.findMany({
      where: { orderId },
      select: { productId: true, quantity: true },
    });
    const byProduct = new Map<string, number>();
    for (const { productId, quantity } of orderItems) {
      byProduct.set(productId, (byProduct.get(productId) ?? 0) + quantity);
    }

    for (const [productId, qty] of byProduct) {
      await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: { increment: qty } },
      });
      await tx.inventoryMovement.create({
        data: {
          productId,
          orderId,
          type: InventoryMovementType.RESTORE,
          quantityDelta: qty,
          reference: `Order ${orderId} cancelled`,
        },
      });
    }
  }

  /**
   * Admin adjustment: add or subtract stock. quantityDelta positive = add, negative = subtract.
   * Fails if adjustment would make stock negative.
   */
  async adjust(
    productId: string,
    quantityDelta: number,
    reference: string,
    performedByUserId?: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    if (quantityDelta === 0) return;

    if (quantityDelta > 0) {
      await client.product.update({
        where: { id: productId },
        data: { stockQuantity: { increment: quantityDelta } },
      });
    } else {
      const updated = await (client as Prisma.TransactionClient).$executeRaw(
        Prisma.sql`UPDATE products SET stock_quantity = stock_quantity + ${quantityDelta} WHERE id = ${productId}::uuid AND stock_quantity + ${quantityDelta} >= 0`,
      );
      if (updated === 0) {
        const product = await client.product.findUnique({
          where: { id: productId },
          select: { name: true, stockQuantity: true },
        });
        throw new BadRequestException(
          product
            ? `Cannot adjust by ${quantityDelta}: "${product.name}" has only ${product.stockQuantity} in stock.`
            : `Insufficient stock for product ${productId}`,
        );
      }
    }
    const productAfter = await client.product.findUnique({
      where: { id: productId },
      select: { stockQuantity: true },
    });
    const stockAfter = productAfter?.stockQuantity ?? undefined;
    await client.inventoryMovement.create({
      data: {
        productId,
        type: InventoryMovementType.ADJUSTMENT,
        quantityDelta,
        reference,
        performedByUserId: performedByUserId ?? undefined,
        stockAfter,
      },
    });
  }

  /**
   * Paginated movements for a product (audit log).
   */
  async getMovements(
    productId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<{
    data: Array<{
      id: string;
      type: string;
      quantityDelta: number;
      reference: string | null;
      performedByUserId: string | null;
      performedByName: string | null;
      performedByEmail: string | null;
      performedByRoleNames: string[];
      stockBefore: number | null;
      stockAfter: number | null;
      createdAt: Date;
    }>;
    total: number;
  }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(50, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          performedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              roles: { include: { role: { select: { name: true } } } },
            },
          },
        },
      }),
      this.prisma.inventoryMovement.count({ where: { productId } }),
    ]);

    const data = rows.map((m) => {
      const stockAfter = m.stockAfter ?? null;
      const stockBefore =
        stockAfter !== null ? stockAfter - m.quantityDelta : null;
      return {
        id: m.id,
        type: m.type,
        quantityDelta: m.quantityDelta,
        reference: m.reference,
        performedByUserId: m.performedByUserId,
        performedByName: m.performedBy?.name ?? null,
        performedByEmail: m.performedBy?.email ?? null,
        performedByRoleNames:
          m.performedBy?.roles?.map((ur) => ur.role.name) ?? [],
        stockBefore,
        stockAfter,
        createdAt: m.createdAt,
      };
    });

    return { data, total };
  }

  /** Check idempotency key: if present and not expired, return existing orderId. */
  async getIdempotentOrderId(key: string, tx: Prisma.TransactionClient): Promise<string | null> {
    const row = await tx.idempotencyKey.findUnique({
      where: { key },
    });
    if (!row || row.expiresAt < new Date() || !row.orderId) return null;
    return row.orderId;
  }

  /** Store idempotency key with orderId (call after order created in same tx). */
  async setIdempotencyKey(
    key: string,
    orderId: string,
    expiresAt: Date,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.idempotencyKey.create({
      data: { key, orderId, expiresAt },
    });
  }
}
