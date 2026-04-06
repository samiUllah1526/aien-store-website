import { Module } from '@nestjs/common';
import { SalesCampaignsService } from './sales-campaigns.service';

@Module({
  imports: [],
  controllers: [],
  providers: [SalesCampaignsService],
  exports: [SalesCampaignsService],
})
export class SalesCampaignsModule {}
