# Phase 7 — Platform Management (Module 30)

## What & Why
Platform Management is the top-level SaaS operator console — used exclusively by the SchoolOS team (platform_admin role), NOT by individual school admins. It controls the entire SaaS lifecycle of the platform, enabling multi-tenancy at scale. This module is what makes SchoolOS a commercially viable product by managing the business layer above the individual school level.

Key capabilities include:
1. **Tenant/School Lifecycle**: Onboard new schools, configure their settings, and manage their operational status (active, suspended, churned).
2. **Subscription Management**: Define flexible billing plans (Basic, Standard, Enterprise) with granular module access and usage limits.
3. **Usage Monitoring**: Real-time tracking of platform-wide health, API consumption, storage usage, and active user sessions.
4. **Platform Security**: A centralized audit log for platform-level actions and a secure impersonation system for troubleshooting school-specific issues.
5. **Feature Governance**: Global and targeted feature flags for controlled rollouts and A/B testing across the tenant base.

## Done looks like
- Platform Admins can create and manage subscription plans with specific module entitlements and resource limits.
- A comprehensive school onboarding wizard that automates school creation, super_admin setup, and module provisioning.
- Real-time SaaS dashboard showing MRR, school growth, and platform-wide student/staff metrics.
- Secure "Impersonate" feature allowing platform admins to log into a specific school as a target user for support, with mandatory reason logging and time-limited sessions.
- Usage tracking system that monitors API calls and storage against plan limits, with alerting for overages.
- Platform-wide feature flags supporting global toggles, school-specific overrides, and percentage-based rollouts.
- Centralized audit trail for all platform-level configuration changes and impersonation events.
- System health monitoring (DB, Redis, Queues) exposed via a non-authenticated internal health check.

## Out of scope
- Individual school-level administration (handled by Module 29: System Administration).
- End-user billing/invoice generation (handled by an external billing engine like Stripe/Razorpay Subscriptions; this module tracks the *status* of those subscriptions).
- Direct database management or schema migration execution (handled via CLI/migration scripts).
- Customer support ticketing system (external tool integration).
- Cross-school social networking or student data sharing.

## Tasks

1. **DB Migration — Platform Management Core** — Create migration `045-platform-management.ts` using `queryRunner.query()`. This migration operates globally (no `school_id` required for these tables except where referencing `schools`).
   - `subscription_plans`: `(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), plan_name VARCHAR(100) NOT NULL, plan_code VARCHAR(50) NOT NULL UNIQUE, description TEXT NULL, price_monthly DECIMAL(10,2) NOT NULL, price_annual DECIMAL(10,2) NOT NULL, currency VARCHAR(10) NOT NULL DEFAULT 'INR', max_students INT NULL, max_staff INT NULL, max_branches INT NOT NULL DEFAULT 1, included_modules TEXT[] NOT NULL DEFAULT '{}', storage_gb INT NOT NULL DEFAULT 10, support_tier VARCHAR(50) NOT NULL DEFAULT 'basic' CHECK (support_tier IN ('basic','standard','premium','enterprise')), is_active BOOLEAN NOT NULL DEFAULT true, is_public BOOLEAN NOT NULL DEFAULT true, sort_order INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Index: `(is_active, is_public)`.
   - `school_subscriptions`: `(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL UNIQUE REFERENCES schools(id), plan_id UUID NOT NULL REFERENCES subscription_plans(id), billing_cycle VARCHAR(20) NOT NULL DEFAULT 'annual' CHECK (billing_cycle IN ('monthly','annual','custom')), subscription_start DATE NOT NULL, subscription_end DATE NULL, trial_end DATE NULL, is_trial BOOLEAN NOT NULL DEFAULT false, auto_renew BOOLEAN NOT NULL DEFAULT true, status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('trial','active','past_due','suspended','cancelled')), last_billed_at DATE NULL, next_billing_at DATE NULL, custom_price DECIMAL(10,2) NULL, notes TEXT NULL, created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Index: `(plan_id, status)`, `(subscription_end)`.
   - `platform_schools`: `(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), school_id UUID NOT NULL UNIQUE REFERENCES schools(id), onboarding_status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (onboarding_status IN ('pending','in_progress','completed','suspended','churned')), onboarded_at TIMESTAMPTZ NULL, suspended_at TIMESTAMPTZ NULL, suspension_reason TEXT NULL, account_manager_user_id UUID NULL REFERENCES users(id), support_notes TEXT NULL, data_residency_region VARCHAR(50) NOT NULL DEFAULT 'ap-south-1', db_group VARCHAR(50) NOT NULL DEFAULT 'default', storage_used_gb DECIMAL(10,4) NOT NULL DEFAULT 0, api_calls_this_month INT NOT NULL DEFAULT 0, active_sessions_count INT NOT NULL DEFAULT 0, last_activity_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Index: `(onboarding_status)`, `(account_manager_user_id)`.
   - `platform_audit_logs`: `(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), performed_by UUID NOT NULL REFERENCES users(id), action VARCHAR(200) NOT NULL, target_school_id UUID NULL REFERENCES schools(id), target_user_id UUID NULL REFERENCES users(id), entity_type VARCHAR(100) NOT NULL, entity_id UUID NULL, metadata JSONB NULL DEFAULT '{}', ip_address VARCHAR(45) NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Index: `(performed_by, created_at)`, `(target_school_id, created_at)`, `(action, created_at)`.
   - `platform_impersonation_sessions`: `(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), platform_admin_id UUID NOT NULL REFERENCES users(id), target_school_id UUID NOT NULL REFERENCES schools(id), target_user_id UUID NOT NULL REFERENCES users(id), reason TEXT NOT NULL, session_token VARCHAR(512) NOT NULL UNIQUE, started_at TIMESTAMPTZ NOT NULL DEFAULT now(), ended_at TIMESTAMPTZ NULL, is_active BOOLEAN NOT NULL DEFAULT true)`. Index: `(platform_admin_id, is_active)`, `(target_school_id, started_at)`.
   - `platform_feature_flags`: `(id UUID PRIMARY KEY DEFAULT gen_random_uuid(), flag_key VARCHAR(100) NOT NULL UNIQUE, flag_name VARCHAR(200) NOT NULL, description TEXT NULL, is_enabled_globally BOOLEAN NOT NULL DEFAULT false, enabled_for_school_ids UUID[] NOT NULL DEFAULT '{}', enabled_for_plan_ids UUID[] NOT NULL DEFAULT '{}', rollout_percent INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`.

