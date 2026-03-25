import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import type { UserRole } from '@schoolos/types';

/**
 * role_permissions — maps roles to their allowed permissions.
 * super_admin bypasses this table (checked in PermissionsGuard directly).
 *
 * NOTE: This is a global table (not tenant-scoped) since roles are the same
 * across all schools. Per-school custom roles are a future enhancement.
 */
@Entity('role_permissions')
@Unique('uq_role_permissions_role_permission', ['role', 'permission'])
@Index('idx_role_permissions_role', ['role'])
export class RolePermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  role!: UserRole;

  @Column({ type: 'varchar', length: 255 })
  permission!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
