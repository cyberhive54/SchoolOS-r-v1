import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('student_profiles')
@Index('idx_student_profiles_school', ['school_id'])
export class StudentProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  student_id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'text', nullable: true })
  address_line1!: string | null;

  @Column({ type: 'text', nullable: true })
  address_line2!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  state!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pincode!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'India' })
  country!: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  alternate_phone!: string | null;

  @Column({ type: 'text', nullable: true })
  previous_school!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  previous_class!: string | null;

  @Column({ type: 'date', nullable: true })
  admission_date!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
