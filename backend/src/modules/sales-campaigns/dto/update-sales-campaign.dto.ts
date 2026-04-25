import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsArray,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SalesCampaignTypeDto, SalesCampaignScopeDto } from './create-sales-campaign.dto';

export class UpdateSalesCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(SalesCampaignTypeDto)
  type?: SalesCampaignTypeDto;

  @IsOptional()
  @IsInt()
  @Min(1)
  /** PERCENTAGE: 1–100. FIXED_AMOUNT: minor units (e.g. paisa for PKR). */
  value?: number;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsOptional()
  @IsEnum(SalesCampaignScopeDto)
  applyTo?: SalesCampaignScopeDto;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  badgeText?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  priority?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];

  @IsOptional()
  @IsArray()
  productOverrides?: Array<{ productId: string; overrideValue: number }>;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];
}
