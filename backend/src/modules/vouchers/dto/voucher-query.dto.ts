import { IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class VoucherQueryDto {
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
  @IsIn(['active', 'expired', 'upcoming', ''])
  statusFilter?: string;

  @IsOptional()
  @IsIn(['createdAt', 'code', 'expiryDate', 'usedCount'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
