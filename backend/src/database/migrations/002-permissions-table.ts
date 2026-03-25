import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 002 — Permissions catalog table
 *
 * Adds a `permissions` master table — the canonical registry of all platform
 * permission strings. Each row defines one discrete capability (e.g. "students.students.view").
 *
 * This complements `role_permissions` which maps roles → permission keys.
 * Keeping a separate catalog enables:
 *   - Consistent permission string validation at seed/import time
 *   - Admin UI to browse all available permissions
 *   - Future per-school permission customization
 */
export class PermissionsTable1710000000002 implements MigrationInterface {
  name = 'PermissionsTable1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "permissions" (
        "id"             UUID          NOT NULL DEFAULT gen_random_uuid(),
        "permission_key" VARCHAR(255)  NOT NULL,
        "module"         VARCHAR(100)  NOT NULL,
        "resource"       VARCHAR(100)  NOT NULL,
        "action"         VARCHAR(100)  NOT NULL,
        "description"    TEXT          NULL,
        "created_at"     TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_permissions_key" UNIQUE ("permission_key")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_permissions_module"   ON "permissions" ("module");
      CREATE INDEX "idx_permissions_resource" ON "permissions" ("module", "resource");
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "permissions" IS
        'Master catalog of all platform permissions. Seeded at startup. Do not delete rows.';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "permissions" CASCADE`);
  }
}
