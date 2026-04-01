import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { InventoryMovementType } from '@prisma/client';

export interface DeductItem {
  productId: string;
  variantId: string;
  quantity: number;
  color?: string | null;
  size?: string | null;
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

  private async syncProductStockFromVariants(
    productId: string,
    client: Prisma.TransactionClient | PrismaService,
  ): Promise<number> {
    const aggregated = await client.productVariant.aggregate({
      where: { productId },
      _sum: { stockQuantity: true },
    });
    const totalStock = aggregated._sum.stockQuantity ?? 0;
    await client.product.update({
      where: { id: productId },
      data: { stockQuantity: totalStock },
    });
    return totalStock;
  }

  /**
   * Deduct stock for an order. Call inside a transaction from OrdersService.
   * Fails if any product has insufficient stock (transaction rolled back).
   */
  async deductForOrder(
    orderId: string,
    items: DeductItem[],
    tx: Prisma.TransactionClient,
  ): Promise<DeductResult> {
    const variantQuantities = new Map<
      string,
      { productId: string; quantity: number }
    >();
    for (const { productId, variantId, quantity } of items) {
      if (quantity <= 0) continue;
      const existing = variantQuantities.get(variantId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        variantQuantities.set(variantId, { productId, quantity });
      }
    }
    if (variantQuantities.size === 0) return { success: true };

    const touchedProducts = new Set<string>();
    for (const [variantId, payload] of variantQuantities) {
      const { productId, quantity: qty } = payload;
      const updated = await tx.$executeRaw(
        Prisma.sql`UPDATE product_variants SET stock_quantity = stock_quantity - ${qty} WHERE id = ${variantId}::uuid AND product_id = ${productId}::uuid AND stock_quantity >= ${qty}`,
      );
      if (updated === 0) {
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          select: {
            color: true,
            size: true,
            stockQuantity: true,
            product: { select: { name: true } },
          },
        });
        throw new BadRequestException(
          variant
            ? `Insufficient stock for "${variant.product.name}" (${variant.color}/${variant.size}). Available: ${variant.stockQuantity}, requested: ${qty}.`
            : `Insufficient stock for variant ${variantId}`,
        );
      }
      const variantAfter = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: { stockQuantity: true },
      });
      await tx.inventoryMovement.create({
        data: {
          productId,
          variantId,
          orderId,
          type: InventoryMovementType.SALE,
          quantityDelta: -qty,
          reference: `Order ${orderId}`,
          stockAfter: variantAfter?.stockQuantity ?? null,
        },
      });
      touchedProducts.add(productId);
    }

    for (const productId of touchedProducts) {
      await this.syncProductStockFromVariants(productId, tx);
    }
    return { success: true };
  }

  /**
   * Restore stock when an order is cancelled. Idempotent: only restores if this order
   * had not been restored before (no existing RESTORE movements for this orderId).
   */
  async restoreForOrder(
    orderId: string,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const alreadyRestored = await tx.inventoryMovement.findFirst({
      where: { orderId, type: InventoryMovementType.RESTORE },
    });
    if (alreadyRestored) return;

    const orderItems = await tx.orderItem.findMany({
      where: { orderId },
      select: { productId: true, variantId: true, quantity: true },
    });
    const byVariant = new Map<
      string,
      { productId: string; quantity: number }
    >();
    for (const { productId, variantId, quantity } of orderItems) {
      const existing = byVariant.get(variantId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        byVariant.set(variantId, { productId, quantity });
      }
    }

    const touchedProducts = new Set<string>();
    for (const [variantId, payload] of byVariant) {
      const { productId, quantity: qty } = payload;
      await tx.productVariant.update({
        where: { id: variantId },
        data: { stockQuantity: { increment: qty } },
      });
      const variantAfter = await tx.productVariant.findUnique({
        where: { id: variantId },
        select: { stockQuantity: true },
      });
      await tx.inventoryMovement.create({
        data: {
          productId,
          variantId,
          orderId,
          type: InventoryMovementType.RESTORE,
          quantityDelta: qty,
          reference: `Order ${orderId} cancelled`,
          stockAfter: variantAfter?.stockQuantity ?? null,
        },
      });
      touchedProducts.add(productId);
    }

    for (const productId of touchedProducts) {
      await this.syncProductStockFromVariants(productId, tx);
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
    variantId?: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    if (quantityDelta === 0) return;

    const variants = await client.productVariant.findMany({
      where: { productId },
      select: { id: true, color: true, size: true, stockQuantity: true },
      orderBy: { createdAt: 'asc' },
    });
    if (variants.length === 0) {
      throw new BadRequestException('Product has no variants to adjust');
    }

    let targetVariantId = variantId ?? null;
    if (!targetVariantId) {
      if (variants.length > 1) {
        throw new BadRequestException(
          'variantId is required when product has multiple variants',
        );
      }
      targetVariantId = variants[0].id;
    }

    const targetVariant = variants.find((v) => v.id === targetVariantId);
    if (!targetVariant) {
      throw new BadRequestException(
        'variantId does not belong to this product',
      );
    }

    if (quantityDelta > 0) {
      await client.productVariant.update({
        where: { id: targetVariant.id },
        data: { stockQuantity: { increment: quantityDelta } },
      });
    } else {
      const updated = await client.$executeRaw(
        Prisma.sql`UPDATE product_variants SET stock_quantity = stock_quantity + ${quantityDelta} WHERE id = ${targetVariant.id}::uuid AND stock_quantity + ${quantityDelta} >= 0`,
      );
      if (updated === 0) {
        throw new BadRequestException(
          `Cannot adjust by ${quantityDelta}: variant "${targetVariant.color}/${targetVariant.size}" has only ${targetVariant.stockQuantity} in stock.`,
        );
      }
    }

    const variantAfter = await client.productVariant.findUnique({
      where: { id: targetVariant.id },
      select: { stockQuantity: true },
    });

    await this.syncProductStockFromVariants(productId, client);
    await client.inventoryMovement.create({
      data: {
        productId,
        variantId: targetVariant.id,
        type: InventoryMovementType.ADJUSTMENT,
        quantityDelta,
        reference,
        ...(performedByUserId != null && { performedByUserId }),
        stockAfter: variantAfter?.stockQuantity ?? null,
      },
    });
  }

  /**
   * Paginated movements for a product (audit log).
   */
  async getMovements(
    productId: string,
    options: { variantId?: string; page?: number; limit?: number } = {},
  ): Promise<{
    data: Array<{
      id: string;
      variantId: string | null;
      variantColor: string | null;
      variantSize: string | null;
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
    const variantId = options.variantId?.trim() || undefined;
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(50, Math.max(1, options.limit ?? 20));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where: {
          productId,
          ...(variantId ? { variantId } : {}),
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          variant: { select: { id: true, color: true, size: true } },
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
      this.prisma.inventoryMovement.count({
        where: {
          productId,
          ...(variantId ? { variantId } : {}),
        },
      }),
    ]);

    const data = rows.map((m) => {
      const stockAfter = m.stockAfter ?? null;
      const stockBefore =
        stockAfter !== null ? stockAfter - m.quantityDelta : null;
      return {
        id: m.id,
        variantId: m.variantId,
        variantColor: m.variant?.color ?? null,
        variantSize: m.variant?.size ?? null,
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
  async getIdempotentOrderId(
    key: string,
    tx: Prisma.TransactionClient,
  ): Promise<string | null> {
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
