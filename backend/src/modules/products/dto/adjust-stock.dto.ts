import { IsInt, IsOptional, IsString, MaxLength, IsUUID } from 'class-validator';

export class AdjustStockDto {
  /** Required when product has multiple variants. */
  @IsOptional()
  @IsUUID(4)
  variantId?: string;

  /** Positive = add stock, negative = subtract. Must not result in negative stock. */
  @IsInt()
  quantityDelta: number;

  /** Reason or reference for the adjustment (audit trail). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reference?: string;
}
