import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * class_section_subjects — subjects assigned to each class-section for a given academic year.
 *
 * RULE: school_id MUST be the first column in ALL composite indexes.
 */
@Entity('class_section_subjects')
@Index('idx_css_school_cs', ['school_id', 'class_section_id'])
export class ClassSectionSubjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FIRST in composite indexes — tenant column */
  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  class_section_id!: string;

  @Column({ type: 'uuid' })
  subject_id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
