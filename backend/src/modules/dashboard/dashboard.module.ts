import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
