import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, Index } from 'typeorm';

export type EmploymentType = 'permanent' | 'contractual' | 'part_time' | 'probation';
export type StaffStatus = 'active' | 'inactive' | 'resigned' | 'terminated';
export type StaffGender = 'male' | 'female' | 'other';

@Entity('staff')
@Index('idx_staff_school', ['school_id'])
@Index('idx_staff_school_status', ['school_id', 'status'])
@Index('idx_staff_school_dept', ['school_id', 'department_id'])
@Index('idx_staff_school_designation', ['school_id', 'designation_id'])
export class StaffEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid', nullable: true })
  user_id!: string | null;

  @Column({ type: 'varchar', length: 50 })
  employee_id!: string;

  @Column({ type: 'varchar', length: 100 })
  first_name!: string;

  @Column({ type: 'varchar', length: 100 })
  last_name!: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender!: StaffGender | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  blood_group!: string | null;

  @Column({ type: 'varchar', length: 15 })
  phone!: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  alternate_phone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  personal_email!: string | null;

  @Column({ type: 'uuid', nullable: true })
  department_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  designation_id!: string | null;

  @Column({ type: 'date' })
  join_date!: string;

  @Column({ type: 'enum', enum: ['permanent', 'contractual', 'part_time', 'probation'], default: 'permanent' })
  employment_type!: EmploymentType;

  @Column({ type: 'enum', enum: ['active', 'inactive', 'resigned', 'terminated'], default: 'active' })
  status!: StaffStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  salary_grade!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at!: Date | null;
}
