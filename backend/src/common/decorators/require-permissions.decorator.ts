import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@schoolos/config';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * @RequirePermissions(...permissions) — declares which permissions are needed.
 * Checked by PermissionsGuard after JwtAuthGuard.
 *
 * super_admin bypasses all permission checks.
 *
 * Usage:
 *   @Post()
 *   @UseGuards(JwtAuthGuard, PermissionsGuard)
 *   @RequirePermissions(PERMISSIONS.STUDENTS_PROFILE_CREATE)
 *   createStudent(...) { ... }
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
