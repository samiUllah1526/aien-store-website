import { IsString, IsOptional, IsInt, Min, IsArray, IsBoolean, IsIn } from 'class-validator';
import { CURRENCIES } from '../../../common/constants/currency';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  /** Category IDs (many-to-many). Replaces categoryId. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @IsInt()
  @Min(0)
  priceCents: number;

  @IsOptional()
  @IsString()
  @IsIn(CURRENCIES, { message: `currency must be one of: ${CURRENCIES.join(', ')}` })
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sizes?: string[];

  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @IsOptional()
  @IsString()
  urduVerse?: string;

  @IsOptional()
  @IsString()
  urduVerseTransliteration?: string;

  /** Media IDs (UUIDs) from prior uploads to attach to this product. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaIds?: string[];
}
