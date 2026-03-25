import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * timetable_substitutions — daily substitution records.
 * When a teacher is absent, records who covers their slot.
 *
 * RULE: school_id MUST be first in all composite indexes.
 */
@Entity('timetable_substitutions')
@Index('idx_tt_subs_school_date', ['school_id', 'date'])
@Index('idx_tt_subs_absent', ['school_id', 'absent_staff_id'])
export class TimetableSubstitutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'uuid' })
  slot_id!: string;

  @Column({ type: 'uuid' })
  absent_staff_id!: string;

  @Column({ type: 'uuid', nullable: true })
  substitute_staff_id!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'uuid' })
  created_by!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
