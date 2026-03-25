# Phase 7 — System Administration (Module 29)

## What & Why
System Administration is the school's own back-office control panel — used by the school's `super_admin` to manage everything about the SchoolOS installation for their school. This is different from Platform Management (Module 30) which is SchoolOS-operator-level. School-level System Administration covers user management, custom roles, school branding, module configuration, integration settings, audit logs, and data exports. It is the central nervous system that defines who can access what, which features are active, and how the school presents itself digitally.

## Done looks like
- `super_admin` can invite staff, assign/revoke roles, and deactivate/reactivate accounts.
- Custom roles can be created with granular permission assignments from the master platform list.
- School profile including name, address, logo, and branding colors can be updated.
- Academic years can be created, activated, and closed (controlling the "current" context for all modules).
- School-specific module features can be toggled based on the school's subscription.
- Third-party integrations (SMS, Email, Razorpay) can be configured with encrypted credentials.
- School-scoped audit logs can be searched and viewed (immutable record of all actions).
- Full data exports (JSON/CSV) can be triggered for school-level backups.

## Out of scope
- Creating new schools (handled by Platform Management).
- Global subscription plan definitions (handled by Platform Management).
- Direct database access or server-level configuration.
- Cross-school data access or reporting.

## Tasks

1. **DB migration — system administration core** — Create migration `044-system-administration.ts` using `queryRunner.query()` raw SQL:
   - `custom_roles`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL REFERENCES schools(id), role_name VARCHAR(100) NOT NULL, role_display_name VARCHAR(200) NOT NULL, description TEXT NULL, is_system_role BOOLEAN NOT NULL DEFAULT false, is_active BOOLEAN NOT NULL DEFAULT true, created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Unique: `(school_id, role_name)`. Index: `(school_id, is_active)`.
   - `role_permission_assignments`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL REFERENCES schools(id), role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE, permission_key VARCHAR(200) NOT NULL, granted_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Unique: `(school_id, role_id, permission_key)`. Index: `(school_id, role_id)`.
   - `user_role_assignments`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL REFERENCES schools(id), user_id UUID NOT NULL REFERENCES users(id), role_id UUID NOT NULL REFERENCES custom_roles(id), assigned_by UUID NOT NULL REFERENCES users(id), is_active BOOLEAN NOT NULL DEFAULT true, assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(), revoked_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Unique: `(school_id, user_id, role_id)`. Index: `(school_id, user_id)`, `(school_id, role_id)`.
   - `school_module_configs`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL REFERENCES schools(id), module_key VARCHAR(100) NOT NULL, is_enabled BOOLEAN NOT NULL DEFAULT true, config_overrides JSONB NULL DEFAULT '{}', enabled_by UUID NULL REFERENCES users(id), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Unique: `(school_id, module_key)`. Index: `(school_id, is_enabled)`.
   - `school_integration_configs`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL REFERENCES schools(id), integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('sms','whatsapp','email','payment_gateway','storage','push')), provider_name VARCHAR(100) NOT NULL, config_encrypted JSONB NOT NULL DEFAULT '{}', is_active BOOLEAN NOT NULL DEFAULT false, last_tested_at TIMESTAMPTZ NULL, test_status VARCHAR(20) NULL CHECK (test_status IN ('success','failure','pending')), test_error TEXT NULL, created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Unique: `(school_id, integration_type)`. Index: `(school_id, integration_type)`.
   - `data_export_jobs`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL REFERENCES schools(id), export_type VARCHAR(50) NOT NULL CHECK (export_type IN ('full_backup','students','fees','hr','academic','custom')), requested_by UUID NOT NULL REFERENCES users(id), status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')), file_url TEXT NULL, file_size_kb INT NULL, error_message TEXT NULL, expires_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Index: `(school_id, status, created_at)`.
   - All composite indexes MUST start with `school_id`.

2. **User Management Endpoints**:
   - `GET /v1/admin/users`: List school users. Filters: `role_id`, `is_active`, `department_id`. Paginated. Permission: `admin.user.view`.
   - `POST /v1/admin/users/invite`: Invite user. Body: `{ email, full_name, role_ids[], phone? }`. Emits `admin.user_invited`. Permission: `admin.user.manage`. Audit logged.
   - `PATCH /v1/admin/users/:userId`: Update profile/roles. Permission: `admin.user.manage`. Audit logged.
   - `POST /v1/admin/users/:userId/deactivate`: Soft deactivate, kill sessions. Emits `admin.user_deactivated`. Permission: `admin.user.manage`.
   - `POST /v1/admin/users/:userId/reactivate`: Reactivate account. Permission: `admin.user.manage`.
   - `POST /v1/admin/users/:userId/reset-password`: Trigger password reset email. Permission: `admin.user.manage`.

3. **Role & Permission Endpoints**:
   - `POST /v1/admin/roles`: Create custom role. Body: `{ role_name, role_display_name, description }`. Permission: `admin.role.manage`.
   - `GET /v1/admin/roles`: List all roles (incl system roles) with `user_count`. Permission: `admin.role.view`.
   - `PUT /v1/admin/roles/:roleId/permissions`: Replace permissions. Body: `{ permission_keys: string[] }`. Permission: `admin.role.manage`. Audit logged.
   - `POST /v1/admin/users/:userId/roles`: Assign role. Body: `{ role_id }`. Permission: `admin.role.manage`.
   - `DELETE /v1/admin/users/:userId/roles/:roleId`: Revoke role. Permission: `admin.role.manage`.

