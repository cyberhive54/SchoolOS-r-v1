# Phase 7 — Multi-Branch Management (Module 28)

## What & Why
The Multi-Branch Management module is the SaaS infrastructure layer designed for school groups, educational trusts, and franchise networks (e.g., DPS Society, Podar International). In the Indian K-12 context, large organizations often operate multiple campuses across different cities or within the same city. This module provides a "Group Dashboard" that allows trust-level administrators to oversee all branches without needing individual school logins. It enables consolidated reporting on enrollment, fee collection, and staff headcount, facilitates student transfers between branches (TC from one branch to another), and allows for centralized communication via group-level announcements. Individual branches maintain their operational autonomy while the head office gains real-time visibility and control.

## Done looks like
- Platform Admins can create and manage `school_groups` (Trusts).
- Existing schools can be added as members of a group with specific branch metadata (Head Office, Branch, Franchise).
- Group Admins can be assigned with specific roles (Super Admin, Viewer) and scoped access to specific branches.
- A consolidated Group Dashboard shows real-time KPIs (Total Students, Staff, Fees) aggregated from all active branches.
- Cross-branch student transfers are supported with a workflow (Initiated → Approved → TC/Admission Completed).
- Group-level announcements can be published to selected or all branches, notifying branch principals.
- Branch comparison reports allow management to compare performance metrics (enrollment, attendance, fees) across the group.
- All multi-tenant rules are respected: `group_id` or `school_id` is always the first part of composite indexes.

## Out of scope
- Shared inventory or centralized procurement between branches (Module 16 handles per-school inventory).
- Centralized payroll processing (Module 32 handles per-school payroll).
- Shared student/staff identities (each school_id maintains its own user records; transfers create new records in target schools).
- Inter-branch financial lending or internal fund transfers.
- Unified timetable scheduling across different branch campuses.

## Tasks

