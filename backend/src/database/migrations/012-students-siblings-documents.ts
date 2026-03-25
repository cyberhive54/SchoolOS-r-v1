import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 012 — Students: Siblings & Documents
 *
 * Creates:
 *   student_siblings   — sibling relationships between students in the same school
 *   student_documents  — uploaded documents per student (TC, birth certificate, etc.)
 */
export class StudentsExtensions1720000000012 implements MigrationInterface {
  name = 'StudentsExtensions1720000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── student_siblings ───────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "student_siblings" (
        "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
        "school_id"   UUID        NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "student_id"  UUID        NOT NULL REFERENCES "students" ("id") ON DELETE CASCADE,
        "sibling_id"  UUID        NOT NULL REFERENCES "students" ("id") ON DELETE CASCADE,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_student_siblings" PRIMARY KEY ("id"),
        CONSTRAINT "uq_student_sibling_pair" UNIQUE ("school_id", "student_id", "sibling_id"),
        CONSTRAINT "chk_no_self_sibling" CHECK ("student_id" != "sibling_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_student_siblings_school_student" ON "student_siblings" ("school_id", "student_id");
      CREATE INDEX "idx_student_siblings_school_sibling" ON "student_siblings" ("school_id", "sibling_id");
      COMMENT ON TABLE "student_siblings" IS 'Bi-directional sibling links between students. Used for sibling discount detection in Fees module.';
    `);

    // ── student_documents ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "student_document_type_enum" AS ENUM (
        'birth_certificate', 'aadhaar_card', 'transfer_certificate',
        'marksheet', 'caste_certificate', 'income_certificate',
        'medical_certificate', 'passport', 'other'
      );
    `);
    await queryRunner.query(`
      CREATE TABLE "student_documents" (
        "id"             UUID                        NOT NULL DEFAULT gen_random_uuid(),
        "school_id"      UUID                        NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "student_id"     UUID                        NOT NULL REFERENCES "students" ("id") ON DELETE CASCADE,
        "document_type"  student_document_type_enum  NOT NULL DEFAULT 'other',
        "title"          VARCHAR(200)                NOT NULL,
        "file_url"       TEXT                        NOT NULL,
        "file_name"      VARCHAR(255)                NOT NULL,
        "file_size_kb"   INTEGER                     NULL,
        "mime_type"      VARCHAR(100)                NULL,
        "uploaded_by"    UUID                        NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
        "notes"          TEXT                        NULL,
        "created_at"     TIMESTAMPTZ                 NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ                 NOT NULL DEFAULT now(),
        CONSTRAINT "pk_student_documents" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_student_docs_school_student" ON "student_documents" ("school_id", "student_id");
      COMMENT ON TABLE "student_documents" IS 'Student uploaded documents (birth cert, TC, etc.) stored as file URLs.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "student_documents"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "student_document_type_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_siblings"`);
  }
}
