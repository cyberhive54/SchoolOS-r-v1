import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export type StaffAttendanceStatus = 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday';

@Entity('staff_attendance')
@Index('idx_staff_att_school', ['school_id'])
@Index('idx_staff_att_school_date', ['school_id', 'date'])
@Index('idx_staff_att_school_staff', ['school_id', 'staff_id'])
export class StaffAttendanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  staff_id!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'enum', enum: ['present', 'absent', 'half_day', 'on_leave', 'holiday'], default: 'present' })
  status!: StaffAttendanceStatus;

  @Column({ type: 'uuid', nullable: true })
  leave_request_id!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'uuid' })
  marked_by!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
