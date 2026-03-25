import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 013 — HR: Staff Documents
 *
 * Creates:
 *   staff_documents — uploaded documents per staff member (offer letter, certificates, ID proof, etc.)
 */
export class HrStaffDocuments1720000000013 implements MigrationInterface {
  name = 'HrStaffDocuments1720000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "staff_document_type_enum" AS ENUM (
        'offer_letter', 'appointment_letter', 'id_proof',
        'address_proof', 'educational_certificate', 'experience_letter',
        'aadhaar_card', 'pan_card', 'passport', 'other'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "staff_documents" (
        "id"             UUID                      NOT NULL DEFAULT gen_random_uuid(),
        "school_id"      UUID                      NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "staff_id"       UUID                      NOT NULL REFERENCES "staff" ("id") ON DELETE CASCADE,
        "document_type"  staff_document_type_enum  NOT NULL DEFAULT 'other',
        "title"          VARCHAR(200)              NOT NULL,
        "file_url"       TEXT                      NOT NULL,
        "file_name"      VARCHAR(255)              NOT NULL,
        "file_size_kb"   INTEGER                   NULL,
        "mime_type"      VARCHAR(100)              NULL,
        "uploaded_by"    UUID                      NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
        "notes"          TEXT                      NULL,
        "created_at"     TIMESTAMPTZ               NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ               NOT NULL DEFAULT now(),
        CONSTRAINT "pk_staff_documents" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_staff_docs_school_staff" ON "staff_documents" ("school_id", "staff_id");
      COMMENT ON TABLE "staff_documents" IS 'HR document store for staff (offer letter, ID proof, certificates, etc.)';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_documents"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "staff_document_type_enum"`);
  }
}
