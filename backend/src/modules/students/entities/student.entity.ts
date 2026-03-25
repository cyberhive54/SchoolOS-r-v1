import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export type StudentGender = 'male' | 'female' | 'other';
export type StudentStatus = 'active' | 'inactive' | 'transferred_out' | 'alumni';

@Entity('students')
@Index('idx_students_school', ['school_id'])
@Index('idx_students_school_status', ['school_id', 'status'])
export class StudentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'varchar', length: 50 })
  admission_no!: string;

  @Column({ type: 'varchar', length: 100 })
  first_name!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  middle_name!: string | null;

  @Column({ type: 'varchar', length: 100 })
  last_name!: string;

  @Column({ type: 'date' })
  date_of_birth!: string;

  @Column({ type: 'enum', enum: ['male', 'female', 'other'] })
  gender!: StudentGender;

  @Column({ type: 'varchar', length: 5, nullable: true })
  blood_group!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  religion!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  caste!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'Indian' })
  nationality!: string | null;

  @Column({ type: 'varchar', length: 12, nullable: true })
  aadhaar_no!: string | null;

  @Column({ type: 'uuid', nullable: true })
  category_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  house_id!: string | null;

  @Column({ type: 'text', nullable: true })
  profile_photo_url!: string | null;

  @Column({ type: 'enum', enum: ['active', 'inactive', 'transferred_out', 'alumni'], default: 'active' })
  status!: StudentStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at!: Date | null;
}
