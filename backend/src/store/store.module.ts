import { Module } from '@nestjs/common';
import { AuthModule } from '../modules/auth/auth.module';
import { ProductsModule } from '../modules/products/products.module';
import { OrdersModule } from '../modules/orders/orders.module';
import { CategoriesModule } from '../modules/categories/categories.module';
import { UsersModule } from '../modules/users/users.module';
import { FavoritesModule } from '../modules/favorites/favorites.module';
import { SettingsModule } from '../modules/settings/settings.module';
import { MediaModule } from '../modules/media/media.module';
import { VouchersModule } from '../modules/vouchers/vouchers.module';
import { ProfileModule } from '../modules/profile/profile.module';
import { StoreAuthController } from './auth/store-auth.controller';
import { StoreProductsController } from './products/store-products.controller';
import { StoreOrdersController } from './orders/store-orders.controller';
import { StoreCategoriesController } from './categories/store-categories.controller';
import { StoreProfileController } from './profile/store-profile.controller';
import { StoreFavoritesController } from './favorites/store-favorites.controller';
import { StoreSettingsController } from './settings/store-settings.controller';
import { StoreMediaController } from './media/store-media.controller';
import { StoreVouchersController } from './vouchers/store-vouchers.controller';
import { StoreProfileShippingController } from './profile/store-profile-shipping.controller';

@Module({
  imports: [
    AuthModule,
    ProductsModule,
    OrdersModule,
    CategoriesModule,
    UsersModule,
    FavoritesModule,
    SettingsModule,
    MediaModule,
    VouchersModule,
    ProfileModule,
  ],
  controllers: [
    StoreAuthController,
    StoreProductsController,
    StoreOrdersController,
    StoreCategoriesController,
    StoreProfileController,
    StoreFavoritesController,
    StoreSettingsController,
    StoreMediaController,
    StoreVouchersController,
    StoreProfileShippingController,
  ],
})
export class StoreModule {}
