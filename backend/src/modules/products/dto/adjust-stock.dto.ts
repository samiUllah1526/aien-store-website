import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class AdjustStockDto {
  /** Positive = add stock, negative = subtract. Must not result in negative stock. */
  @IsInt()
  quantityDelta: number;

  /** Reason or reference for the adjustment (audit trail). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reference?: string;
}
