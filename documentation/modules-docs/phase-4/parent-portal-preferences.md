# Phase 4 — Parent Portal & Preferences (Module 13)

## What & Why
The Parent Portal is the unified glass pane for parents to engage with their child's school journey in SchoolOS. In Indian K-12 schools, parents are the primary stakeholders for financial (fees), academic (results, attendance), and administrative (leave, transport) matters. This module provides the configuration layer for what parents see, how they interact with their child's data, and their specific communication preferences. It ensures a personalized, secure, and multi-child experience where a single parent login can manage all their children across different classes or even different branches of the same school group.

## Done looks like
- Single parent login can switch between multiple children (siblings) within the same school/tenant.
- Schools can configure "Parent Dashboard Widgets" — toggling visibility for Fees, Attendance, Exams, Homework, LMS, and Transport.
- Parents can set granular notification preferences (SMS, WhatsApp, Email, Push) for different event types.
- A "Student Profile" view accessible to parents to update non-academic details (address, emergency contact, health info) with admin approval workflow.
- "Quiet Hours" support for notifications to ensure parents aren't disturbed at night.
- Secure document vault where parents can download child's certificates, report cards, and fee receipts.
- "Action Center" on the dashboard highlighting pending fee payments, upcoming exams, or unsigned circulars.
- Mobile-first responsive design for all parent-facing pages.
- Multi-child dashboard overview showing a summary of all children in one view.
- Language preference support (English, Hindi, and local regional languages).

## Out of scope
- The actual Student/Parent login (handled by Auth module).
- The actual sending of notifications (handled by Notification Engine).
- Native Android/iOS app development (this module defines the web portal and API).
- Payment gateway integration (handled by Fees module).
- Direct chat with teachers (handled by Communication module - Direct Messaging).

## Tasks

