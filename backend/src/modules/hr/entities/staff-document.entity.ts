import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum StaffDocumentType {
  OFFER_LETTER            = 'offer_letter',
  APPOINTMENT_LETTER      = 'appointment_letter',
  ID_PROOF                = 'id_proof',
  ADDRESS_PROOF           = 'address_proof',
  EDUCATIONAL_CERTIFICATE = 'educational_certificate',
  EXPERIENCE_LETTER       = 'experience_letter',
  AADHAAR_CARD            = 'aadhaar_card',
  PAN_CARD                = 'pan_card',
  PASSPORT                = 'passport',
  OTHER                   = 'other',
}

/**
 * staff_documents — file uploads attached to a staff record.
 * Files are stored externally (S3 / object-storage); this table stores metadata + URL.
 *
 * RULE: school_id MUST be first in all composite indexes.
 */
@Entity('staff_documents')
@Index('idx_staff_docs_school_staff', ['school_id', 'staff_id'])
export class StaffDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  staff_id!: string;

  @Column({
    type: 'enum',
    enum: StaffDocumentType,
    default: StaffDocumentType.OTHER,
  })
  document_type!: StaffDocumentType;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  file_url!: string;

  @Column({ type: 'varchar', length: 255 })
  file_name!: string;

  @Column({ type: 'integer', nullable: true })
  file_size_kb!: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mime_type!: string | null;

  @Column({ type: 'uuid' })
  uploaded_by!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at!: Date;
}
