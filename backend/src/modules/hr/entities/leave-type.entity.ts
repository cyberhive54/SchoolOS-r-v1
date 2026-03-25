import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type LeaveApplicableTo = 'all' | 'teaching' | 'non_teaching';

@Entity('leave_types')
@Index('idx_leave_types_school', ['school_id'])
export class LeaveTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 10 })
  code!: string;

  @Column({ type: 'int', default: 0 })
  max_days_per_year!: number;

  @Column({ type: 'boolean', default: true })
  is_paid!: boolean;

  @Column({ type: 'boolean', default: false })
  carry_forward!: boolean;

  @Column({ type: 'enum', enum: ['all', 'teaching', 'non_teaching'], default: 'all' })
  applicable_to!: LeaveApplicableTo;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
