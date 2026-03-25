import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 008 — HR: Structure Tables
 *
 * Creates:
 *   departments, designations, staff, staff_profiles
 *
 * Rules:
 *   - school_id is FIRST in ALL composite indexes
 *   - All PKs are UUID (gen_random_uuid())
 *   - All timestamps are TIMESTAMPTZ
 */
export class HrStructure1720000000008 implements MigrationInterface {
  name = 'HrStructure1720000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── employment_type enum ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "employment_type_enum" AS ENUM ('permanent', 'contractual', 'part_time', 'probation');
    `);

    // ── staff_status enum ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "staff_status_enum" AS ENUM ('active', 'inactive', 'resigned', 'terminated');
    `);

    // ── departments ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "departments" (
        "id"           UUID         NOT NULL DEFAULT gen_random_uuid(),
        "school_id"    UUID         NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "name"         VARCHAR(200) NOT NULL,
        "description"  TEXT         NULL,
        "head_staff_id" UUID        NULL,
        "is_active"    BOOLEAN      NOT NULL DEFAULT true,
        "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"   TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_departments" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_departments_school" ON "departments" ("school_id");
      CREATE UNIQUE INDEX "idx_departments_school_name_active"
        ON "departments" ("school_id", "name")
        WHERE "is_active" = true;
      COMMENT ON TABLE "departments" IS 'School departments. head_staff_id is a self-ref to staff (added later via FK).';
    `);

    // ── designations ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "designations" (
        "id"                UUID         NOT NULL DEFAULT gen_random_uuid(),
        "school_id"         UUID         NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "name"              VARCHAR(200) NOT NULL,
        "department_id"     UUID         NULL REFERENCES "departments" ("id") ON DELETE SET NULL,
        "level"             INT          NULL,
        "is_teaching_staff" BOOLEAN      NOT NULL DEFAULT false,
        "is_active"         BOOLEAN      NOT NULL DEFAULT true,
        "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_designations" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_designations_school"   ON "designations" ("school_id");
      CREATE INDEX "idx_designations_school_dept" ON "designations" ("school_id", "department_id");
      COMMENT ON TABLE "designations" IS 'Job designations per school. is_teaching_staff controls leave applicable_to logic.';
    `);

    // ── staff ─────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "staff" (
        "id"               UUID                 NOT NULL DEFAULT gen_random_uuid(),
        "school_id"        UUID                 NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "user_id"          UUID                 NULL REFERENCES "users" ("id") ON DELETE SET NULL,
        "employee_id"      VARCHAR(50)          NOT NULL,
        "first_name"       VARCHAR(100)         NOT NULL,
        "last_name"        VARCHAR(100)         NOT NULL,
        "date_of_birth"    DATE                 NULL,
        "gender"           VARCHAR(10)          NULL,
        "blood_group"      VARCHAR(5)           NULL,
        "phone"            VARCHAR(15)          NOT NULL,
        "alternate_phone"  VARCHAR(15)          NULL,
        "personal_email"   VARCHAR(255)         NULL,
        "department_id"    UUID                 NULL REFERENCES "departments" ("id") ON DELETE SET NULL,
        "designation_id"   UUID                 NULL REFERENCES "designations" ("id") ON DELETE SET NULL,
        "join_date"        DATE                 NOT NULL,
        "employment_type"  employment_type_enum NOT NULL DEFAULT 'permanent',
        "status"           staff_status_enum    NOT NULL DEFAULT 'active',
        "salary_grade"     VARCHAR(50)          NULL,
        "created_at"       TIMESTAMPTZ          NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ          NOT NULL DEFAULT now(),
        "deleted_at"       TIMESTAMPTZ          NULL,
        CONSTRAINT "pk_staff" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_staff_school_employee_id" ON "staff" ("school_id", "employee_id") WHERE "deleted_at" IS NULL;
      CREATE UNIQUE INDEX "idx_staff_school_user_id"     ON "staff" ("school_id", "user_id")     WHERE "deleted_at" IS NULL AND "user_id" IS NOT NULL;
      CREATE INDEX "idx_staff_school"             ON "staff" ("school_id");
      CREATE INDEX "idx_staff_school_status"      ON "staff" ("school_id", "status");
      CREATE INDEX "idx_staff_school_dept"        ON "staff" ("school_id", "department_id");
      CREATE INDEX "idx_staff_school_designation" ON "staff" ("school_id", "designation_id");
      COMMENT ON TABLE "staff" IS 'Core staff identity. user_id links to login account.';
    `);

    // ── Add FK from departments.head_staff_id → staff ─────────────────────────
    await queryRunner.query(`
      ALTER TABLE "departments"
        ADD CONSTRAINT "fk_departments_head_staff"
        FOREIGN KEY ("head_staff_id") REFERENCES "staff" ("id") ON DELETE SET NULL;
    `);

    // ── staff_profiles ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "staff_profiles" (
        "id"                      UUID         NOT NULL DEFAULT gen_random_uuid(),
        "staff_id"                UUID         NOT NULL REFERENCES "staff" ("id") ON DELETE CASCADE,
        "school_id"               UUID         NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "address_line1"           TEXT         NULL,
        "address_line2"           TEXT         NULL,
        "city"                    VARCHAR(100) NULL,
        "state"                   VARCHAR(100) NULL,
        "pincode"                 VARCHAR(10)  NULL,
        "emergency_contact_name"  VARCHAR(200) NULL,
        "emergency_contact_phone" VARCHAR(15)  NULL,
        "qualification"           TEXT         NULL,
        "experience_years"        INT          NULL,
        "aadhaar_no"              VARCHAR(12)  NULL,
        "pan_no"                  VARCHAR(10)  NULL,
        "bank_account_no"         VARCHAR(30)  NULL,
        "bank_ifsc"               VARCHAR(15)  NULL,
        "bank_name"               VARCHAR(100) NULL,
        "created_at"              TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"              TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_staff_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "uq_staff_profiles_staff" UNIQUE ("staff_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_staff_profiles_school" ON "staff_profiles" ("school_id");
      COMMENT ON TABLE "staff_profiles" IS 'Extended staff profile — one-to-one with staff.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "fk_departments_head_staff"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "designations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "departments"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "staff_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "employment_type_enum"`);
  }
}
