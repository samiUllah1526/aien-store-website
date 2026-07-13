import { IsOptional, IsString, IsIn, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewQueryDto {
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
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', ''])
  status?: string;

  @IsOptional()
  @IsIn(['createdAt', 'rating', 'status'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
