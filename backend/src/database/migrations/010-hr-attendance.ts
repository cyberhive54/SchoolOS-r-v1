import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 010 — HR: Staff Attendance
 *
 * Creates:
 *   staff_attendance
 */
export class HrAttendance1720000000010 implements MigrationInterface {
  name = 'HrAttendance1720000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "staff_attendance_status_enum" AS ENUM ('present', 'absent', 'half_day', 'on_leave', 'holiday');
    `);

    await queryRunner.query(`
      CREATE TABLE "staff_attendance" (
        "id"               UUID                          NOT NULL DEFAULT gen_random_uuid(),
        "school_id"        UUID                          NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "staff_id"         UUID                          NOT NULL REFERENCES "staff" ("id") ON DELETE CASCADE,
        "date"             DATE                          NOT NULL,
        "status"           staff_attendance_status_enum  NOT NULL DEFAULT 'present',
        "leave_request_id" UUID                          NULL REFERENCES "leave_requests" ("id") ON DELETE SET NULL,
        "note"             TEXT                          NULL,
        "marked_by"        UUID                          NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
        "created_at"       TIMESTAMPTZ                   NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ                   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_staff_attendance" PRIMARY KEY ("id"),
        CONSTRAINT "uq_staff_attendance_per_day" UNIQUE ("school_id", "staff_id", "date")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_staff_att_school"       ON "staff_attendance" ("school_id");
      CREATE INDEX "idx_staff_att_school_date"  ON "staff_attendance" ("school_id", "date");
      CREATE INDEX "idx_staff_att_school_staff" ON "staff_attendance" ("school_id", "staff_id");
      COMMENT ON TABLE "staff_attendance" IS 'Daily staff attendance. Unique per school+staff+date (upsert-safe).';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_attendance"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "staff_attendance_status_enum"`);
  }
}
