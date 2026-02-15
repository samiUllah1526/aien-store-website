import { IsOptional, IsEnum, IsInt, Min, Max, IsString, IsDateString, IsUUID, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export class OrderQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  /** Exact order ID (UUID) to find a single order. */
  @IsOptional()
  @IsString()
  orderId?: string;

  /** Search customer email (partial match, case-insensitive). */
  @IsOptional()
  @IsString()
  customerEmail?: string;

  /** Filter orders with totalCents >= this value. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalMinCents?: number;

  /** Filter orders with totalCents <= this value. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalMaxCents?: number;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @ValidateIf((o) => o.assignedToUserId != null && o.assignedToUserId !== '')
  @IsUUID('4', { message: 'Assigned staff ID must be a valid UUID' })
  assignedToUserId?: string;
}
