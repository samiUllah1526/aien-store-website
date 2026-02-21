/**
 * Voucher EXPIRED audit job.
 * Writes EXPIRED log for vouchers past expiryDate that don't yet have one.
 * Run manually (npm run job:voucher-expired) or via @nestjs/schedule when jobs are configured.
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { VoucherAuditService } from './voucher-audit.service';

@Injectable()
export class VoucherExpiredJob {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: VoucherAuditService,
  ) {}

  async processExpiredVouchers(): Promise<{ processed: number }> {
    const now = new Date();
    const expiredVouchers = await this.prisma.voucher.findMany({
      where: {
        deletedAt: null,
        expiryDate: { lt: now },
      },
      select: { id: true, code: true, type: true },
    });

    let processed = 0;
    for (const v of expiredVouchers) {
      const hasExpiredLog = await this.prisma.voucherAuditLog.findFirst({
        where: { voucherId: v.id, action: 'EXPIRED' },
      });
      if (!hasExpiredLog) {
        await this.audit.publish({
          voucherId: v.id,
          action: 'EXPIRED',
          actorType: 'SYSTEM',
          code: v.code,
          metadata: { type: v.type },
        });
        processed++;
      }
    }
    return { processed };
  }
}
