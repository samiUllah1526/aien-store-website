import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class EmailLogQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string;

  /** Search by recipient email (partial, case-insensitive). */
  @IsOptional()
  @IsString()
  email?: string;

  /** Filter by order ID (matches metadata.orderId for order-related emails). */
  @IsOptional()
  @IsString()
  orderId?: string;

  /** Time range: from date (inclusive). ISO date string (YYYY-MM-DD) or full ISO. */
  @IsOptional()
  @IsString()
  fromDate?: string;

  /** Time range: to date (inclusive). ISO date string (YYYY-MM-DD) or full ISO. */
  @IsOptional()
  @IsString()
  toDate?: string;
}
