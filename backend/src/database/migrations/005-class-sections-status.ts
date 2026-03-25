import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 005 — class_sections status field + DB partial index for is_current
 *
 * 1. Adds `status` column to class_sections (active | archived), default 'active'
 * 2. Adds a unique partial index to enforce only one current academic year per school
 *    (i.e. only one row per school_id can have is_current = TRUE in academic_years)
 * 3. Adds index on class_sections(school_id, status) for filtered queries
 */
export class ClassSectionsStatus1720000000005 implements MigrationInterface {
  name = 'ClassSectionsStatus1720000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "class_sections"
        ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'active'
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_class_sections_school_status"
        ON "class_sections" ("school_id", "status")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "udx_academic_years_school_current"
        ON "academic_years" ("school_id")
        WHERE ("is_current" = TRUE)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "udx_academic_years_school_current"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_class_sections_school_status"
    `);
    await queryRunner.query(`
      ALTER TABLE "class_sections" DROP COLUMN IF EXISTS "status"
    `);
  }
}
