import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { MediaModule } from '../media/media.module';
import { InventoryModule } from '../inventory/inventory.module';
import { SalesCampaignsModule } from '../sales-campaigns/sales-campaigns.module';

@Module({
  imports: [MediaModule, InventoryModule, SalesCampaignsModule],
  controllers: [],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
