import { Module } from '@nestjs/common';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { VoucherAuditService } from './voucher-audit.service';
import { VoucherExpiredJob } from './voucher-expired.job';

@Module({
  imports: [],
  controllers: [],
  providers: [VouchersService, VoucherAuditService, VoucherExpiredJob],
  exports: [VouchersService, VoucherAuditService],
})
export class VouchersModule {}
