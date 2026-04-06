import { IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class SalesCampaignQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['draft', 'scheduled', 'active', 'paused', 'ended', ''])
  displayStatus?: string;

  @IsOptional()
  @IsIn(['createdAt', 'name', 'startsAt', 'endsAt', 'priority'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
