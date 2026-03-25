import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { AuditAction } from '@schoolos/types';

/**
 * audit_logs — immutable record of all significant system events.
 *
 * Retention policy: 90 days hot (in PostgreSQL), 1 year cold (archived to object storage).
 * This table is append-only — never UPDATE or DELETE audit log rows.
 *
 * RULE: school_id MUST be the first column in ALL composite indexes.
 */
@Entity('audit_logs', {
  comment: 'Immutable audit trail. Hot retention: 90 days. Cold archive: 1 year.',
})
@Index('idx_audit_logs_school_created', ['school_id', 'created_at'])
@Index('idx_audit_logs_school_actor', ['school_id', 'actor_id'])
@Index('idx_audit_logs_school_resource', ['school_id', 'resource_type', 'resource_id'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FIRST in composite indexes — tenant column */
  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'varchar', length: 50 })
  action!: AuditAction;

  @Column({ type: 'varchar', length: 100 })
  resource_type!: string;

  @Column({ type: 'uuid', nullable: true })
  resource_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  actor_id!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  old_value!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  new_value!: Record<string, unknown> | null;

  @Column({ type: 'inet', nullable: true })
  ip_address!: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
