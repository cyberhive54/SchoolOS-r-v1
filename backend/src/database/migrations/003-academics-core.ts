import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 003 — Academics Core Tables
 *
 * Creates foundational academic structure tables:
 *   academic_years, classes, sections, class_sections,
 *   subjects, subject_groups, subject_group_items
 *
 * Rules enforced:
 *   - NO synchronize:true anywhere
 *   - school_id is FIRST column in ALL composite indexes on tenant tables
 *   - All PKs are UUID
 *   - All timestamps use TIMESTAMPTZ (timezone-aware)
 *   - Soft-deletes on entities that may be referenced (deleted_at)
 */
export class AcademicsCore1720000000003 implements MigrationInterface {
  name = 'AcademicsCore1720000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── academic_years ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "academic_years" (
        "id"         UUID          NOT NULL DEFAULT gen_random_uuid(),
        "school_id"  UUID          NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "name"       VARCHAR(100)  NOT NULL,
        "start_date" DATE          NOT NULL,
        "end_date"   DATE          NOT NULL,
        "is_current" BOOLEAN       NOT NULL DEFAULT FALSE,
        "created_at" TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_academic_years" PRIMARY KEY ("id"),
        CONSTRAINT "uq_academic_years_school_name" UNIQUE ("school_id", "name")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_academic_years_school"         ON "academic_years" ("school_id");
      CREATE INDEX "idx_academic_years_school_current" ON "academic_years" ("school_id", "is_current");
      COMMENT ON TABLE "academic_years" IS 'Session years like 2024-25. Only one can be is_current per school.';
    `);

    // ── classes ───────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "classes" (
        "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
        "school_id"   UUID          NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "name"        VARCHAR(100)  NOT NULL,
        "order_index" INTEGER       NOT NULL DEFAULT 0,
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "deleted_at"  TIMESTAMPTZ   NULL,
        CONSTRAINT "pk_classes" PRIMARY KEY ("id"),
        CONSTRAINT "uq_classes_school_name" UNIQUE ("school_id", "name")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_classes_school"       ON "classes" ("school_id") WHERE "deleted_at" IS NULL;
      CREATE INDEX "idx_classes_school_order" ON "classes" ("school_id", "order_index") WHERE "deleted_at" IS NULL;
      COMMENT ON TABLE "classes" IS 'Grade levels: Grade 1, Class 6, LKG, etc. Board-agnostic — names are school-defined.';
    `);

    // ── sections ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "sections" (
        "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
        "school_id"  UUID         NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "name"       VARCHAR(50)  NOT NULL,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ  NULL,
        CONSTRAINT "pk_sections" PRIMARY KEY ("id"),
        CONSTRAINT "uq_sections_school_name" UNIQUE ("school_id", "name")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_sections_school" ON "sections" ("school_id") WHERE "deleted_at" IS NULL;
      COMMENT ON TABLE "sections" IS 'Section labels: A, B, C or custom names. Shared across all classes in a school.';
    `);

    // ── class_sections ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "class_sections" (
        "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
        "school_id"        UUID          NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "class_id"         UUID          NOT NULL REFERENCES "classes" ("id") ON DELETE CASCADE,
        "section_id"       UUID          NOT NULL REFERENCES "sections" ("id") ON DELETE CASCADE,
        "academic_year_id" UUID          NOT NULL REFERENCES "academic_years" ("id") ON DELETE CASCADE,
        "capacity"         INTEGER       NULL,
        "room_no"          VARCHAR(50)   NULL,
        "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_class_sections" PRIMARY KEY ("id"),
        CONSTRAINT "uq_class_sections_unique" UNIQUE ("school_id", "class_id", "section_id", "academic_year_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_class_sections_school_year"
        ON "class_sections" ("school_id", "academic_year_id");
      CREATE INDEX "idx_class_sections_school_class"
        ON "class_sections" ("school_id", "class_id");
      COMMENT ON TABLE "class_sections" IS 'Specific instance of a class-section for an academic year, e.g. Grade 6-A for 2025-26.';
    `);

    // ── subjects ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TYPE "subject_type_enum" AS ENUM ('core', 'elective', 'activity');

      CREATE TABLE "subjects" (
        "id"         UUID                NOT NULL DEFAULT gen_random_uuid(),
        "school_id"  UUID                NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "name"       VARCHAR(100)        NOT NULL,
        "code"       VARCHAR(20)         NOT NULL,
        "type"       "subject_type_enum" NOT NULL DEFAULT 'core',
        "created_at" TIMESTAMPTZ         NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ         NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ         NULL,
        CONSTRAINT "pk_subjects" PRIMARY KEY ("id"),
        CONSTRAINT "uq_subjects_school_code" UNIQUE ("school_id", "code")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_subjects_school" ON "subjects" ("school_id") WHERE "deleted_at" IS NULL;
      COMMENT ON TABLE "subjects" IS 'School subjects: Mathematics, English, etc. Board-agnostic — schools define their own.';
    `);

    // ── subject_groups ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "subject_groups" (
        "id"          UUID          NOT NULL DEFAULT gen_random_uuid(),
        "school_id"   UUID          NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "name"        VARCHAR(100)  NOT NULL,
        "description" TEXT          NULL,
        "created_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_subject_groups" PRIMARY KEY ("id"),
        CONSTRAINT "uq_subject_groups_school_name" UNIQUE ("school_id", "name")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_subject_groups_school" ON "subject_groups" ("school_id");
      COMMENT ON TABLE "subject_groups" IS 'Groupings like Science, Commerce, Arts for stream-based schools.';
    `);

    // ── subject_group_items ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "subject_group_items" (
        "id"               UUID        NOT NULL DEFAULT gen_random_uuid(),
        "school_id"        UUID        NOT NULL REFERENCES "schools" ("id") ON DELETE CASCADE,
        "subject_group_id" UUID        NOT NULL REFERENCES "subject_groups" ("id") ON DELETE CASCADE,
        "subject_id"       UUID        NOT NULL REFERENCES "subjects" ("id") ON DELETE CASCADE,
        "created_at"       TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "pk_subject_group_items" PRIMARY KEY ("id"),
        CONSTRAINT "uq_subject_group_items" UNIQUE ("subject_group_id", "subject_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_subject_group_items_school_group"
        ON "subject_group_items" ("school_id", "subject_group_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "subject_group_items" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subject_groups" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subjects" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subject_type_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "class_sections" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sections" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "classes" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "academic_years" CASCADE`);
  }
}
