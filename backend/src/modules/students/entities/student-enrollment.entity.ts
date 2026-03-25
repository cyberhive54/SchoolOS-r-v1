import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type EnrollmentStatus = 'active' | 'transferred' | 'promoted' | 'detained';

@Entity('student_enrollments')
@Index('idx_student_enrollments_school_class_year', ['school_id', 'class_section_id', 'academic_year_id'])
@Index('idx_student_enrollments_school_student', ['school_id', 'student_id'])
export class StudentEnrollmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  student_id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  class_section_id!: string;

  @Column({ type: 'uuid' })
  academic_year_id!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  roll_number!: string | null;

  @Column({ type: 'enum', enum: ['active', 'transferred', 'promoted', 'detained'], default: 'active' })
  status!: EnrollmentStatus;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  enrolled_at!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  left_at!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
