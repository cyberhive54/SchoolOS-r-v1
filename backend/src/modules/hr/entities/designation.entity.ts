import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('designations')
@Index('idx_designations_school', ['school_id'])
@Index('idx_designations_school_dept', ['school_id', 'department_id'])
export class DesignationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'uuid', nullable: true })
  department_id!: string | null;

  @Column({ type: 'int', nullable: true })
  level!: number | null;

  @Column({ type: 'boolean', default: false })
  is_teaching_staff!: boolean;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
