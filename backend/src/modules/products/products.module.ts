import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { MediaModule } from '../media/media.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [MediaModule, InventoryModule],
  controllers: [],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
