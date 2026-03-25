import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * user_sessions — stores refresh token hashes for session management.
 *
 * SECURITY: Only the bcrypt hash of the refresh token is stored — never the raw token.
 * The raw refresh token is sent once in an HttpOnly cookie and discarded from server memory.
 *
 * RULE: school_id MUST be the first column in ALL composite indexes.
 */
@Entity('user_sessions')
@Index('idx_user_sessions_school_user', ['school_id', 'user_id'])
@Index('idx_user_sessions_expires', ['expires_at'])
export class UserSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FIRST in composite indexes — tenant column */
  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  /** bcrypt hash of the refresh token (never store raw) */
  @Column({ type: 'varchar', length: 255 })
  refresh_token_hash!: string;

  @Column({ type: 'text', nullable: true })
  device_info!: string | null;

  @Column({ type: 'inet', nullable: true })
  ip_address!: string | null;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revoked_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
