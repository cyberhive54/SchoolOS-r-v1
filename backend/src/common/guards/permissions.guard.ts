import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionsService } from '../../modules/platform/permissions/permissions.service';
import type { AuthUser } from '@schoolos/types';
import type { Permission } from '@schoolos/config';
import { ROLES } from '@schoolos/config';

/**
 * PermissionsGuard — checks that the authenticated user has ALL required permissions.
 * Must be applied AFTER JwtAuthGuard.
 *
 * super_admin always passes — they have all permissions.
 * Permission checks are cached in Redis via PermissionsService.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permissions declared → allow (guard is opt-in per endpoint)
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user: AuthUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'Authentication is required.',
        },
      });
    }

    // super_admin bypasses all permission checks
    if (user.role === ROLES.SUPER_ADMIN) {
      return true;
    }

    // Check each required permission (passes userId+schoolId for membership-based resolution)
    for (const permission of requiredPermissions) {
      const hasPermission = await this.permissionsService.hasPermission(
        user.id,
        user.school_id,
        permission,
      );

      if (!hasPermission) {
        throw new ForbiddenException({
          error: {
            code: 'PERMISSION_DENIED',
            message: `You do not have the required permission: ${permission}`,
            details: { required_permission: permission, user_role: user.role },
          },
        });
      }
    }

    return true;
  }
}
