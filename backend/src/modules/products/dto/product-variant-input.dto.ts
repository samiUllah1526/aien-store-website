import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, IsUUID } from 'class-validator';

export class ProductVariantInputDto {
  @IsOptional()
  @IsUUID(4)
  id?: string;

  @IsString()
  @MaxLength(80)
  color: string;

  @IsString()
  @MaxLength(80)
  size: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  sku?: string;

  @IsInt()
  @Min(0)
  stockQuantity: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceOverrideCents?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
