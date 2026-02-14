import { IsString, IsOptional, IsInt, Min, IsArray, IsBoolean } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsInt()
  @Min(0)
  priceCents: number;

  @IsOptional()
  @IsString()
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
