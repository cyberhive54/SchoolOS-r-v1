import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import type { SchoolTheme, SubscriptionTier } from '@schoolos/types';

@Entity('schools')
export class SchoolEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255, nullable: true, unique: true })
  domain!: string | null;

  @Column({ type: 'text', array: true, default: '{}' })
  active_modules!: string[];

  @Column({ type: 'varchar', length: 50, default: 'free' })
  subscription_tier!: SubscriptionTier;

  @Column({ type: 'jsonb', default: '{}' })
  theme!: SchoolTheme;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
