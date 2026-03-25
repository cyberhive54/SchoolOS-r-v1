import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

export type SubjectType = 'core' | 'elective' | 'activity';

/**
 * subjects — school subjects: Mathematics, English, etc.
 * Board-agnostic — schools define their own.
 *
 * RULE: school_id MUST be the first column in ALL composite indexes.
 */
@Entity('subjects')
@Index('idx_subjects_school', ['school_id'])
export class SubjectEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FIRST in composite indexes — tenant column */
  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  code!: string;

  @Column({
    type: 'enum',
    enum: ['core', 'elective', 'activity'],
    default: 'core',
  })
  type!: SubjectType;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at!: Date | null;
}
