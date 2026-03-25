import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type GuardianRelation = 'father' | 'mother' | 'guardian' | 'other';

@Entity('guardians')
@Index('idx_guardians_school', ['school_id'])
@Index('idx_guardians_school_phone', ['school_id', 'phone'])
export class GuardianEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'enum', enum: ['father', 'mother', 'guardian', 'other'] })
  relation!: GuardianRelation;

  @Column({ type: 'varchar', length: 100 })
  first_name!: string;

  @Column({ type: 'varchar', length: 100 })
  last_name!: string;

  @Column({ type: 'varchar', length: 15 })
  phone!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  occupation!: string | null;

  @Column({ type: 'varchar', length: 12, nullable: true })
  aadhaar_no!: string | null;

  @Column({ type: 'uuid', nullable: true })
  user_id!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