2. **Subscription Plan Endpoints** — Standard CRUD for SaaS plans:
   - `POST /v1/platform/plans` — Create plan. Permission: `platform.plan.manage`. Audit logged.
   - `GET /v1/platform/plans` — List plans with activity/visibility filters. Permission: `platform.plan.view`.
   - `PATCH /v1/platform/plans/:id` — Update plan details. Permission: `platform.plan.manage`. Audit logged.
   - `DELETE /v1/platform/plans/:id` — Only allowed if no schools are currently assigned to the plan. Permission: `platform.plan.manage`.

3. **Tenant Onboarding & Management Endpoints** — The core of SaaS expansion:
   - `POST /v1/platform/schools` — Onboard new school. Body: `{ school_name, domain, contact_email, plan_id, billing_cycle, trial_days?, account_manager_user_id? }`.
     - Transactional operation: Creates `school`, `super_admin` user, `school_subscription`, and `platform_schools` record.
     - Automatically enables module configs based on `plan_id`.
     - Emits `platform.school_onboarded`. Requires `Idempotency-Key`.
     - Permission: `platform.school.create`. Audit logged.
   - `GET /v1/platform/schools` — Paginated list of all tenants. Filters: `status`, `plan_id`, `onboarding_status`. Permission: `platform.school.view`.
   - `GET /v1/platform/schools/:schoolId` — Detailed view including usage metrics and subscription history. Permission: `platform.school.view`.
   - `PATCH /v1/platform/schools/:schoolId` — Update account manager or support notes. Permission: `platform.school.manage`.

4. **Subscription Lifecycle Endpoints** — Manage the money:
   - `POST /v1/platform/schools/:schoolId/subscription/upgrade` — Upgrade/downgrade plan. Re-syncs module configurations. Emits `platform.subscription_changed`. Permission: `platform.school.manage`. Audit logged.
   - `POST /v1/platform/schools/:schoolId/subscription/extend` — Extend trial or paid subscription end date. Permission: `platform.school.manage`. Audit logged.
   - `POST /v1/platform/schools/:schoolId/suspend` — Suspend school access. Body: `{ reason }`. Disables all active user sessions for the school. Emits `platform.school_suspended`. Permission: `platform.school.manage`. Audit logged.
   - `POST /v1/platform/schools/:schoolId/reactivate` — Restore school access. Permission: `platform.school.manage`. Audit logged.
   - `POST /v1/platform/schools/:schoolId/offboard` — Mark for deletion after retention period. Permission: `platform.school.manage`. Audit logged.

