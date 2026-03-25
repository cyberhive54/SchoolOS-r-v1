import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 001 — Initial Schema
 *
 * Creates all foundation tables:
 *   schools, users, school_memberships, user_sessions,
 *   otp_requests, audit_logs, role_permissions
 *
 * Rules enforced:
 *   - NO synchronize:true anywhere
 *   - school_id is FIRST column in ALL composite indexes on tenant tables
 *   - All PKs are UUID
 *   - All timestamps use TIMESTAMPTZ (timezone-aware)
 */
export class InitialSchema1710000000001 implements MigrationInterface {
  name = 'InitialSchema1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── schools ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "schools" (
        "id"                UUID          NOT NULL DEFAULT gen_random_uuid(),
        "name"              VARCHAR(255)  NOT NULL,
        "slug"              VARCHAR(100)  NOT NULL,
        "domain"            VARCHAR(255)  NULL,
        "active_modules"    TEXT[]        NOT NULL DEFAULT '{}',
        "subscription_tier" VARCHAR(50)   NOT NULL DEFAULT 'free',
        "theme"             JSONB         NOT NULL DEFAULT '{}',
        "is_active"         BOOLEAN       NOT NULL DEFAULT TRUE,
        "created_at"        TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_schools" PRIMARY KEY ("id"),
        CONSTRAINT "uq_schools_slug" UNIQUE ("slug"),
        CONSTRAINT "uq_schools_domain" UNIQUE ("domain")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_schools_slug"   ON "schools" ("slug");
      CREATE INDEX "idx_schools_domain" ON "schools" ("domain") WHERE "domain" IS NOT NULL;
      CREATE INDEX "idx_schools_active" ON "schools" ("is_active");
    `);

    // ── users ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
        "email"         VARCHAR(255)  NOT NULL,
        "phone"         VARCHAR(20)   NULL,
        "first_name"    VARCHAR(100)  NOT NULL,
        "last_name"     VARCHAR(100)  NOT NULL,
        "password_hash" VARCHAR(255)  NOT NULL,
        "is_active"     BOOLEAN       NOT NULL DEFAULT TRUE,
        "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_users" PRIMARY KEY ("id"),
        CONSTRAINT "uq_users_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_users_email"  ON "users" ("email");
      CREATE INDEX "idx_users_active" ON "users" ("is_active");
    `);

    // ── school_memberships ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "school_memberships" (
        "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
        "school_id"  UUID         NOT NULL,
        "user_id"    UUID         NOT NULL,
        "role"       VARCHAR(50)  NOT NULL,
        "is_active"  BOOLEAN      NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_school_memberships" PRIMARY KEY ("id"),
        CONSTRAINT "fk_memberships_school" FOREIGN KEY ("school_id")
          REFERENCES "schools" ("id") ON DELETE CASCADE,
        CONSTRAINT "fk_memberships_user" FOREIGN KEY ("user_id")
          REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      -- school_id FIRST in all composite indexes (multi-tenancy rule)
      CREATE INDEX "idx_school_memberships_school_user"
        ON "school_memberships" ("school_id", "user_id");
      CREATE INDEX "idx_school_memberships_school_role"
        ON "school_memberships" ("school_id", "role");
    `);

    // ── user_sessions ────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "user_sessions" (
        "id"                 UUID          NOT NULL DEFAULT gen_random_uuid(),
        "school_id"          UUID          NOT NULL,
        "user_id"            UUID          NOT NULL,
        "refresh_token_hash" VARCHAR(255)  NOT NULL,
        "device_info"        TEXT          NULL,
        "ip_address"         INET          NULL,
        "expires_at"         TIMESTAMPTZ   NOT NULL,
        "revoked_at"         TIMESTAMPTZ   NULL,
        "created_at"         TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_sessions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      -- school_id FIRST in all composite indexes (multi-tenancy rule)
      CREATE INDEX "idx_user_sessions_school_user"
        ON "user_sessions" ("school_id", "user_id");
      CREATE INDEX "idx_user_sessions_expires"
        ON "user_sessions" ("expires_at");
    `);

    // ── otp_requests ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "otp_requests" (
        "id"            UUID         NOT NULL DEFAULT gen_random_uuid(),
        "school_id"     UUID         NOT NULL,
        "user_id"       UUID         NOT NULL,
        "channel"       VARCHAR(20)  NOT NULL DEFAULT 'email',
        "otp_hash"      VARCHAR(255) NOT NULL,
        "purpose"       VARCHAR(50)  NOT NULL,
        "expires_at"    TIMESTAMPTZ  NOT NULL,
        "used_at"       TIMESTAMPTZ  NULL,
        "attempt_count" INTEGER      NOT NULL DEFAULT 0,
        "locked_until"  TIMESTAMPTZ  NULL,
        "ip_address"    INET         NULL,
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "pk_otp_requests" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      -- school_id FIRST in all composite indexes (multi-tenancy rule)
      CREATE INDEX "idx_otp_requests_school_user"
        ON "otp_requests" ("school_id", "user_id");
      CREATE INDEX "idx_otp_requests_expires"
        ON "otp_requests" ("expires_at");
    `);

    // ── audit_logs ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
        "school_id"     UUID          NOT NULL,
        "action"        VARCHAR(50)   NOT NULL,
        "resource_type" VARCHAR(100)  NOT NULL,
        "resource_id"   UUID          NULL,
        "actor_id"      UUID          NULL,
        "old_value"     JSONB         NULL,
        "new_value"     JSONB         NULL,
        "ip_address"    INET          NULL,
        "user_agent"    TEXT          NULL,
        "metadata"      JSONB         NULL,
        "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_audit_logs" PRIMARY KEY ("id")
      )
      WITH (fillfactor = 70)
    `);

    await queryRunner.query(`
      -- school_id FIRST in all composite indexes (multi-tenancy rule)
      CREATE INDEX "idx_audit_logs_school_created"
        ON "audit_logs" ("school_id", "created_at" DESC);
      CREATE INDEX "idx_audit_logs_school_actor"
        ON "audit_logs" ("school_id", "actor_id");
      CREATE INDEX "idx_audit_logs_school_resource"
        ON "audit_logs" ("school_id", "resource_type", "resource_id");

      COMMENT ON TABLE "audit_logs" IS
        'Immutable audit trail. Hot retention: 90 days. Cold archive: 1 year to object storage.';
    `);

    // ── role_permissions ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "id"         UUID          NOT NULL DEFAULT gen_random_uuid(),
        "role"       VARCHAR(50)   NOT NULL,
        "permission" VARCHAR(255)  NOT NULL,
        "created_at" TIMESTAMPTZ   NOT NULL DEFAULT now(),
        CONSTRAINT "pk_role_permissions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_role_permissions_role_permission" UNIQUE ("role", "permission")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_role_permissions_role" ON "role_permissions" ("role");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "otp_requests" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_sessions" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "school_memberships" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "schools" CASCADE`);
  }
}
