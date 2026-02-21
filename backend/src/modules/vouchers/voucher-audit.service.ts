import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { VoucherAuditEvent, VoucherAuditPublisher } from './voucher-audit.interface';

@Injectable()
export class VoucherAuditService implements VoucherAuditPublisher {
  constructor(private readonly prisma: PrismaService) {}

  async publish(event: VoucherAuditEvent, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    try {
      await client.voucherAuditLog.create({
        data: {
          voucherId: event.voucherId ?? undefined,
          action: event.action,
          actorType: event.actorType,
          actorId: event.actorId ?? undefined,
          orderId: event.orderId ?? undefined,
          code: event.code ?? undefined,
          result: event.result ?? undefined,
          errorCode: event.errorCode ?? undefined,
          metadata: (event.metadata ?? undefined) as object | undefined,
          requestId: event.requestId ?? undefined,
        },
      });
    } catch (err) {
      console.warn('[VoucherAuditService] Failed to write audit log:', err);
      if (tx) throw err; // In transaction: propagate so tx rolls back
      // Non-blocking when standalone: audit failures must not break main flow
    }
  }

  /** Fire-and-forget: use for validation attempts (high volume, non-critical path). */
  publishAsync(event: VoucherAuditEvent): void {
    this.publish(event).catch(() => {});
  }
}
