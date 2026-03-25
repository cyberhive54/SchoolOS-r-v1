import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { SchoolEntity } from '../../schools/entities/school.entity';
import { UserEntity } from './user.entity';
import type { UserRole } from '@schoolos/types';

/**
 * school_memberships — links a user to a school with a specific role.
 * One user CAN be a teacher in school A and a parent in school B.
 *
 * RULE: school_id MUST be the first column in ALL composite indexes on this table.
 */
@Entity('school_memberships')
@Index('idx_school_memberships_school_user', ['school_id', 'user_id'])
@Index('idx_school_memberships_school_role', ['school_id', 'role'])
export class SchoolMembershipEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FIRST in composite indexes — tenant column */
  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'varchar', length: 50 })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  // Relations (not always loaded)
  @ManyToOne(() => SchoolEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school?: SchoolEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;
}
