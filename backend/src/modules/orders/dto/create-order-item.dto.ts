import { IsUUID, IsInt, Min, Max, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

/** Max quantity per line item. Backend enforces; frontend should use same cap. */
export const MAX_ORDER_ITEM_QUANTITY = 99;

export class CreateOrderItemDto {
  @IsUUID(4, { message: 'productId must be a valid UUID' })
  productId: string;

  @IsUUID(4, { message: 'variantId must be a valid UUID' })
  variantId: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[\x20-\x7E]*$/, {
    message: 'color contains invalid characters',
  })
  color?: string;

  @IsInt()
  @Min(1, { message: 'quantity must be at least 1' })
  @Max(MAX_ORDER_ITEM_QUANTITY, { message: `quantity cannot exceed ${MAX_ORDER_ITEM_QUANTITY}` })
  quantity: number;

  /** Size at time of order (e.g. S, M, L, One size) for fulfilment. Optional. Validated server-side. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9\s\-_]+$/, {
    message: 'size can only contain letters, numbers, spaces, hyphen and underscore',
  })
  size?: string;
}
