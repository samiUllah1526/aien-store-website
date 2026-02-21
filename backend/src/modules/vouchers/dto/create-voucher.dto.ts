import {
  IsString,
  IsEnum,
  IsInt,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum VoucherTypeDto {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_SHIPPING = 'FREE_SHIPPING',
}

export class CreateVoucherDto {
  @IsString()
  code: string;

  @IsEnum(VoucherTypeDto)
  type: VoucherTypeDto;

  /** PERCENTAGE: 1-100. FIXED_AMOUNT: cents. FREE_SHIPPING: ignored. */
  @IsInt()
  @Min(0)
  value: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  minOrderValueCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxDiscountCents?: number;

  @IsString()
  startDate: string; // ISO date

  @IsString()
  expiryDate: string; // ISO date

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  usageLimitGlobal?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  usageLimitPerUser?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  applicableProductIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  applicableCategoryIds?: string[];

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
