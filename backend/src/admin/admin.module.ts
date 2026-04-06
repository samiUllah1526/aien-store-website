import { Module } from '@nestjs/common';
import { AuthModule } from '../modules/auth/auth.module';
import { DashboardModule } from '../modules/dashboard/dashboard.module';
import { UsersModule } from '../modules/users/users.module';
import { RolesModule } from '../modules/roles/roles.module';
import { ProductsModule } from '../modules/products/products.module';
import { OrdersModule } from '../modules/orders/orders.module';
import { CategoriesModule } from '../modules/categories/categories.module';
import { InventoryModule } from '../modules/inventory/inventory.module';
import { SettingsModule } from '../modules/settings/settings.module';
import { VouchersModule } from '../modules/vouchers/vouchers.module';
import { SalesCampaignsModule } from '../modules/sales-campaigns/sales-campaigns.module';
import { MediaModule } from '../modules/media/media.module';
import { EmailLogsModule } from '../modules/email-logs/email-logs.module';
import { JobsModule } from '../modules/jobs/jobs.module';
import { GithubModule } from '../modules/github/github.module';
import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminDashboardController } from './dashboard/admin-dashboard.controller';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminRolesController } from './roles/admin-roles.controller';
import { AdminProductsController } from './products/admin-products.controller';
import { AdminOrdersController } from './orders/admin-orders.controller';
import { AdminCategoriesController } from './categories/admin-categories.controller';
import { AdminInventoryController } from './inventory/admin-inventory.controller';
import { AdminSettingsController } from './settings/admin-settings.controller';
import { AdminVouchersController } from './vouchers/admin-vouchers.controller';
import { AdminMediaController } from './media/admin-media.controller';
import { AdminEmailLogsController } from './email-logs/admin-email-logs.controller';
import { AdminJobsController } from './jobs/admin-jobs.controller';
import { AdminPermissionsController } from './permissions/admin-permissions.controller';
import { AdminDeployController } from './deploy/admin-deploy.controller';
import { AdminSalesCampaignsController } from './sales-campaigns/admin-sales-campaigns.controller';

@Module({
  imports: [
    GithubModule,
    AuthModule,
    DashboardModule,
    UsersModule,
    RolesModule,
    ProductsModule,
    OrdersModule,
    CategoriesModule,
    InventoryModule,
    SettingsModule,
    VouchersModule,
    SalesCampaignsModule,
    MediaModule,
    EmailLogsModule,
    JobsModule,
  ],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminUsersController,
    AdminRolesController,
    AdminProductsController,
    AdminOrdersController,
    AdminCategoriesController,
    AdminInventoryController,
    AdminSettingsController,
    AdminVouchersController,
    AdminMediaController,
    AdminEmailLogsController,
    AdminJobsController,
    AdminPermissionsController,
    AdminDeployController,
    AdminSalesCampaignsController,
  ],
})
export class AdminModule {}
