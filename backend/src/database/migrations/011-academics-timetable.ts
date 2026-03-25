import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 011 — Academics: Timetable
 *
 * Creates:
 *   timetable_periods       — school-level period slot definitions (Period 1, Period 2, Lunch, etc.)
 *   timetable_slots         — class-section schedule assignments (which teacher/subject on which day/period)
 *   timetable_substitutions — daily substitution records when a teacher is absent
 */
export class AcademicsTimetable1720000000011 implements MigrationInterface {
  name = 'AcademicsTimetable1720000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── timetable_periods ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "timetable_periods" (
        "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
        "school_id"        UUID         NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "academic_year_id" UUID         NOT NULL REFERENCES "academic_years" ("id") ON DELETE CASCADE,
        "name"             VARCHAR(100) NOT NULL,
        "period_number"    SMALLINT     NOT NULL,
        "start_time"       TIME         NOT NULL,
        "end_time"         TIME         NOT NULL,
        "is_break"         BOOLEAN      NOT NULL DEFAULT false,
        "is_active"        BOOLEAN      NOT NULL DEFAULT true,
        "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_timetable_periods" PRIMARY KEY ("id"),
        CONSTRAINT "uq_timetable_period_num" UNIQUE ("school_id", "academic_year_id", "period_number")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tt_periods_school_year" ON "timetable_periods" ("school_id", "academic_year_id");
      COMMENT ON TABLE "timetable_periods" IS 'School-level period slot configuration per academic year.';
    `);

    // ── timetable_slots ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "timetable_slots" (
        "id"                  UUID        NOT NULL DEFAULT gen_random_uuid(),
        "school_id"           UUID        NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "academic_year_id"    UUID        NOT NULL REFERENCES "academic_years" ("id") ON DELETE CASCADE,
        "class_section_id"    UUID        NOT NULL REFERENCES "class_sections" ("id") ON DELETE CASCADE,
        "timetable_period_id" UUID        NOT NULL REFERENCES "timetable_periods" ("id") ON DELETE CASCADE,
        "day_of_week"         SMALLINT    NOT NULL CHECK ("day_of_week" BETWEEN 1 AND 7),
        "subject_id"          UUID        NULL REFERENCES "subjects" ("id") ON DELETE SET NULL,
        "staff_id"            UUID        NULL REFERENCES "staff" ("id") ON DELETE SET NULL,
        "is_free_period"      BOOLEAN     NOT NULL DEFAULT false,
        "effective_from"      DATE        NULL,
        "effective_to"        DATE        NULL,
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_timetable_slots" PRIMARY KEY ("id"),
        CONSTRAINT "uq_timetable_slot" UNIQUE ("school_id", "class_section_id", "timetable_period_id", "day_of_week")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tt_slots_school_cs"   ON "timetable_slots" ("school_id", "class_section_id");
      CREATE INDEX "idx_tt_slots_school_year" ON "timetable_slots" ("school_id", "academic_year_id");
      CREATE INDEX "idx_tt_slots_staff"       ON "timetable_slots" ("school_id", "staff_id");
      COMMENT ON TABLE "timetable_slots" IS 'Period-by-period schedule. One row = a specific period on a specific day for a class-section. day_of_week: 1=Mon, 7=Sun.';
    `);

    // ── timetable_substitutions ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "timetable_substitutions" (
        "id"                  UUID        NOT NULL DEFAULT gen_random_uuid(),
        "school_id"           UUID        NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "date"                DATE        NOT NULL,
        "slot_id"             UUID        NOT NULL REFERENCES "timetable_slots" ("id") ON DELETE CASCADE,
        "absent_staff_id"     UUID        NOT NULL REFERENCES "staff" ("id") ON DELETE RESTRICT,
        "substitute_staff_id" UUID        NULL REFERENCES "staff" ("id") ON DELETE SET NULL,
        "reason"              TEXT        NULL,
        "note"                TEXT        NULL,
        "created_by"          UUID        NOT NULL REFERENCES "users" ("id") ON DELETE RESTRICT,
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_timetable_substitutions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tt_subs_school_date" ON "timetable_substitutions" ("school_id", "date");
      CREATE INDEX "idx_tt_subs_absent"      ON "timetable_substitutions" ("school_id", "absent_staff_id");
      COMMENT ON TABLE "timetable_substitutions" IS 'Records when a teacher is absent and who substitutes. Per-slot, per-date.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "timetable_substitutions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "timetable_slots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "timetable_periods"`);
  }
}
