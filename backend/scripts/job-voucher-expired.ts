/**
 * Standalone script: write EXPIRED audit logs for vouchers past expiryDate.
 *
 * What it does: Finds vouchers whose expiry date has passed and, for each one that
 * doesn’t already have an EXPIRED audit entry, creates that entry. So the voucher
 * audit trail shows when the system considered it expired. Run daily (e.g. via cron)
 * or manually.
 *
 * Run: npx ts-node -r tsconfig-paths/register scripts/job-voucher-expired.ts
 * Or: npm run job:voucher-expired
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const expiredVouchers = await prisma.voucher.findMany({
    where: { deletedAt: null, expiryDate: { lt: now } },
    select: { id: true, code: true, type: true },
  });

  let processed = 0;
  for (const v of expiredVouchers) {
    const hasExpiredLog = await prisma.voucherAuditLog.findFirst({
      where: { voucherId: v.id, action: 'EXPIRED' },
    });
    if (!hasExpiredLog) {
      await prisma.voucherAuditLog.create({
        data: {
          voucherId: v.id,
          action: 'EXPIRED',
          actorType: 'SYSTEM',
          code: v.code,
          metadata: { type: v.type },
        },
      });
      processed++;
    }
  }
  console.log(`Voucher expired job: processed ${processed} vouchers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
