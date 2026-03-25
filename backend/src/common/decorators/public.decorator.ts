import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @Public() — marks an endpoint as publicly accessible (skips JwtAuthGuard).
 *
 * Usage:
 *   @Post('login')
 *   @Public()
 *   login(...) { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
