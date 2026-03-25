import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

@Entity('leave_requests')
@Index('idx_leave_req_school', ['school_id'])
@Index('idx_leave_req_school_staff', ['school_id', 'staff_id'])
@Index('idx_leave_req_school_status', ['school_id', 'staff_id', 'status'])
export class LeaveRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  staff_id!: string;

  @Column({ type: 'uuid' })
  leave_type_id!: string;

  @Column({ type: 'date' })
  start_date!: string;

  @Column({ type: 'date' })
  end_date!: string;

  @Column({ type: 'int', default: 1 })
  total_days!: number;

  @Column({ type: 'text' })
  reason!: string;

  @Column({ type: 'enum', enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' })
  status!: LeaveRequestStatus;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  review_note!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
