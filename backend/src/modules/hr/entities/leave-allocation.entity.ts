import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('leave_allocations')
@Index('idx_leave_alloc_school', ['school_id'])
@Index('idx_leave_alloc_school_staff', ['school_id', 'staff_id'])
@Index('idx_leave_alloc_year', ['school_id', 'academic_year_id'])
export class LeaveAllocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  staff_id!: string;

  @Column({ type: 'uuid' })
  leave_type_id!: string;

  @Column({ type: 'uuid' })
  academic_year_id!: string;

  @Column({ type: 'int', default: 0 })
  allocated_days!: number;

  @Column({ type: 'int', default: 0 })
  used_days!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  get remaining_days(): number {
    return Math.max(0, this.allocated_days - this.used_days);
  }
}
