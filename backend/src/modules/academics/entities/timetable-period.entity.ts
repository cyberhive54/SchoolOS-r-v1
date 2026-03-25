import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * timetable_periods — school-level period slot definitions.
 * e.g. "Period 1 (08:00–08:45)", "Lunch (13:00–13:40)".
 *
 * RULE: school_id MUST be first in all composite indexes.
 */
@Entity('timetable_periods')
@Index('idx_tt_periods_school_year', ['school_id', 'academic_year_id'])
export class TimetablePeriodEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  academic_year_id!: string;

  /** Display name, e.g. "Period 1" or "Lunch Break" */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /** Sort order / slot number (1, 2, 3 ...) */
  @Column({ type: 'smallint' })
  period_number!: number;

  /** HH:MM:SS */
  @Column({ type: 'time' })
  start_time!: string;

  /** HH:MM:SS */
  @Column({ type: 'time' })
  end_time!: string;

  /** If true, this period is a break (Lunch, Recess) — no class assigned */
  @Column({ type: 'boolean', default: false })
  is_break!: boolean;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
