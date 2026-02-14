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

  @IsOptional()
  @IsString()
  customerEmail?: string;

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
