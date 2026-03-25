import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { SchoolMembershipEntity } from '../../users/entities/school-membership.entity';
import type { UserRole } from '@schoolos/types';
import { ROLES } from '@schoolos/config';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  /**
   * In-memory cache: key = `${userId}:${schoolId}:${permission}` → boolean.
   * More specific than role-based caching to support future per-user overrides.
   * Cleared on permission updates.
   */
  private readonly cache = new Map<string, boolean>();

  constructor(
    @InjectRepository(RolePermissionEntity)
    private readonly permRepo: Repository<RolePermissionEntity>,
    @InjectRepository(SchoolMembershipEntity)
    private readonly membershipRepo: Repository<SchoolMembershipEntity>,
  ) {}

  /**
   * Check if a user has a specific permission in a school.
   * Resolves the user's role from their school membership, then checks
   * the role_permissions table.
   *
   * @param userId       The user's UUID (from req.user.id)
   * @param schoolId     The school's UUID (from req.user.school_id)
   * @param permission   Dot-notation permission string (e.g. "students.students.view")
   */
  async hasPermission(
    userId: string,
    schoolId: string,
    permission: string,
  ): Promise<boolean> {
    const cacheKey = `${userId}:${schoolId}:${permission}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? false;
    }

    // Resolve the user's role from their active membership
    const membership = await this.membershipRepo.findOne({
      where: { school_id: schoolId, user_id: userId, is_active: true },
      select: ['role'],
    });

    if (!membership) {
      this.cache.set(cacheKey, false);
      return false;
    }

    const role = membership.role as UserRole;

    // super_admin always passes
    if (role === ROLES.SUPER_ADMIN) {
      this.cache.set(cacheKey, true);
      return true;
    }

    const record = await this.permRepo.findOne({
      where: { role, permission },
    });
    const result = record !== null;
    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Role-based permission check (used by guards that already have the role).
   * Faster than hasPermission() since it skips the membership lookup.
   */
  async hasPermissionByRole(role: UserRole, permission: string): Promise<boolean> {
    if (role === ROLES.SUPER_ADMIN) return true;

    const cacheKey = `role:${role}:${permission}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) ?? false;

    const record = await this.permRepo.findOne({ where: { role, permission } });
    const result = record !== null;
    this.cache.set(cacheKey, result);
    return result;
  }

  /** Get all permissions for a role */
  async getPermissionsForRole(role: UserRole): Promise<string[]> {
    if (role === ROLES.SUPER_ADMIN) return ['*'];
    const records = await this.permRepo.find({ where: { role } });
    return records.map((r) => r.permission);
  }

  /** Invalidate the cache (call after permission updates) */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Permissions cache cleared');
  }
}
