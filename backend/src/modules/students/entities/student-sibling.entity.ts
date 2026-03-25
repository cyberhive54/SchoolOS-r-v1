import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * student_siblings — bi-directional sibling relationships.
 * When A is sibling of B, both rows exist: (A→B) and (B→A).
 * Used by Fees module for automatic sibling discount detection.
 *
 * RULE: school_id MUST be first in all composite indexes.
 */
@Entity('student_siblings')
@Index('idx_student_siblings_school_student', ['school_id', 'student_id'])
@Index('idx_student_siblings_school_sibling', ['school_id', 'sibling_id'])
export class StudentSiblingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  student_id!: string;

  @Column({ type: 'uuid' })
  sibling_id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;
}
