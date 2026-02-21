import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { MediaModule } from './modules/media/media.module';
import { MailModule } from './modules/mail/mail.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { UsersModule } from './modules/users/users.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { SettingsModule } from './modules/settings/settings.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { EmailLogsModule } from './modules/email-logs/email-logs.module';
import { VouchersModule } from './modules/vouchers/vouchers.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { ProfileModule } from './modules/profile/profile.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    MediaModule,
    MailModule,
    ProductsModule,
    OrdersModule,
    UsersModule,
    DashboardModule,
    CategoriesModule,
    SettingsModule,
    InventoryModule,
    EmailLogsModule,
    VouchersModule,
    FavoritesModule,
    ProfileModule,
  ],
})
export class AppModule {}
