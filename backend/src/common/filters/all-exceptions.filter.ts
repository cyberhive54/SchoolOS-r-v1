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

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Global exception filter — wraps ALL errors in the standard envelope.
 * { "error": { "code": "UPPER_SNAKE", "message": "...", "details": {} } }
 *
 * Stack traces are NEVER exposed in responses.
 * All errors are logged server-side with request context.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.resolveError(exception);

    this.logger.error(
      `[${request.method}] ${request.url} → ${status} ${body.error.code}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json(body);
  }

  private resolveError(exception: unknown): { status: number; body: ApiErrorBody } {
    // NestJS HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'object' && response !== null) {
        const res = response as Record<string, unknown>;

        // class-validator ValidationPipe errors
        if (Array.isArray(res['message'])) {
          return {
            status,
            body: {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Request validation failed.',
                details: {
                  fields: (res['message'] as string[]).map((msg) => ({
                    message: msg,
                  })),
                },
              },
            },
          };
        }

        // Already-formatted error (re-thrown from services)
        if (typeof res['error'] === 'object' && res['error'] !== null) {
          const err = res['error'] as Record<string, unknown>;
          return {
            status,
            body: {
              error: {
                code: String(err['code'] ?? 'HTTP_ERROR'),
                message: String(err['message'] ?? exception.message),
                details: (err['details'] as Record<string, unknown>) ?? undefined,
              },
            },
          };
        }

        return {
          status,
          body: {
            error: {
              code: this.httpStatusToCode(status),
              message: String(res['message'] ?? exception.message),
            },
          },
        };
      }

      return {
        status,
        body: {
          error: {
            code: this.httpStatusToCode(status),
            message: String(response),
          },
        },
      };
    }

    // TypeORM unique constraint violation
    if (exception instanceof QueryFailedError) {
      const err = exception as QueryFailedError & { code?: string; detail?: string };
      if (err.code === '23505') {
        return {
          status: HttpStatus.CONFLICT,
          body: {
            error: {
              code: 'CONFLICT',
              message: 'A record with these details already exists.',
            },
          },
        };
      }
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        body: {
          error: {
            code: 'DATABASE_ERROR',
            message: 'A database error occurred.',
          },
        },
      };
    }

    // TypeORM entity not found
    if (exception instanceof EntityNotFoundError) {
      return {
        status: HttpStatus.NOT_FOUND,
        body: {
          error: {
            code: 'NOT_FOUND',
            message: 'The requested resource was not found.',
          },
        },
      };
    }

    // Unknown / unhandled
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
        },
      },
    };
  }

  private httpStatusToCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_ALLOWED',
      408: 'REQUEST_TIMEOUT',
      409: 'CONFLICT',
      410: 'GONE',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] ?? 'HTTP_ERROR';
  }
}
