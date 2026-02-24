import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class JobsQueryDto {
  @IsOptional()
  @IsString()
  queue?: string;

  @IsOptional()
  @IsIn(['created', 'retry', 'active', 'completed', 'cancelled', 'failed'])
  state?: string;

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
  limit?: number = 50;
}
