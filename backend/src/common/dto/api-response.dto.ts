import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Consistent API response wrapper for list and single-resource endpoints.
 * Compatible with Astro store frontend expectations.
 */
export class ApiResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiPropertyOptional({ description: 'Response payload' })
  data?: T;

  @ApiPropertyOptional({ example: 'Operation successful' })
  message?: string;

  @ApiPropertyOptional({
    description: 'Pagination metadata for list endpoints',
    example: { total: 100, page: 1, limit: 20, totalPages: 5 },
  })
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };

  static ok<T>(data: T, message?: string): ApiResponseDto<T> {
    return { success: true, data, message };
  }

  static list<T>(
    data: T[],
    meta: { total: number; page: number; limit: number },
  ): ApiResponseDto<T[]> {
    return {
      success: true,
      data,
      meta: {
        ...meta,
        totalPages: Math.ceil(meta.total / meta.limit) || 1,
      },
    };
  }

  static fail(message: string): ApiResponseDto<never> {
    return { success: false, message };
  }
}
