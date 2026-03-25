import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * @CurrentSchool() — extracts the school_id from the request (set by TenantMiddleware).
 *
 * Usage:
 *   @Get('something')
 *   getSomething(@CurrentSchool() schoolId: string) { ... }
 */
export const CurrentSchool = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.school_id ?? '';
  },
);
