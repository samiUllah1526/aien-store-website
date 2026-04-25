import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsBoolean,
  IsInt,
  IsArray,
  ArrayMaxSize,
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
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(120, { each: true })
  highlights?: string[];

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
