import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * subject_groups — groupings like Science, Commerce, Arts for stream-based schools.
 *
 * RULE: school_id MUST be the first column in ALL composite indexes.
 */
@Entity('subject_groups')
@Index('idx_subject_groups_school', ['school_id'])
export class SubjectGroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FIRST in composite indexes — tenant column */
  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
