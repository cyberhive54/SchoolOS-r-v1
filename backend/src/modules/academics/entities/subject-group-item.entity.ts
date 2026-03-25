import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * subject_group_items — many-to-many join between subject_groups and subjects.
 *
 * RULE: school_id MUST be the first column in ALL composite indexes.
 */
@Entity('subject_group_items')
@Index('idx_subject_group_items_school_group', ['school_id', 'subject_group_id'])
export class SubjectGroupItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FIRST in composite indexes — tenant column */
  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  subject_group_id!: string;

  @Column({ type: 'uuid' })
  subject_id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
