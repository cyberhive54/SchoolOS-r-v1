import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 004 — Academics Assignment Tables
 *
 * Creates:
 *   class_section_subjects    — which subjects are taught in each class-section
 *   class_teacher_assignments — class teacher per class-section per year
 *   teacher_subject_assignments — which user/staff teaches which subject in which class-section
 *
 * NOTE: teacher_subject_assignments and class_teacher_assignments reference users.id (not staff.id).
 * When the HR module (staff table) is merged, run a follow-up migration to add staff_id FK
 * and populate it from users. The current user_id reference is intentional and valid for Phase 2.1.
 */
export class AcademicsAssignments1720000000004 implements MigrationInterface {
  name = 'AcademicsAssignments1720000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── class_section_subjects ────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "class_section_subjects" (
        "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
        "school_id"        UUID        NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "class_section_id" UUID        NOT NULL REFERENCES "class_sections" ("id") ON DELETE CASCADE,
        "subject_id"       UUID        NOT NULL REFERENCES "subjects" ("id") ON DELETE CASCADE,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_class_section_subjects" PRIMARY KEY ("id"),
        CONSTRAINT "uq_class_section_subjects" UNIQUE ("class_section_id", "subject_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_css_school_cs"
        ON "class_section_subjects" ("school_id", "class_section_id");
      COMMENT ON TABLE "class_section_subjects" IS 'Subjects assigned to each class-section for a given academic year.';
    `);

    // ── class_teacher_assignments ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "class_teacher_assignments" (
        "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
        "school_id"        UUID        NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "class_section_id" UUID        NOT NULL REFERENCES "class_sections" ("id") ON DELETE CASCADE,
        "user_id"          UUID        NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
        "assigned_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_class_teacher_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "uq_class_teacher_assignment" UNIQUE ("school_id", "class_section_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_cta_school_cs"
        ON "class_teacher_assignments" ("school_id", "class_section_id");
      CREATE INDEX "idx_cta_school_user"
        ON "class_teacher_assignments" ("school_id", "user_id");
      COMMENT ON TABLE "class_teacher_assignments" IS
        'One class teacher per class-section. References users.id; when HR module is live, '
        'also populate staff_id via follow-up migration.';
    `);

    // ── teacher_subject_assignments ───────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "teacher_subject_assignments" (
        "id"                     UUID        NOT NULL DEFAULT gen_random_uuid(),
        "school_id"              UUID        NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "class_section_id"       UUID        NOT NULL REFERENCES "class_sections" ("id") ON DELETE CASCADE,
        "subject_id"             UUID        NOT NULL REFERENCES "subjects" ("id") ON DELETE CASCADE,
        "user_id"                UUID        NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
        "class_section_subject_id" UUID      NULL REFERENCES "class_section_subjects" ("id") ON DELETE SET NULL,
        "created_at"             TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"             TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_teacher_subject_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "uq_teacher_subject_assignment" UNIQUE ("school_id", "class_section_id", "subject_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_tsa_school_cs"
        ON "teacher_subject_assignments" ("school_id", "class_section_id");
      CREATE INDEX "idx_tsa_school_user"
        ON "teacher_subject_assignments" ("school_id", "user_id");
      COMMENT ON TABLE "teacher_subject_assignments" IS
        'Which user teaches which subject in each class-section. One teacher per subject per class-section. '
        'References users.id; add staff_id FK when HR module is available.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "teacher_subject_assignments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "class_teacher_assignments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "class_section_subjects" CASCADE`);
  }
}
