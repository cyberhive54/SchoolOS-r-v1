import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 006 — Students Core Tables
 *
 * Creates:
 *   student_categories, student_houses, students, student_profiles
 *
 * Rules:
 *   - school_id is FIRST in ALL composite indexes
 *   - All PKs are UUID (gen_random_uuid())
 *   - All timestamps are TIMESTAMPTZ
 *   - Soft-deletes via deleted_at on students
 */
export class StudentsCoreSchema1720000000006 implements MigrationInterface {
  name = 'StudentsCoreSchema1720000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── student_categories ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "student_categories" (
        "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
        "school_id"   UUID          NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "name"        VARCHAR(100)  NOT NULL,
        "code"        VARCHAR(20)   NOT NULL,
        "description" TEXT          NULL,
        "is_active"   BOOLEAN       NOT NULL DEFAULT TRUE,
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_student_categories" PRIMARY KEY ("id"),
        CONSTRAINT "uq_student_categories_school_code" UNIQUE ("school_id", "code")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_student_categories_school" ON "student_categories" ("school_id");
      COMMENT ON TABLE "student_categories" IS 'School-defined student categories: General, SC, ST, OBC, EWS, etc.';
    `);

    // ── student_houses ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "student_houses" (
        "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
        "school_id"   UUID          NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "name"        VARCHAR(100)  NOT NULL,
        "color_hex"   VARCHAR(7)    NULL,
        "description" TEXT          NULL,
        "is_active"   BOOLEAN       NOT NULL DEFAULT TRUE,
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_student_houses" PRIMARY KEY ("id"),
        CONSTRAINT "uq_student_houses_school_name" UNIQUE ("school_id", "name")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_student_houses_school" ON "student_houses" ("school_id");
      COMMENT ON TABLE "student_houses" IS 'School house system: Red House, Blue House, etc.';
    `);

    // ── students ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "student_gender_enum"  AS ENUM ('male', 'female', 'other');
      CREATE TYPE "student_status_enum"  AS ENUM ('active', 'inactive', 'transferred_out', 'alumni');
    `);

    await queryRunner.query(`
      CREATE TABLE "students" (
        "id"                UUID                   NOT NULL DEFAULT gen_random_uuid(),
        "school_id"         UUID                   NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "admission_no"      VARCHAR(50)            NOT NULL,
        "first_name"        VARCHAR(100)           NOT NULL,
        "middle_name"       VARCHAR(100)           NULL,
        "last_name"         VARCHAR(100)           NOT NULL,
        "date_of_birth"     DATE                   NOT NULL,
        "gender"            student_gender_enum    NOT NULL,
        "blood_group"       VARCHAR(5)             NULL,
        "religion"          VARCHAR(100)           NULL,
        "caste"             VARCHAR(100)           NULL,
        "nationality"       VARCHAR(100)           NULL DEFAULT 'Indian',
        "aadhaar_no"        VARCHAR(12)            NULL,
        "category_id"       UUID                   NULL REFERENCES "student_categories" ("id") ON DELETE SET NULL,
        "house_id"          UUID                   NULL REFERENCES "student_houses" ("id") ON DELETE SET NULL,
        "profile_photo_url" TEXT                   NULL,
        "status"            student_status_enum    NOT NULL DEFAULT 'active',
        "created_at"        TIMESTAMPTZ            NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ            NOT NULL DEFAULT now(),
        "deleted_at"        TIMESTAMPTZ            NULL,
        CONSTRAINT "pk_students" PRIMARY KEY ("id"),
        CONSTRAINT "uq_students_school_admission_no" UNIQUE ("school_id", "admission_no")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_students_school"           ON "students" ("school_id") WHERE "deleted_at" IS NULL;
      CREATE INDEX "idx_students_school_status"    ON "students" ("school_id", "status") WHERE "deleted_at" IS NULL;
      CREATE INDEX "idx_students_school_category"  ON "students" ("school_id", "category_id") WHERE "deleted_at" IS NULL;
      CREATE INDEX "idx_students_school_name"      ON "students" ("school_id", "last_name", "first_name") WHERE "deleted_at" IS NULL;
      COMMENT ON TABLE "students" IS 'Central student identity record. Multi-tenant — scoped by school_id.';
    `);

    // ── student_profiles ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "student_profiles" (
        "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
        "student_id"       UUID         NOT NULL REFERENCES "students" ("id") ON DELETE CASCADE,
        "school_id"        UUID         NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "address_line1"    TEXT         NULL,
        "address_line2"    TEXT         NULL,
        "city"             VARCHAR(100) NULL,
        "state"            VARCHAR(100) NULL,
        "pincode"          VARCHAR(10)  NULL,
        "country"          VARCHAR(100) NULL DEFAULT 'India',
        "phone"            VARCHAR(15)  NULL,
        "alternate_phone"  VARCHAR(15)  NULL,
        "previous_school"  TEXT         NULL,
        "previous_class"   VARCHAR(50)  NULL,
        "admission_date"   DATE         NULL,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_student_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "uq_student_profiles_student" UNIQUE ("student_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_student_profiles_school" ON "student_profiles" ("school_id");
      COMMENT ON TABLE "student_profiles" IS 'Extended student profile — address, previous school, admission details.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "student_profiles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "students" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "student_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "student_gender_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_houses" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_categories" CASCADE`);
  }
}
