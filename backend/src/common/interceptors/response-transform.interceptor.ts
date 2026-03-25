import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

export const SKIP_TRANSFORM_KEY = 'skipTransform';
export const PAGINATED_RESPONSE_KEY = 'paginatedResponse';

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

/**
 * Global response transform interceptor.
 *
 * Single resource:  { "data": <value> }
 * Paginated list:   { "data": [...], "meta": { "total", "page", "per_page", "total_pages", "has_next", "has_prev" } }
 *
 * Use @SkipTransform() to opt out (e.g. for file downloads, SSE streams).
 * Use @PaginatedResponse() when the service returns { items, total, page, per_page }.
 */
@Injectable()
export class ResponseTransformInterceptor<T> implements NestInterceptor<T, unknown> {
  constructor(private readonly reflector?: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    const skip = this.reflector?.get<boolean>(SKIP_TRANSFORM_KEY, context.getHandler()) ?? false;
    if (skip) return next.handle();

    const isPaginated =
      this.reflector?.get<boolean>(PAGINATED_RESPONSE_KEY, context.getHandler()) ?? false;

    return next.handle().pipe(
      map((data) => {
        if (data === null || data === undefined) {
          return { data: null };
        }

        if (isPaginated && this.isPaginatedData(data)) {
          const { items, total, page, per_page } = data as PaginatedData<unknown>;
          const total_pages = Math.ceil(total / per_page);
          return {
            data: items,
            meta: {
              total,
              page,
              per_page,
              total_pages,
              has_next: page < total_pages,
              has_prev: page > 1,
            },
          };
        }

        return { data };
      }),
    );
  }

  private isPaginatedData(data: unknown): data is PaginatedData<unknown> {
    return (
      typeof data === 'object' &&
      data !== null &&
      'items' in data &&
      'total' in data &&
      'page' in data &&
      'per_page' in data
    );
  }
}
