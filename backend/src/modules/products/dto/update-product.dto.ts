import { OmitType, PartialType } from '@nestjs/mapped-types';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';
import { ProductVariantInputDto } from './product-variant-input.dto';

/**
 * Variants are omitted from PartialType(CreateProductDto) so we can allow an empty array:
 * update may send `variants: []` for a full clear without failing ArrayMinSize from create.
 */
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['variants'] as const),
) {
  /** Full replacement list when present; `[]` removes all variants (subject to order FK). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants?: ProductVariantInputDto[];
}
