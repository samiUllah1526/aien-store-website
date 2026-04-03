import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponseDto } from '../dto/api-response.dto';
import { getPublicPrismaErrorResponse } from '../utils/prisma-public-error';

const GENERIC_SERVER_MESSAGE =
  'Something went wrong. Please try again later.';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const prismaPublic = getPublicPrismaErrorResponse(exception);
    if (prismaPublic) {
      const { status, message } = prismaPublic;
      if (status >= 500) {
        this.logger.error(
          `${req.method} ${req.url} ${status} (Prisma)`,
          exception instanceof Error ? exception.stack : undefined,
        );
      }
      return res.status(status).json(ApiResponseDto.fail(message));
    }

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? ((exception.getResponse() as { message?: string | string[] })
            .message ?? exception.message)
        : GENERIC_SERVER_MESSAGE;

    const normalizedMessage = Array.isArray(message) ? message[0] : message;

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (status === 401) {
      const hasAuth = !!req.headers?.authorization?.startsWith('Bearer ');
      this.logger.warn(
        `401 ${req.method} ${req.url} - ${normalizedMessage} (Authorization: ${hasAuth ? 'present' : 'missing'})`,
      );
    }

    res.status(status).json(ApiResponseDto.fail(normalizedMessage));
  }
}
