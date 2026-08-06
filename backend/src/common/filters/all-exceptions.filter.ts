import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

/**
 * AllExceptionsFilter — converts every thrown exception into our standard
 * error envelope: { success: false, error: { code, message } }.
 *
 * Why a global filter: controllers and services throw natural NestJS/TypeORM
 * exceptions. This single place translates them into a consistent API shape
 * so the frontend always knows what to expect.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        // class-validator returns { message: string[] } — join them for readability
        message = Array.isArray(resp.message)
          ? resp.message.join('; ')
          : resp.message || message;
      }

      // Map HTTP status to a clean error code string
      errorCode = this.statusToCode(statusCode, message);
    } else if (exception instanceof QueryFailedError) {
      // TypeORM query failure — most common are constraint violations
      const mysqlErr = exception as any;
      if (mysqlErr.code === 'ER_DUP_ENTRY') {
        statusCode = HttpStatus.CONFLICT;
        errorCode = 'DUPLICATE_ENTRY';
        message = 'A record with this value already exists';
      } else {
        this.logger.error('QueryFailedError', exception);
        message = 'Database query failed';
      }
    } else if (exception instanceof EntityNotFoundError) {
      statusCode = HttpStatus.NOT_FOUND;
      errorCode = 'NOT_FOUND';
      message = 'The requested resource was not found';
    } else {
      // Unknown — log it, return generic 500
      this.logger.error('Unhandled exception', exception);
    }

    // Log non-5xx errors at warn level, 5xx at error level
    if (statusCode >= 500) {
      this.logger.error(`${request.method} ${request.url} → ${statusCode}`, String(exception));
    } else if (statusCode >= 400) {
      this.logger.warn(`${request.method} ${request.url} → ${statusCode}: ${message}`);
    }

    response.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message,
      },
    });
  }

  private statusToCode(status: number, message: string): string {
    // If the message itself already looks like a CODE (all-caps, underscored), use it
    if (/^[A-Z_]+$/.test(message)) return message;

    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return map[status] || 'ERROR';
  }
}
