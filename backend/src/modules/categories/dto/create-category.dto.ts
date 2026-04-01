import {
  IsString,
  IsOptional,
  MinLength,
  Matches,
  IsBoolean,
  IsInt,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must be lowercase letters, numbers, and hyphens only',
  })
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  bannerImageUrl?: string;

  @IsOptional()
  @IsBoolean()
  showOnLanding?: boolean;

  @IsOptional()
  @IsInt()
  landingOrder?: number;

  @IsOptional()
  @IsString()
  parentId?: string;
}
