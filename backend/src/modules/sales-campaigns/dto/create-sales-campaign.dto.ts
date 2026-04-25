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

export enum SalesCampaignTypeDto {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

export enum SalesCampaignScopeDto {
  ALL_PRODUCTS = 'ALL_PRODUCTS',
  SPECIFIC_PRODUCTS = 'SPECIFIC_PRODUCTS',
  SPECIFIC_CATEGORIES = 'SPECIFIC_CATEGORIES',
}

export class CreateSalesCampaignDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(SalesCampaignTypeDto)
  type: SalesCampaignTypeDto;

  /** PERCENTAGE: 1–100. FIXED_AMOUNT: discount in integer minor units (e.g. paisa for PKR). */
  @IsInt()
  @Min(1)
  value: number;

  @IsString()
  startsAt: string;

  @IsString()
  endsAt: string;

  @IsEnum(SalesCampaignScopeDto)
  applyTo: SalesCampaignScopeDto;

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
