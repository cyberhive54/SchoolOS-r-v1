import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 009 — HR: Leave Management Tables
 *
 * Creates:
 *   leave_types, leave_allocations, leave_requests
 */
export class HrLeave1720000000009 implements MigrationInterface {
  name = 'HrLeave1720000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── leave_applicable_to enum ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "leave_applicable_to_enum" AS ENUM ('all', 'teaching', 'non_teaching');
    `);

    // ── leave_request_status enum ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "leave_request_status_enum" AS ENUM ('pending', 'approved', 'rejected', 'cancelled');
    `);

    // ── leave_types ───────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "leave_types" (
        "id"                UUID                    NOT NULL DEFAULT gen_random_uuid(),
        "school_id"         UUID                    NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "name"              VARCHAR(200)            NOT NULL,
        "code"              VARCHAR(10)             NOT NULL,
        "max_days_per_year" INT                     NOT NULL DEFAULT 0,
        "is_paid"           BOOLEAN                 NOT NULL DEFAULT true,
        "carry_forward"     BOOLEAN                 NOT NULL DEFAULT false,
        "applicable_to"     leave_applicable_to_enum NOT NULL DEFAULT 'all',
        "is_active"         BOOLEAN                 NOT NULL DEFAULT true,
        "created_at"        TIMESTAMPTZ             NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ             NOT NULL DEFAULT now(),
        CONSTRAINT "pk_leave_types" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_leave_types_school" ON "leave_types" ("school_id");
      CREATE UNIQUE INDEX "idx_leave_types_school_code"
        ON "leave_types" ("school_id", "code")
        WHERE "is_active" = true;
      COMMENT ON TABLE "leave_types" IS 'Leave type definitions per school (CL, SL, EL, etc.).';
    `);

    // ── leave_allocations ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "leave_allocations" (
        "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
        "school_id"        UUID        NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "staff_id"         UUID        NOT NULL REFERENCES "staff" ("id") ON DELETE CASCADE,
        "leave_type_id"    UUID        NOT NULL REFERENCES "leave_types" ("id") ON DELETE CASCADE,
        "academic_year_id" UUID        NOT NULL REFERENCES "academic_years" ("id") ON DELETE CASCADE,
        "allocated_days"   INT         NOT NULL DEFAULT 0,
        "used_days"        INT         NOT NULL DEFAULT 0,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_leave_allocations" PRIMARY KEY ("id"),
        CONSTRAINT "uq_leave_allocation" UNIQUE ("staff_id", "leave_type_id", "academic_year_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_leave_alloc_school"      ON "leave_allocations" ("school_id");
      CREATE INDEX "idx_leave_alloc_school_staff" ON "leave_allocations" ("school_id", "staff_id");
      CREATE INDEX "idx_leave_alloc_year"         ON "leave_allocations" ("school_id", "academic_year_id");
      COMMENT ON TABLE "leave_allocations" IS 'Annual leave balance per staff per leave type. remaining = allocated - used.';
    `);

    // ── leave_requests ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "leave_requests" (
        "id"              UUID                      NOT NULL DEFAULT gen_random_uuid(),
        "school_id"       UUID                      NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "staff_id"        UUID                      NOT NULL REFERENCES "staff" ("id") ON DELETE CASCADE,
        "leave_type_id"   UUID                      NOT NULL REFERENCES "leave_types" ("id") ON DELETE RESTRICT,
        "start_date"      DATE                      NOT NULL,
        "end_date"        DATE                      NOT NULL,
        "total_days"      INT                       NOT NULL DEFAULT 1,
        "reason"          TEXT                      NOT NULL,
        "status"          leave_request_status_enum NOT NULL DEFAULT 'pending',
        "reviewed_by"     UUID                      NULL REFERENCES "users" ("id") ON DELETE SET NULL,
        "reviewed_at"     TIMESTAMPTZ               NULL,
        "review_note"     TEXT                      NULL,
        "created_at"      TIMESTAMPTZ               NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ               NOT NULL DEFAULT now(),
        CONSTRAINT "pk_leave_requests" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_leave_req_school"        ON "leave_requests" ("school_id");
      CREATE INDEX "idx_leave_req_school_staff"  ON "leave_requests" ("school_id", "staff_id");
      CREATE INDEX "idx_leave_req_school_status" ON "leave_requests" ("school_id", "staff_id", "status");
      COMMENT ON TABLE "leave_requests" IS 'Staff leave applications. Approval adjusts leave_allocations.used_days.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "leave_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leave_allocations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "leave_types"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "leave_request_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "leave_applicable_to_enum"`);
  }
}
