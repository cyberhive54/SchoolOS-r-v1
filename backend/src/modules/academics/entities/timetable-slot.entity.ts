import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * timetable_slots — per-day, per-period class schedule assignment.
 * One row = which teacher teaches which subject in which class-section on a given day/period.
 *
 * day_of_week: 1 = Monday, 2 = Tuesday, ... 7 = Sunday.
 *
 * RULE: school_id MUST be first in all composite indexes.
 */
@Entity('timetable_slots')
@Index('idx_tt_slots_school_cs', ['school_id', 'class_section_id'])
@Index('idx_tt_slots_school_year', ['school_id', 'academic_year_id'])
@Index('idx_tt_slots_staff', ['school_id', 'staff_id'])
export class TimetableSlotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  academic_year_id!: string;

  @Column({ type: 'uuid' })
  class_section_id!: string;

  @Column({ type: 'uuid' })
  timetable_period_id!: string;

  /** 1 = Monday ... 5 = Friday ... 7 = Sunday */
  @Column({ type: 'smallint' })
  day_of_week!: number;

  @Column({ type: 'uuid', nullable: true })
  subject_id!: string | null;

  @Column({ type: 'uuid', nullable: true })
  staff_id!: string | null;

  /** True if this period has no class (study hall, activity) */
  @Column({ type: 'boolean', default: false })
  is_free_period!: boolean;

  /** Optional: slot is active from this date (for mid-year changes) */
  @Column({ type: 'date', nullable: true })
  effective_from!: string | null;

  @Column({ type: 'date', nullable: true })
  effective_to!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
