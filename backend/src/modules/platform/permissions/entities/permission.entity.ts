import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * PermissionEntity — master catalog of all platform permissions.
 *
 * Each row is a discrete capability defined in @schoolos/config/PERMISSIONS.
 * Format: "{module}.{resource}.{action}" (e.g. "students.students.view")
 *
 * This table is seeded at startup and should not be deleted from in production.
 * It is NOT tenant-scoped — permissions are global to the platform.
 */
@Entity('permissions')
@Unique('uq_permissions_key', ['permission_key'])
export class PermissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Full dot-notation key — e.g. "students.students.view" */
  @Column({ type: 'varchar', length: 255 })
  permission_key!: string;

  /** Module name — e.g. "students", "fees", "academics" */
  @Index('idx_permissions_module')
  @Column({ type: 'varchar', length: 100 })
  module!: string;

  /** Resource within the module — e.g. "students", "invoices" */
  @Column({ type: 'varchar', length: 100 })
  resource!: string;

  /** Action on the resource — e.g. "view", "create", "update", "delete" */
  @Column({ type: 'varchar', length: 100 })
  action!: string;

  /** Human-readable description */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
