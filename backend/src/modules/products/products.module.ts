import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { MediaModule } from '../media/media.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [MediaModule, InventoryModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
