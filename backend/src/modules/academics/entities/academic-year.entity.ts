import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * academic_years — session years like 2024-25, 2025-26.
 * Only one can be is_current = true per school at any time.
 *
 * RULE: school_id MUST be the first column in ALL composite indexes.
 */
@Entity('academic_years')
@Index('idx_academic_years_school', ['school_id'])
@Index('idx_academic_years_school_current', ['school_id', 'is_current'])
export class AcademicYearEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FIRST in composite indexes — tenant column */
  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'date' })
  start_date!: string;

  @Column({ type: 'date' })
  end_date!: string;

  @Column({ type: 'boolean', default: false })
  is_current!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
