/**
 * Consistent API response wrapper for list and single-resource endpoints.
 * Compatible with Astro store frontend expectations.
 */
export class ApiResponseDto<T> {
  success: boolean;
  data?: T;
  message?: string;
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
