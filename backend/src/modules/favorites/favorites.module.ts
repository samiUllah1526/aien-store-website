import { Module } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [PrismaModule, ProductsModule],
  controllers: [],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
