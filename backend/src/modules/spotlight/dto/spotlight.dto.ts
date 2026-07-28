import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSpotlightItemDto {
  @IsUUID()
  mediaId: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** Videos only: muted inline autoplay on the homepage. Defaults to true. */
  @IsOptional()
  @IsBoolean()
  autoplay?: boolean;
}

export class UpdateSpotlightItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  autoplay?: boolean;
}

export class ReorderSpotlightDto {
  @IsArray()
  @IsUUID('4', { each: true })
  orderedIds: string[];
}
