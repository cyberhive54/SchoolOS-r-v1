import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import type { OtpChannel } from '@schoolos/types';

type OtpPurpose = '2fa_login' | 'password_reset' | 'email_verify';

/**
 * otp_requests — stores OTP hashes for 2FA and password reset flows.
 *
 * Per gaps-issues-fixed.md spec:
 *   - OTP is a 6-digit code stored as bcrypt hash (cost 12)
 *   - Expires in 10 minutes
 *   - Max 5 attempts before 15-minute lockout
 *   - Max 3 OTP requests per 10 minutes per account
 *
 * RULE: school_id MUST be the first column in ALL composite indexes.
 */
@Entity('otp_requests')
@Index('idx_otp_requests_school_user', ['school_id', 'user_id'])
@Index('idx_otp_requests_expires', ['expires_at'])
export class OtpRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FIRST in composite indexes — tenant column */
  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 20, default: 'email' })
  channel!: OtpChannel;

  /** bcrypt hash of the 6-digit OTP */
  @Column({ type: 'varchar', length: 255 })
  otp_hash!: string;

  @Column({ type: 'varchar', length: 50 })
  purpose!: OtpPurpose;

  @Column({ type: 'timestamptz' })
  expires_at!: Date;

  /** When the OTP was successfully verified (null = not yet used) */
  @Column({ type: 'timestamptz', nullable: true })
  used_at!: Date | null;

  /** Number of incorrect attempts on this OTP */
  @Column({ type: 'int', default: 0 })
  attempt_count!: number;

  /** Locked until this timestamp after too many failed attempts */
  @Column({ type: 'timestamptz', nullable: true })
  locked_until!: Date | null;

  @Column({ type: 'inet', nullable: true })
  ip_address!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