4. **School & Academic Year Endpoints**:
   - `GET /v1/admin/school-profile`: Get school details, branding, board affiliation. Permission: `admin.school.view`.
   - `PATCH /v1/admin/school-profile`: Update school metadata (name, address, colors, logo). Permission: `admin.school.manage`. Audit logged.
   - `GET /v1/admin/academic-years`: List all years with status (active/closed/upcoming). Permission: `admin.school.view`.
   - `POST /v1/admin/academic-years`: Create year. Body: `{ name, start_date, end_date }`. Permission: `admin.school.manage`.
   - `POST /v1/admin/academic-years/:id/activate`: Set as current year, deactivate others. Emits `admin.academic_year_activated`. Permission: `admin.school.manage`.
   - `POST /v1/admin/academic-years/:id/close`: Mark closed (read-only mode). Permission: `admin.school.manage`.

5. **Configuration & Integration Endpoints**:
   - `GET /v1/admin/modules`: List modules with enabled status. Permission: `admin.module.view`.
   - `PATCH /v1/admin/modules/:moduleKey/toggle`: Enable/disable module. Body: `{ is_enabled }`. Emits `admin.module_toggled`. Permission: `admin.module.manage`.
   - `PUT /v1/admin/integrations/:integrationType`: Upsert integration config. Credentials MUST be encrypted. Permission: `admin.integration.manage`.
   - `POST /v1/admin/integrations/:integrationType/test`: Trigger test action (e.g., send test SMS). Updates `test_status`. Permission: `admin.integration.manage`.

6. **Audit & Export Endpoints**:
   - `GET /v1/admin/audit-logs`: Paginated search for school-scoped events. Filters: `user_id`, `module`, `action`. Permission: `admin.audit.view`.
   - `POST /v1/admin/data-export`: Create BullMQ job `data-export`. Body: `{ export_type, modules?[] }`. Permission: `admin.export.manage`.
   - `GET /v1/admin/data-export`: List jobs with download links. Links expire in 48h. Permission: `admin.export.manage`.

7. **System Administration NestJS Module**:
   - Create `SystemAdministrationModule` in `backend/src/modules/system-administration/`.
   - Entities: `CustomRoleEntity`, `RolePermissionAssignmentEntity`, `UserRoleAssignmentEntity`, `SchoolModuleConfigEntity`, `SchoolIntegrationConfigEntity`, `DataExportJobEntity`.
   - Services: `RolesService` (resolves permissions for AuthGuard), `ModuleConfigService` (feature-flagging), `ExportService`.
   - Worker: `DataExportProcessor` (BullMQ).
   - Register in `AppModule`.

8. **Permissions Registration**:
   - Register in `backend/src/config/permissions.ts`: `admin.user.view`, `admin.user.manage`, `admin.role.view`, `admin.role.manage`, `admin.school.view`, `admin.school.manage`, `admin.module.view`, `admin.module.manage`, `admin.integration.view`, `admin.integration.manage`, `admin.audit.view`, `admin.export.manage`.
   - Defaults: `super_admin` (All), `admin` (Viewers + User/Role Manage), `principal` (View only).

9. **Frontend — Settings Hub**:
   - Route: `/dashboard/settings`. Layout: Sidebar navigation for sub-pages.
   - **School Profile**: Form with logo upload, color pickers (primary/secondary), board affiliation dropdown.
   - **Users & Roles**: Searchable user table + Role permission matrix (module-grouped checkboxes).
   - **Academic Years**: Status-aware list with "Activate" confirmation modals.
   - **Modules**: Grid of cards with toggle switches.
   - **Integrations**: Card grid with "Configure" (modal form) and "Test" buttons.
   - **Audit Logs**: Table with date filters and "View Detail" drawer (JSON diff).
   - **Data Export**: Progress-tracking list with "Generate" button.

10. **Seed Data**:
    - System roles (is_system_role: true): `super_admin`, `admin`, `principal`, `teacher`, `accountant`, `librarian`, `transport_coordinator`, `hostel_warden`, `receptionist`, `parent`.
    - Default `school_module_config` (all enabled) for the demo school.
    - Sample `school_integration_config` for SMS (inactive).

## Relevant files
- `backend/src/modules/system-administration/system-administration.module.ts`
- `backend/src/modules/system-administration/entities/*.entity.ts`
- `backend/src/database/migrations/044-system-administration.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/settings/page.tsx`
- `frontend/src/app/(dashboard)/settings/layout.tsx`
- `frontend/src/app/(dashboard)/settings/users/page.tsx`
- `frontend/src/app/(dashboard)/settings/roles/page.tsx`
- `frontend/src/app/(dashboard)/settings/school/page.tsx`
- `frontend/src/app/(dashboard)/settings/academic-years/page.tsx`
- `frontend/src/app/(dashboard)/settings/modules/page.tsx`
- `frontend/src/app/(dashboard)/settings/integrations/page.tsx`
- `frontend/src/app/(dashboard)/settings/audit-logs/page.tsx`
- `frontend/src/app/(dashboard)/settings/export/page.tsx`
