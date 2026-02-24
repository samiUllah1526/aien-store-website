import { IsOptional, IsString, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class JobsQueryDto {
  @IsOptional()
  @IsString()
  queue?: string;

  @IsOptional()
  @IsIn(['created', 'retry', 'active', 'completed', 'cancelled', 'failed'])
  state?: string;

  /** Partial search in id, queue name, state, and job data (type, to, orderId, etc.). Case-insensitive. */
  @IsOptional()
  @IsString()
  search?: string;

  /** Sort column: id, name, state, createdOn, retryCount. */
  @IsOptional()
  @IsIn(['id', 'name', 'state', 'createdOn', 'retryCount'])
  sortBy?: string = 'createdOn';

  /** Sort direction. */
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';

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