1. **DB Migration — Multi-Branch Core** — Create migration `043-multi-branch.ts` using `queryRunner.query()` with the following tables:
   - `school_groups`: `(id UUID PK DEFAULT gen_random_uuid(), group_name VARCHAR(300) NOT NULL, group_code VARCHAR(50) NOT NULL UNIQUE, trust_name VARCHAR(300) NULL, registered_address TEXT NULL, contact_email VARCHAR(255) NULL, contact_phone VARCHAR(15) NULL, logo_url TEXT NULL, is_active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Index: `(is_active)`.
   - `school_group_memberships`: `(id UUID PK DEFAULT gen_random_uuid(), group_id UUID NOT NULL REFERENCES school_groups(id), school_id UUID NOT NULL REFERENCES schools(id), branch_name VARCHAR(200) NOT NULL, branch_code VARCHAR(50) NOT NULL, branch_type VARCHAR(50) NOT NULL DEFAULT 'branch' CHECK (branch_type IN ('head_office','branch','franchise','affiliated')), city VARCHAR(200) NULL, state VARCHAR(100) NULL, established_year INT NULL, principal_user_id UUID NULL REFERENCES users(id), is_head_office BOOLEAN NOT NULL DEFAULT false, sequence_order INT NOT NULL DEFAULT 0, joined_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Unique constraints: `(group_id, school_id)`, `(group_id, branch_code)`. Index: `(group_id, is_active)`.
   - `group_admin_assignments`: `(id UUID PK DEFAULT gen_random_uuid(), group_id UUID NOT NULL REFERENCES school_groups(id), user_id UUID NOT NULL REFERENCES users(id), role VARCHAR(50) NOT NULL DEFAULT 'group_admin' CHECK (role IN ('group_super_admin','group_admin','group_viewer')), school_access UUID[] NOT NULL DEFAULT '{}', can_access_all_branches BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Unique: `(group_id, user_id)`. Index: `(group_id, user_id)`.
   - `cross_branch_transfers`: `(id UUID PK DEFAULT gen_random_uuid(), group_id UUID NOT NULL REFERENCES school_groups(id), student_id UUID NOT NULL REFERENCES students(id), from_school_id UUID NOT NULL REFERENCES schools(id), to_school_id UUID NOT NULL REFERENCES schools(id), transfer_type VARCHAR(50) NOT NULL CHECK (transfer_type IN ('tc_and_admission','internal_transfer')), transfer_date DATE NOT NULL, academic_year_id UUID NOT NULL REFERENCES academic_years(id), reason TEXT NULL, from_class VARCHAR(100) NULL, to_class VARCHAR(100) NULL, tc_number VARCHAR(100) NULL, status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','completed','cancelled')), approved_by UUID NULL REFERENCES users(id), approved_at TIMESTAMPTZ NULL, completed_at TIMESTAMPTZ NULL, created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Indexes: `(group_id, status)`, `(group_id, student_id)`, `(group_id, from_school_id)`, `(group_id, to_school_id)`.
   - `group_announcements`: `(id UUID PK DEFAULT gen_random_uuid(), group_id UUID NOT NULL REFERENCES school_groups(id), title VARCHAR(400) NOT NULL, body TEXT NOT NULL, target_school_ids UUID[] NOT NULL DEFAULT '{}', target_all_branches BOOLEAN NOT NULL DEFAULT false, priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')), published_at TIMESTAMPTZ NULL, expires_at TIMESTAMPTZ NULL, created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Index: `(group_id, published_at)`.
   - All foreign keys must have appropriate ON DELETE actions. All composite indexes must start with `group_id`.

2. **Group Management Endpoints**:
   - `POST /v1/groups`: Create a new school group. Body: `{group_name, group_code, trust_name, contact_email, contact_phone}`. Permission: `platform.group.create` (platform_admin only). Audit logged.
   - `GET /v1/groups`: List all groups (for platform_admin) or own group (for group_admin). Paginated. Permission: `platform.group.view`.
   - `GET /v1/groups/:groupId`: Full details of a group including member branches. Permission: `platform.group.view`.
   - `PATCH /v1/groups/:groupId`: Update group details. Permission: `platform.group.manage`.
   - `DELETE /v1/groups/:groupId`: Soft delete group. Fails if active schools are assigned. Permission: `platform.group.manage`.

3. **Branch Management Endpoints**:
   - `POST /v1/groups/:groupId/branches`: Add a school to the group. Body: `{school_id, branch_name, branch_code, branch_type, city, state, is_head_office}`. Validates `school_id` exists and isn't in another group. Permission: `platform.group.manage`. Audit logged.
   - `GET /v1/groups/:groupId/branches`: List all branches with principal name, location, and status. Permission: `group.branch.view`.
   - `PATCH /v1/groups/:groupId/branches/:membershipId`: Update branch metadata (name, type, order). Permission: `group.branch.manage`.
   - `DELETE /v1/groups/:groupId/branches/:membershipId`: Remove school from group. Validates no pending cross-branch transfers. Permission: `platform.group.manage`.

4. **Group Admin & Communication Endpoints**:
   - `POST /v1/groups/:groupId/admins`: Assign group admin. Body: `{user_id, role, can_access_all_branches, school_access[]}`. Permission: `group.branch.manage`. Audit logged.
   - `GET /v1/groups/:groupId/admins`: List assigned admins for the group. Permission: `group.branch.view`.
   - `POST /v1/groups/:groupId/announcements`: Create group-wide announcement. Body: `{title, body, target_school_ids[], target_all_branches, priority, expires_at}`. Emits `group.announcement_published`. Permission: `group.branch.manage`.
   - `GET /v1/groups/:groupId/announcements`: Paginated list of group announcements with filters. Permission: `group.branch.view`.

5. **Cross-Branch Transfer Endpoints**:
   - `POST /v1/groups/:groupId/transfers`: Initiate transfer. Body: `{student_id, from_school_id, to_school_id, transfer_type, transfer_date, academic_year_id, reason, from_class, to_class}`. Validates both schools in group. Emits `group.transfer_initiated`. Permission: `group.transfer.create`.
   - `GET /v1/groups/:groupId/transfers`: List transfers with status and school filters. Permission: `group.transfer.view`.
   - `PATCH /v1/groups/:groupId/transfers/:id/approve`: Set status to `approved`. Emits `group.transfer_approved`. Permission: `group.transfer.manage`.
   - `POST /v1/groups/:groupId/transfers/:id/complete`: Triggers TC from source and Admission at target. Sets status `completed`. Audit logged. Permission: `group.transfer.manage`.

6. **Consolidated Reporting Endpoints**:
   - `GET /v1/groups/:groupId/reports/overview`: Returns `{total_branches, total_enrolled_students, total_staff, total_fees_collected_this_month, total_outstanding_fees, average_attendance_percent}`. Aggregated from member schools. Redis cache 10 min. Permission: `group.report.view`.
   - `GET /v1/groups/:groupId/reports/branch-comparison`: Query param `metric=enrollment|attendance|fees_collection`. Sorted array of branch performance. Permission: `group.report.view`.
   - `GET /v1/groups/:groupId/reports/enrollment-trend`: Multi-year enrollment comparison per branch. Permission: `group.report.view`.

7. **NestJS Module Implementation**:
   - Create `MultiBranchModule` in `backend/src/modules/multi-branch/`.
   - Entities: `SchoolGroupEntity`, `SchoolGroupMembershipEntity`, `GroupAdminAssignmentEntity`, `CrossBranchTransferEntity`, `GroupAnnouncementEntity`.
   - Import: `StudentsModule`, `SchoolsModule`, `FeesModule`, `AttendanceModule`.
   - Export `MultiBranchService` for use in `AuthModule` to resolve group-level permissions.
   - Register in `AppModule`.

8. **Permissions Configuration**:
   - `platform.group.create`, `platform.group.view`, `platform.group.manage`: Platform admin level.
   - `group.branch.view`, `group.branch.manage`: Group management level.
   - `group.transfer.view`, `group.transfer.create`, `group.transfer.manage`: Transfer operations.
   - `group.report.view`: Consolidated analytics.
   - `group.announcement.manage`: Group communication.
   - Default Assignments: `platform_admin` (all platform.*), `group_super_admin` (all group.*), `group_admin` (branch.view, transfer.view/create, report.view, announcement.manage), `group_viewer` (branch.view, report.view).

9. **Frontend — Group Dashboard (`/group/dashboard`)**:
   - Accessible only to group_admin/viewer roles.
   - Multi-branch selector (dropdown) to switch context.
   - KPI Cards: Total Branches, Total Students, Total Staff, Monthly Fee Collection, Avg Attendance %.
   - Branch Performance Table: Name, Principal, Enrolled, 30d Attendance, Fees Collection. Click row to "drill-down" into branch dashboard.
   - Charts: Enrollment distribution by branch, Fee collection trend (group-wide).

10. **Frontend — Branch & Admin Management**:
    - `/group/branches`: List view with "Add Branch" button. Form to select existing school, code, type. Reorder via drag-and-drop.
    - `/group/admins`: Management of group-level users. Table with roles and branch access chips. "Invite Group Admin" modal.
    - `/group/announcements`: Feed of announcements with priority indicators. "Create Announcement" form with branch multi-select.

11. **Frontend — Cross-Branch Transfers (`/group/transfers`)**:
    - Tabbed view: Pending, Approved, Completed, Cancelled.
    - "New Transfer" wizard: Search student → Select target branch → Enter reason/date.
    - Transfer Detail: Timeline of the transfer, approval buttons, and "Finalize Admission" action.

12. **Seed Data**:
    - 1 `school_group`: "Sunrise Education Trust" (code: SET-2025).
    - 1 `school_group_membership`: Assign the demo school as the "Head Office".
    - 1 `group_admin_assignment`: Assign the demo admin user as `group_super_admin` with `can_access_all_branches = true`.

## Relevant files
- `backend/src/modules/multi-branch/multi-branch.module.ts`
- `backend/src/modules/multi-branch/entities/school-group.entity.ts`
- `backend/src/modules/multi-branch/entities/school-group-membership.entity.ts`
- `backend/src/modules/multi-branch/entities/group-admin-assignment.entity.ts`
- `backend/src/modules/multi-branch/entities/cross-branch-transfer.entity.ts`
- `backend/src/modules/multi-branch/entities/group-announcement.entity.ts`
- `backend/src/database/migrations/043-multi-branch.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/group/dashboard/page.tsx`
- `frontend/src/app/(dashboard)/group/branches/page.tsx`
- `frontend/src/app/(dashboard)/group/transfers/page.tsx`
- `frontend/src/app/(dashboard)/group/announcements/page.tsx`
- `frontend/src/app/(dashboard)/group/admins/page.tsx`
- `documentation/modules-docs/phase-7/multi-branch.md`
