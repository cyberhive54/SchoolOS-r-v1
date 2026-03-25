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
 * classes — grade levels: Grade 1, Class 6, LKG, etc.
 * Board-agnostic — names are school-defined.
 *
 * RULE: school_id MUST be the first column in ALL composite indexes.
 */
@Entity('classes')
@Index('idx_classes_school', ['school_id'])
@Index('idx_classes_school_order', ['school_id', 'order_index'])
export class ClassEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** FIRST in composite indexes — tenant column */
  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'integer', default: 0 })
  order_index!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deleted_at!: Date | null;
}