1. **DB migration — Parent Portal Configuration** — Create migration `037-parent-portal-preferences.ts` with:
   - `parent_portal_configs`: `(id UUID PK, school_id UUID NOT NULL, enabled_modules TEXT[] DEFAULT '{"attendance", "fees", "exams", "homework"}', allow_profile_updates BOOLEAN DEFAULT true, require_approval_for_profile_updates BOOLEAN DEFAULT true, dashboard_layout_type ENUM('grid', 'list', 'compact') DEFAULT 'grid', primary_color VARCHAR(7) NULL, welcome_message TEXT NULL, emergency_contact_number VARCHAR(15) NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique index: `(school_id)`.
   - `parent_child_dashboard_settings`: `(id UUID PK, school_id UUID NOT NULL, parent_user_id UUID NOT NULL FK users, student_id UUID NOT NULL FK students, favorite_widgets TEXT[] DEFAULT '{}', dashboard_order JSONB NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique index: `(school_id, parent_user_id, student_id)`.
   - `parent_profile_update_requests`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, parent_user_id UUID NOT NULL FK users, requested_changes JSONB NOT NULL, status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending', reviewed_by UUID NULL FK users, review_note TEXT NULL, reviewed_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, status)`.
   - All composite indexes MUST start with `school_id`.

2. **Parent Portal Config Endpoints** — School-level configuration:
   - `GET /v1/parent-portal/config` — Get current school's parent portal settings. Permission: `parent_portal.settings.view`.
   - `PATCH /v1/parent-portal/config` — Update portal settings. Body: `{ enabled_modules, allow_profile_updates, require_approval_for_profile_updates, dashboard_layout_type, primary_color, welcome_message, emergency_contact_number }`. Permission: `parent_portal.settings.manage`. Audit logged.

3. **Parent Dashboard Endpoints** — Personalized views:
   - `GET /v1/parent-portal/dashboard/summary` — Returns an overview for all children linked to the parent. Data: `{ children: [{ student_id, name, class_section, photo_url, attendance_today, pending_fees_count, upcoming_exams_count, new_notices_count }] }`. Permission: any authenticated parent.
   - `GET /v1/parent-portal/students/:studentId/dashboard` — Get detailed dashboard data for a specific child. Combines data from Multiple modules (Fees, Attendance, etc.). Redis cache: `{school_id}:parent_dashboard:{student_id}`, TTL 5 min. Permission: `parent_portal.student.view` (PBAC: must be linked guardian).
   - `PATCH /v1/parent-portal/students/:studentId/settings` — Update per-child dashboard settings (widgets/order). Body: `{ favorite_widgets, dashboard_order }`. Permission: any authenticated parent.

4. **Profile Update Request Endpoints**:
   - `POST /v1/parent-portal/students/:studentId/profile-update` — Submit a request to update child info. Body: `{ requested_changes: { address, phone, blood_group, etc. } }`. Permission: any authenticated parent. Emits `parent_portal.profile_update_requested`.
   - `GET /v1/parent-portal/profile-requests` — Admin view to list requests. Filters: `status`, `student_id`. Permission: `parent_portal.requests.manage`.
   - `POST /v1/parent-portal/profile-requests/:id/review` — Approve/Reject request. Body: `{ status, review_note }`. If approved, updates `student_profiles` table. Permission: `parent_portal.requests.manage`. Audit logged.

5. **NestJS Module Wiring**:
   - Create `ParentPortalModule` in `backend/src/modules/parent-portal/`.
   - Entities: `ParentPortalConfigEntity`, `ParentChildDashboardSettingEntity`, `ParentProfileUpdateRequestEntity`.
   - Import: `StudentsModule`, `AcademicsModule`, `UsersModule`.
   - Register in `AppModule`.

6. **Permissions**:
   - `parent_portal.settings.view`, `parent_portal.settings.manage` (Admin only)
   - `parent_portal.requests.manage` (Admin/Principal only)
   - `parent_portal.student.view` (Parent only - PBAC checked)
   - `parent_portal.student.update` (Parent only - PBAC checked)
   - Default: `super_admin`, `admin` — all. `parent` — `parent_portal.student.view`, `parent_portal.student.update`.

7. **Frontend — Parent Dashboard** (`/dashboard/parent`):
   - **Multi-child Switcher**: A sticky tab or dropdown to switch active student context.
   - **Summary Cards**: Quick stats for active student — Attendance %, Due Fees, Upcoming Exams, Homework status.
   - **Notice Board Widget**: Latest 3 school notices relevant to the child's class.
   - **Action Center**: High-priority alerts (e.g., "Fee payment overdue by 5 days", "Sign digital consent for field trip").
   - **Widget Grid**: Responsive cards for each enabled module (Fees, Attendance, etc.).
   - Loading state: shimmer cards. Empty state: "No children linked to your account."

8. **Frontend — Child Profile & Settings** (`/dashboard/parent/students/:id`):
   - **Profile Tab**: Display-only view of student data with "Request Edit" button that opens a form.
   - **Settings Tab**: Toggles for notification channels (link to Notification Engine preferences) and dashboard widget customization.
   - **Document Vault**: List of downloadable files — Report Cards, Fee Receipts, Certificates.

9. **Frontend — Profile Update Requests (Admin)** (`/dashboard/admin/parent-portal/requests`):
   - Table showing pending requests: Student, Parent, Changes (diff view), Date.
   - Action: "Approve" / "Reject" buttons with reason modal.

10. **Seed Data**:
    - Default `parent_portal_configs` for the demo school.
    - Sample `parent_child_dashboard_settings` for one demo parent.
    - One pending `parent_profile_update_requests` for a demo student.

## Relevant files
- `backend/src/modules/parent-portal/`
- `backend/src/modules/parent-portal/entities/parent-portal-config.entity.ts`
- `backend/src/modules/parent-portal/entities/parent-child-dashboard-setting.entity.ts`
- `backend/src/modules/parent-portal/entities/parent-profile-update-request.entity.ts`
- `backend/src/database/migrations/037-parent-portal-preferences.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/parent/page.tsx`
- `frontend/src/app/(dashboard)/parent/students/[id]/page.tsx`
- `frontend/src/app/(dashboard)/admin/parent-portal/requests/page.tsx`
- `frontend/src/components/parent/ChildSwitcher.tsx`
- `frontend/src/components/parent/DashboardWidget.tsx`
- `frontend/src/components/parent/ProfileUpdateForm.tsx`
- `frontend/src/hooks/use-parent-portal.ts`
