import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 007 — Students: Guardians & Enrollments
 *
 * Creates:
 *   guardians, student_guardians, student_enrollments
 *
 * Rules:
 *   - school_id is FIRST in ALL composite indexes
 *   - All PKs are UUID (gen_random_uuid())
 *   - All timestamps are TIMESTAMPTZ
 */
export class StudentsGuardiansEnrollments1720000000007 implements MigrationInterface {
  name = 'StudentsGuardiansEnrollments1720000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── guardians ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "guardian_relation_enum" AS ENUM ('father', 'mother', 'guardian', 'other');
    `);

    await queryRunner.query(`
      CREATE TABLE "guardians" (
        "id"          UUID                   NOT NULL DEFAULT gen_random_uuid(),
        "school_id"   UUID                   NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "relation"    guardian_relation_enum NOT NULL,
        "first_name"  VARCHAR(100)           NOT NULL,
        "last_name"   VARCHAR(100)           NOT NULL,
        "phone"       VARCHAR(15)            NOT NULL,
        "email"       VARCHAR(255)           NULL,
        "occupation"  VARCHAR(200)           NULL,
        "aadhaar_no"  VARCHAR(12)            NULL,
        "user_id"     UUID                   NULL REFERENCES "users" ("id") ON DELETE SET NULL,
        "created_at"  TIMESTAMPTZ            NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ            NOT NULL DEFAULT now(),
        CONSTRAINT "pk_guardians" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_guardians_school"       ON "guardians" ("school_id");
      CREATE INDEX "idx_guardians_school_phone" ON "guardians" ("school_id", "phone");
      COMMENT ON TABLE "guardians" IS 'Guardian records. Can be linked to portal users via user_id.';
    `);

    // ── student_guardians ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "student_guardians" (
        "id"                UUID        NOT NULL DEFAULT gen_random_uuid(),
        "student_id"        UUID        NOT NULL REFERENCES "students" ("id") ON DELETE CASCADE,
        "guardian_id"       UUID        NOT NULL REFERENCES "guardians" ("id") ON DELETE CASCADE,
        "school_id"         UUID        NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "is_primary"        BOOLEAN     NOT NULL DEFAULT FALSE,
        "emergency_contact" BOOLEAN     NOT NULL DEFAULT FALSE,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_student_guardians" PRIMARY KEY ("id"),
        CONSTRAINT "uq_student_guardians_pair" UNIQUE ("student_id", "guardian_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_student_guardians_school_student" ON "student_guardians" ("school_id", "student_id");
      COMMENT ON TABLE "student_guardians" IS 'Many-to-many link between students and guardians.';
    `);

    // ── student_enrollments ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "enrollment_status_enum" AS ENUM ('active', 'transferred', 'promoted', 'detained');
    `);

    await queryRunner.query(`
      CREATE TABLE "student_enrollments" (
        "id"               UUID                   NOT NULL DEFAULT gen_random_uuid(),
        "student_id"       UUID                   NOT NULL REFERENCES "students" ("id") ON DELETE CASCADE,
        "school_id"        UUID                   NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "class_section_id" UUID                   NOT NULL REFERENCES "class_sections" ("id") ON DELETE RESTRICT,
        "academic_year_id" UUID                   NOT NULL REFERENCES "academic_years" ("id") ON DELETE RESTRICT,
        "roll_number"      VARCHAR(20)            NULL,
        "status"           enrollment_status_enum NOT NULL DEFAULT 'active',
        "enrolled_at"      TIMESTAMPTZ            NOT NULL DEFAULT now(),
        "left_at"          TIMESTAMPTZ            NULL,
        "created_at"       TIMESTAMPTZ            NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ            NOT NULL DEFAULT now(),
        CONSTRAINT "pk_student_enrollments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_student_enrollments_active"
        ON "student_enrollments" ("student_id", "academic_year_id")
        WHERE "status" = 'active';
      CREATE INDEX "idx_student_enrollments_school_class_year"
        ON "student_enrollments" ("school_id", "class_section_id", "academic_year_id");
      CREATE INDEX "idx_student_enrollments_school_student"
        ON "student_enrollments" ("school_id", "student_id");
      COMMENT ON TABLE "student_enrollments" IS 'Enrollment of a student in a class-section per academic year.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "student_enrollments" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "enrollment_status_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "student_guardians" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "guardians" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "guardian_relation_enum"`);
  }
}
