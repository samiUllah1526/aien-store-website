import {
  IsString,
  IsEmail,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

export enum CreateOrderPaymentMethod {
  COD = 'COD',
  BANK_DEPOSIT = 'BANK_DEPOSIT',
}

export class CreateOrderDto {
  @IsEmail()
  customerEmail: string;

  @IsNotEmpty({ message: 'Phone is required' })
  @IsString()
  customerPhone: string;

  @IsOptional()
  @IsString()
  customerFirstName?: string;

  @IsOptional()
  @IsString()
  customerLastName?: string;

  @IsOptional()
  @IsEnum(CreateOrderPaymentMethod)
  paymentMethod?: CreateOrderPaymentMethod;

  /** Required when paymentMethod is BANK_DEPOSIT. */
  @IsOptional()
  @IsUUID()
  paymentProofMediaId?: string;

  @IsOptional()
  @IsString()
  shippingCountry?: string;

  @IsOptional()
  @IsString()
  shippingAddressLine1?: string;

  @IsOptional()
  @IsString()
  shippingAddressLine2?: string;

  @IsOptional()
  @IsString()
  shippingCity?: string;

  @IsOptional()
  @IsString()
  shippingPostalCode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
