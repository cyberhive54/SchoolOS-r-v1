import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * teacher_subject_assignments — which user teaches which subject in each class-section.
 * One teacher per subject per class-section.
 *
 * References users.id (not staff.id). When HR module is live, run a follow-up
 * migration to also populate staff_id.
 *
 * RULE: school_id MUST be the first column in ALL composite indexes.
 */
@Entity('teacher_subject_assignments')
@Index('idx_tsa_school_cs', ['school_id', 'class_section_id'])
@Index('idx_tsa_school_user', ['school_id', 'user_id'])
export class TeacherSubjectAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FIRST in composite indexes — tenant column */
  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  class_section_id!: string;

  @Column({ type: 'uuid' })
  subject_id!: string;

  /** References users.id — will also reference staff.id when HR module is available */
  @Column({ type: 'uuid' })
  user_id!: string;

  @Column({ type: 'uuid', nullable: true })
  class_section_subject_id!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
