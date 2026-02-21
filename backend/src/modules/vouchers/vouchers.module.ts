import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { VoucherAuditService } from './voucher-audit.service';
import { VoucherExpiredJob } from './voucher-expired.job';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'change-me-in-production'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [VouchersController],
  providers: [VouchersService, VoucherAuditService, VoucherExpiredJob],
  exports: [VouchersService, VoucherAuditService],
})
export class VouchersModule {}
