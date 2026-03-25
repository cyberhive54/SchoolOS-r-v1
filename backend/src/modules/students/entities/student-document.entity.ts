import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum StudentDocumentType {
  BIRTH_CERTIFICATE    = 'birth_certificate',
  AADHAAR_CARD         = 'aadhaar_card',
  TRANSFER_CERTIFICATE = 'transfer_certificate',
  MARKSHEET            = 'marksheet',
  CASTE_CERTIFICATE    = 'caste_certificate',
  INCOME_CERTIFICATE   = 'income_certificate',
  MEDICAL_CERTIFICATE  = 'medical_certificate',
  PASSPORT             = 'passport',
  OTHER                = 'other',
}

/**
 * student_documents — file uploads attached to a student record.
 * Files are stored externally (S3 / object-storage); this table stores metadata + URL.
 *
 * RULE: school_id MUST be first in all composite indexes.
 */
@Entity('student_documents')
@Index('idx_student_docs_school_student', ['school_id', 'student_id'])
export class StudentDocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  school_id!: string;

  @Column({ type: 'uuid' })
  student_id!: string;

  @Column({
    type: 'enum',
    enum: StudentDocumentType,
    default: StudentDocumentType.OTHER,
  })
  document_type!: StudentDocumentType;

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
