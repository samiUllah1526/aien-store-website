import { IsUUID, IsInt, Min } from 'class-validator';

export class CreateOrderItemDto {
  @IsUUID(4, { message: 'productId must be a valid UUID' })
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
