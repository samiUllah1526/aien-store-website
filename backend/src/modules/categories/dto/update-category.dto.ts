import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
  IsBoolean,
  IsInt,
  IsArray,
  ArrayMaxSize,
  IsUUID,
} from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must be lowercase letters, numbers, and hyphens only',
  })
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(120, { each: true })
  highlights?: string[];

  @IsOptional()
  @IsString()
  bannerImageUrl?: string | null;

  @IsOptional()
  @IsBoolean()
  showOnLanding?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsInt()
  landingOrder?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  parentId?: string | null;

  /**
   * When set, replaces all product–category links for this category (transactional with other fields).
   * Omit to leave memberships unchanged. Use [] to remove all products from this category.
   */
  @IsOptional()
  @Transform(({ value }) => (value === null ? undefined : value))
  @IsArray()
  @IsUUID('all', { each: true })
  productIds?: string[];
}
