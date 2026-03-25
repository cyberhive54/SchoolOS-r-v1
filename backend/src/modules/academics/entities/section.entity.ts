import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

/**
 * sections — section labels: A, B, C or custom names.
 * Shared across all classes in a school.
 *
 * RULE: school_id MUST be the first column in ALL composite indexes.
 */
@Entity('sections')
@Index('idx_sections_school', ['school_id'])
export class SectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FIRST in composite indexes — tenant column */
  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'varchar', length: 50 })
  name!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at!: Date | null;
}
