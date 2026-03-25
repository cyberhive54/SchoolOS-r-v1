import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * class_sections — specific instance of a class-section for an academic year,
 * e.g. Grade 6-A for 2025-26.
 *
 * RULE: school_id MUST be the first column in ALL composite indexes.
 */
@Entity('class_sections')
@Index('idx_class_sections_school_year', ['school_id', 'academic_year_id'])
@Index('idx_class_sections_school_class', ['school_id', 'class_id'])
export class ClassSectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FIRST in composite indexes — tenant column */
  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  class_id!: string;

  @Column({ type: 'uuid' })
  section_id!: string;

  @Column({ type: 'uuid' })
  academic_year_id!: string;

  @Column({ type: 'integer', nullable: true })
  capacity!: number | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  room_no!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
    comment: 'active | archived',
  })
  status!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
