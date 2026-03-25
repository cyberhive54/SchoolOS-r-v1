import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { ThrottlerOptions } from '@nestjs/throttler';
import type { AuthUser } from '@schoolos/types';

/**
 * Named throttlers configured in ThrottlerModule (one per user class):
 *   admin   → 2 000 req / hour
 *   staff   → 1 000 req / hour
 *   student →   500 req / hour
 *   guest   →   100 req / hour
 *
 * Names MUST match the throttler names in AppModule's ThrottlerModule.forRootAsync.
 */
const ROLE_TO_THROTTLER_NAME: Record<string, string> = {
  super_admin: 'admin',
  school_admin: 'admin',
  teacher: 'staff',
  staff: 'staff',
  accountant: 'staff',
  librarian: 'staff',
  student: 'student',
  parent: 'student',
};

const GUEST_THROTTLER_NAME = 'guest';

/**
 * RoleAwareThrottlerGuard — enforces different rate limits per user role.
 *
 * Extends ThrottlerGuard and overrides one method:
 *   canActivate — filters `this.throttlers` to only the named throttler that
 *                 matches the current user's role, then delegates to super.
 *                 Default IP-based tracking (inherited) applies per bucket.
 *
 * Guard order in AppModule:
 *   1. JwtAuthGuard            — populates req.user (skipped for @Public routes)
 *   2. RoleAwareThrottlerGuard — reads req.user.role to select the correct bucket
 */
@Injectable()
export class RoleAwareThrottlerGuard extends ThrottlerGuard {
  private resolveThrottlerName(context: ExecutionContext): string {
    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!req.user?.role) return GUEST_THROTTLER_NAME;
    return ROLE_TO_THROTTLER_NAME[req.user.role] ?? GUEST_THROTTLER_NAME;
  }

  /**
   * Apply only the throttler bucket matching the current user's role.
   * Temporarily replaces `this.throttlers` (protected Array<ThrottlerOptions>)
   * with a single-element array, then restores in finally to prevent bleed.
   */
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const targetName = this.resolveThrottlerName(context);
    const allThrottlers: ThrottlerOptions[] = this.throttlers;

    const matched = allThrottlers.filter(
      (t) => !t.name || t.name === targetName,
    );
    this.throttlers = matched.length > 0 ? matched : allThrottlers;

    try {
      return await super.canActivate(context);
    } finally {
      this.throttlers = allThrottlers;
    }
  }
}
