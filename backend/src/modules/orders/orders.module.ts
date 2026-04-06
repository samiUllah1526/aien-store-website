import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SettingsModule } from '../settings/settings.module';
import { InventoryModule } from '../inventory/inventory.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { SalesCampaignsModule } from '../sales-campaigns/sales-campaigns.module';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    SettingsModule,
    InventoryModule,
    VouchersModule,
    SalesCampaignsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'change-me-in-production'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