5. **Security & Impersonation Endpoints** — Support tools:
   - `POST /v1/platform/schools/:schoolId/impersonate` — Initiate impersonation. Body: `{ target_user_id, reason }`.
     - Returns a short-lived (15 min) JWT.
     - Logs the session in `platform_impersonation_sessions`.
     - All actions performed with this token are logged in `platform_audit_logs` with a link to the impersonation session.
     - Permission: `platform.school.impersonate`. Audit logged with reason.
   - `POST /v1/platform/impersonation/:sessionId/end` — Immediately revoke an active impersonation session. Permission: `platform.school.impersonate`.

6. **Monitoring & Health Endpoints** — Platform oversight:
   - `GET /v1/platform/dashboard` — Global KPIs: Total Schools (by status), MRR estimate, Active Students, API/Storage trends. Redis cached (15 min). Permission: `platform.dashboard.view`.
   - `GET /v1/platform/usage` — Detailed per-school usage stats. Filters: `over_limit`. Permission: `platform.dashboard.view`.
   - `GET /v1/platform/audit-logs` — Filterable platform-level audit trail. Permission: `platform.audit.view`.
   - `GET /v1/platform/health` — Internal health check for infra (DB, Redis, Queues). No auth required.

7. **Feature Flag Endpoints** — Controlled rollouts:
   - `GET /v1/platform/feature-flags` — List all flags. Permission: `platform.feature.manage`.
   - `PATCH /v1/platform/feature-flags/:flagKey` — Update flag configuration (global toggle, school/plan whitelist, or rollout percent). Permission: `platform.feature.manage`. Audit logged.

8. **Platform Management NestJS Wiring**:
   - Create `PlatformManagementModule` in `backend/src/modules/platform-management/`.
   - Entities: `SubscriptionPlanEntity`, `SchoolSubscriptionEntity`, `PlatformSchoolEntity`, `PlatformAuditLogEntity`, `PlatformImpersonationSessionEntity`, `PlatformFeatureFlagEntity`.
   - Import: `SchoolsModule`, `UsersModule`, `SystemAdministrationModule`.
   - Export: `PlatformFeatureFlagService` (used by a platform-wide feature guard), `SchoolSubscriptionService`.
   - Register in `AppModule`.
   - Note: This module must bypass the standard `TenantMiddleware` as it operates at a global level.

9. **Permissions Registration** — Add to `backend/src/config/permissions.ts`:
   - `platform.plan.view`, `platform.plan.manage`
   - `platform.school.view`, `platform.school.create`, `platform.school.manage`, `platform.school.impersonate`
   - `platform.dashboard.view`, `platform.audit.view`, `platform.feature.manage`
   - Default assignments: `platform_admin` (global role) — ALL platform permissions. No other roles (super_admin, teacher, etc.) should have any of these.

10. **Frontend — Platform Dashboard** (`/platform/dashboard`):
    - SaaS KPI Cards: Total MRR, Active Tenants, Total Students across platform, New Schools this month.
    - Charts: Enrollment growth (line), Schools by plan (donut).
    - Status Badges: Redis/DB/Queue health.
    - Recent Platform Activity feed.

11. **Frontend — School Management** (`/platform/schools`):
    - List view with pagination, search, and status filters.
    - Onboarding Wizard: Multi-step form for creating a new school, setting up the super_admin, and selecting a plan.
    - School Detail Page: 
      - Subscription card (Plan info, expiry, upgrade button).
      - Usage meters (API calls, storage).
      - Account notes (internal-only).
      - "Impersonate" button: Opens a modal to select a user and provide a reason.

12. **Frontend — Plans & Features** (`/platform/plans`, `/platform/feature-flags`):
    - Plan Editor: Drag-and-drop module selection, pricing configuration, and limit settings.
    - Feature Flag Control: Toggle switches for global state, multi-select for schools/plans, and a slider for percentage rollouts.

13. **Seed Data — Platform Initial State**:
    - 3 Subscription Plans: 
      - `basic` (₹5,000, 300 students, core modules).
      - `standard` (₹12,000, 1000 students, academics + HR + fees).
      - `enterprise` (₹25,000, unlimited, all modules, multi-branch).
    - 1 `school_subscription` for the demo school (Standard plan, active).
    - 3 Feature Flags: `online_fee_payment` (global: false), `live_classes` (Standard+Enterprise), `udise_export_v2` (10% rollout).

## Relevant files
- `backend/src/modules/platform-management/`
- `backend/src/modules/platform-management/entities/*.entity.ts`
- `backend/src/database/migrations/045-platform-management.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(platform)/dashboard/page.tsx`
- `frontend/src/app/(platform)/schools/page.tsx`
- `frontend/src/app/(platform)/plans/page.tsx`
- `frontend/src/components/platform/ImpersonationBanner.tsx`
- `frontend/src/hooks/use-platform-stats.ts`
- `documentation/platform-architecture-rules.md`
