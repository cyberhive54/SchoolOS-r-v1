import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('student_guardians')
@Index('idx_student_guardians_school_student', ['school_id', 'student_id'])
export class StudentGuardianEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  student_id!: string;

  @Column({ type: 'uuid' })
  guardian_id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'boolean', default: false })
  is_primary!: boolean;

  @Column({ type: 'boolean', default: false })
  emergency_contact!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
