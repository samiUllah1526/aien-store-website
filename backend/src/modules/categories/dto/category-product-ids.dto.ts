import { IsArray, IsUUID } from 'class-validator';

export class CategoryProductIdsDto {
  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];
}
