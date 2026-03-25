import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * class_teacher_assignments — one class teacher per class-section.
 *
 * References users.id (not staff.id). When HR module is live, run a follow-up
 * migration to also populate staff_id.
 *
 * RULE: school_id MUST be the first column in ALL composite indexes.
 */
@Entity('class_teacher_assignments')
@Index('idx_cta_school_cs', ['school_id', 'class_section_id'])
@Index('idx_cta_school_user', ['school_id', 'user_id'])
export class ClassTeacherAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FIRST in composite indexes — tenant column */
  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  class_section_id!: string;

  /** References users.id — will also reference staff.id when HR module is available */
  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  assigned_at!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
