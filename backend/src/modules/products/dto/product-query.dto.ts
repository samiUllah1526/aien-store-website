import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ProductQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  /** Category slug (e.g. "shirts"); resolved to categoryId when provided. */
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  @IsIn(['name', 'price', 'createdAt', 'slug', 'stockQuantity'])
  sortBy?: 'name' | 'price' | 'createdAt' | 'slug' | 'stockQuantity' = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  /** Inventory page: filter by stock level. */
  @IsOptional()
  @IsString()
  @IsIn(['all', 'low_stock', 'out_of_stock'])
  stockFilter?: 'all' | 'low_stock' | 'out_of_stock' = 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPriceCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPriceCents?: number;

  @IsOptional()
  @IsString()
  featured?: 'true' | 'false';
}
