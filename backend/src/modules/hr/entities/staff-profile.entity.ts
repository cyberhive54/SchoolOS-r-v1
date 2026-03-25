import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('staff_profiles')
@Index('idx_staff_profiles_school', ['school_id'])
export class StaffProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  staff_id!: string;

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

  @Column({ type: 'varchar', length: 200, nullable: true })
  emergency_contact_name!: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  emergency_contact_phone!: string | null;

  @Column({ type: 'text', nullable: true })
  qualification!: string | null;

  @Column({ type: 'int', nullable: true })
  experience_years!: number | null;

  @Column({ type: 'varchar', length: 12, nullable: true })
  aadhaar_no!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  pan_no!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  bank_account_no!: string | null;

  @Column({ type: 'varchar', length: 15, nullable: true })
  bank_ifsc!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bank_name!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
