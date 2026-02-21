/**
 * Standalone script: write EXPIRED audit logs for vouchers past expiryDate.
 * Run: npx ts-node -r tsconfig-paths/register scripts/job-voucher-expired.ts
 * Or: npm run job:voucher-expired (after adding script to package.json)
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
