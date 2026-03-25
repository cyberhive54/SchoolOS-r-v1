# Phase 2 — Human Resources Module

## What & Why
Build the HR (Human Resources) module — the staff management system for SchoolOS. Defines staff identity, departments, designations, leave policies, and daily staff attendance. This is a Layer 2 Core Domain module. Academics module requires staff for teacher assignments. All staff members are linked to the users/school_memberships system for login. Board-agnostic.

## Done looks like
- Admins can create and manage the staff directory with full profiles (department, designation, join date, qualification, salary grade, documents)
- Departments and designations are fully configurable per school
- Leave types (Casual Leave, Sick Leave, Earned Leave, etc.) are configurable with annual allocation per designation or per staff
- Staff can apply for leave; admins/principals can approve or reject with a reason
- Daily staff attendance can be marked (Present, Absent, Half-Day, On Leave) per day per staff
- All pages use skeleton loaders during fetch; list views have filter/search; mutations give toast feedback
- Empty states with prompts on all list views
- Full frontend under `/dashboard/hr/` route group

## Out of scope
- Payroll calculation (Phase 2.2)
- Biometric attendance integration
- Appraisal / performance review
- Recruitment / job posting

## Tasks

1. **DB migration — HR structure tables** — Create migration `007-hr-structure.ts` with:
   - `departments`: `(id, school_id, name, description, head_staff_id [nullable self-ref to staff], is_active, created_at, updated_at)`. Index `(school_id, name)` unique where active.
   - `designations`: `(id, school_id, name, department_id [FK departments nullable], level [INT nullable — for hierarchy], is_teaching_staff BOOLEAN DEFAULT false, is_active, created_at, updated_at)`. Index `(school_id, name)`.
   - `staff`: `(id, school_id, user_id [FK users — for login access], employee_id [unique per school], first_name, last_name, date_of_birth, gender, blood_group, phone, alternate_phone, personal_email, department_id [FK departments nullable], designation_id [FK designations nullable], join_date, employment_type ['permanent'|'contractual'|'part_time'|'probation'], status ['active'|'inactive'|'resigned'|'terminated'], salary_grade [nullable text], created_at, updated_at, deleted_at)`. Unique index `(school_id, employee_id)`. Unique index `(school_id, user_id)`.
   - `staff_profiles`: `(id, staff_id, school_id, address_line1, address_line2, city, state, pincode, emergency_contact_name, emergency_contact_phone, qualification [text], experience_years [int], aadhaar_no [nullable], pan_no [nullable], bank_account_no [nullable], bank_ifsc [nullable], bank_name [nullable], created_at, updated_at)`. One-to-one with staff.

2. **DB migration — leave management** — Create migration `008-hr-leave.ts` with:
   - `leave_types`: `(id, school_id, name, code [e.g. CL/SL/EL], max_days_per_year [int], is_paid BOOLEAN, carry_forward BOOLEAN, applicable_to ['all'|'teaching'|'non_teaching'], is_active, created_at, updated_at)`. Index `(school_id, code)` unique.
   - `leave_allocations`: `(id, school_id, staff_id, leave_type_id, academic_year_id [FK academic_years], allocated_days, used_days DEFAULT 0, remaining_days GENERATED, created_at, updated_at)`. Unique on `(staff_id, leave_type_id, academic_year_id)`.
   - `leave_requests`: `(id, school_id, staff_id, leave_type_id, start_date, end_date, total_days [computed], reason, status ['pending'|'approved'|'rejected'|'cancelled'], reviewed_by [FK users nullable], reviewed_at [nullable], review_note [nullable], created_at, updated_at)`. Index `(school_id, staff_id, status)`.

3. **DB migration — staff attendance** — Create migration `009-hr-attendance.ts` with:
   - `staff_attendance`: `(id, school_id, staff_id, date [DATE], status ['present'|'absent'|'half_day'|'on_leave'|'holiday'], leave_request_id [nullable FK], note [nullable], marked_by [FK users], created_at, updated_at)`. Unique on `(school_id, staff_id, date)`. Index `(school_id, date)`.

4. **Departments & Designations endpoints** —
   - `POST /v1/hr/departments`, `GET /v1/hr/departments`, `PATCH /v1/hr/departments/:id`, `DELETE /v1/hr/departments/:id`
   - `POST /v1/hr/designations`, `GET /v1/hr/designations`, `PATCH /v1/hr/designations/:id`, `DELETE /v1/hr/designations/:id`
   Each as full endpoint folder with route.md, controller, service, DTOs, permissions.ts, tests, examples. Permission: `hr.settings.manage`.

5. **Staff CRUD endpoints** —
   - `POST /v1/hr/staff` — creates staff record AND a linked user account with school_membership (role configurable, default: `teacher`). Sends welcome email with temp password. Emits `staff.created`. Audit logged.
   - `GET /v1/hr/staff` — paginated list; filters: `q` (name/employee_id search), `filter[department_id]`, `filter[designation_id]`, `filter[status]`, `filter[employment_type]`; sort by name, join_date; default sort `last_name ASC`.
   - `GET /v1/hr/staff/:id` — full record with department, designation, leave summary
   - `PATCH /v1/hr/staff/:id` — partial update; emits `staff.updated`
   - `DELETE /v1/hr/staff/:id` — soft delete; sets `status = inactive` and deactivates user login. Emits `staff.deactivated`.
   Permission: `hr.staff.view`, `hr.staff.create`, `hr.staff.update`, `hr.staff.delete`.

6. **Staff profile endpoint** — `PUT /v1/hr/staff/:id/profile` (upsert extended profile). `GET /v1/hr/staff/:id/profile`. Permission: `hr.staff.update`.

7. **Leave types endpoints** — `POST /v1/hr/leave-types`, `GET /v1/hr/leave-types`, `PATCH /v1/hr/leave-types/:id`, `DELETE /v1/hr/leave-types/:id`. Permission: `hr.leave.manage_types`.

8. **Leave allocations endpoints** — `POST /v1/hr/leave-allocations/bulk` (bulk-allocate all leave types to all active staff for an academic year; async BullMQ job; 202 response with job_id), `GET /v1/hr/staff/:id/leave-allocations` (list allocations per staff per year), `PATCH /v1/hr/leave-allocations/:id` (manually adjust allocated days). Permission: `hr.leave.manage_allocations`.

9. **Leave request endpoints** —
   - `POST /v1/hr/leave-requests` — staff submits leave request; validates leave balance; emits `leave_request.submitted` (notifies admin/principal)
   - `GET /v1/hr/leave-requests` — list with filters: `filter[staff_id]`, `filter[status]`, `filter[leave_type_id]`, date range; paginated
   - `GET /v1/hr/leave-requests/:id`
   - `POST /v1/hr/leave-requests/:id/approve` — sets status approved, deducts leave balance, emits `leave_request.approved`
   - `POST /v1/hr/leave-requests/:id/reject` — body: `{ reason }`, emits `leave_request.rejected`
   - `POST /v1/hr/leave-requests/:id/cancel` — staff or admin cancels; restores balance if was approved
   Permission: `hr.leave.view`, `hr.leave.request`, `hr.leave.approve`.
   PBAC: `hr.leave.view` — admin sees all; staff sees only own unless they have `hr.leave.view_all`.

10. **Staff attendance endpoints** —
    - `POST /v1/hr/attendance/bulk-mark` — mark attendance for multiple staff for a given date; body: `{ date, records: [{ staff_id, status, note? }] }`; idempotent per day (upsert). Emits `staff_attendance.marked`.
    - `GET /v1/hr/attendance` — list; filters: `filter[date]`, `filter[date][gte]`, `filter[date][lte]`, `filter[staff_id]`, `filter[status]`; paginated.
    - `GET /v1/hr/attendance/summary` — aggregate: for a given date range, returns per-staff counts of present/absent/half_day/on_leave.
    Permission: `hr.attendance.mark`, `hr.attendance.view`.

11. **HR NestJS module** — `HRModule` wiring all controllers, services, repositories. Export `StaffService` (needed by Academics for teacher assignment). Register in `AppModule`.

12. **Frontend — Staff directory page** (`/dashboard/hr/staff`) — Data table:
    - Columns: Photo, Name, Employee ID, Department, Designation, Employment Type badge, Status badge, Join Date, Actions
    - Filters: Search (name/ID), Department dropdown, Designation dropdown, Status dropdown, Employment Type dropdown
    - "Add Staff" primary button. Pagination.
    - Skeleton loader: 8 rows shimmer. Empty state with icon + prompt.
    - Row click → staff detail page.

13. **Frontend — Staff detail page** (`/dashboard/hr/staff/:id`) — Tabbed layout:
    - **Profile tab**: Two-column card. Edit button → slide-over form. Department/Designation/Status/Employment type all editable. Profile photo placeholder.
    - **Personal Details tab**: Extended profile fields (address, emergency contact, qualifications, bank details). Edit via slide-over.
    - **Leave tab**: Current academic year leave balances per type (progress bar for used/remaining). Leave request history table with status badges. "Apply Leave" button.
    - **Attendance tab**: Monthly calendar view showing attendance status per day with color coding. Summary count cards at top.
    - Breadcrumb. Skeleton loaders per tab.

14. **Frontend — Add/Edit Staff form** (slide-over) — Sections:
    - **Basic Info**: First name, Last name, Employee ID (auto-generated suggestion), Date of birth, Gender, Blood group, Phone, Personal email
    - **Employment**: Department (select), Designation (select), Join date, Employment type (radio), Salary grade (text optional)
    - **Login Account**: Role assignment dropdown (teacher, admin, etc.), tick "Send welcome email"
    React Hook Form + Zod. Inline errors. Loading spinner on submit. Toast on success.

15. **Frontend — Leave management page** (`/dashboard/hr/leave`) — Two tabs:
    - **Requests tab**: Table of all leave requests with filters (status, department, leave type, date range). Approve/Reject action buttons on pending rows with confirmation dialog asking for reason on reject. Skeleton loader.
    - **Allocations tab**: Table of staff × leave type matrix for selected academic year. Bulk allocate button triggers allocation job with progress indicator.

16. **Frontend — Staff attendance page** (`/dashboard/hr/attendance`) — Date picker at top (defaults today). Below: staff list with attendance status selector per row (Present/Absent/Half-Day/On Leave dropdown). "Save All" button at bottom with loading state. Summary stats bar (Present X, Absent Y, etc.). Skeleton loader on date change.

17. **Frontend — HR settings page** (`/dashboard/hr/settings`) — Three sections: Departments, Designations, Leave Types. Each as a card with list + add/edit/delete. Inline edit on click. Toast on mutations. Skeleton loaders.

18. **Frontend — HR navigation** — Add "HR" section to sidebar with sub-items: "Staff", "Leave Management", "Attendance", "Settings". Permission-guard all routes.

19. **Seed HR data** — Update `seed.ts` to create 2 departments (Academic, Administration), 3 designations (Principal, Teacher, Clerk), 3 leave types (CL: 12 days, SL: 10 days, EL: 15 days), and 2 staff members (linked to users). Allocate leave for 2025-26 academic year.

## Relevant files
- `backend/src/modules/users/users.service.ts`
- `backend/src/modules/users/entities/user.entity.ts`
- `backend/src/modules/users/entities/school-membership.entity.ts`
- `backend/src/modules/platform/audit/audit.service.ts`
- `backend/src/common/guards/`
- `backend/src/common/decorators/`
- `backend/src/database/migrations/001-initial-schema.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/components/ui/`
- `frontend/src/lib/api-client.ts`
- `frontend/src/app/(dashboard)/layout.tsx`
- `documentation/api-style-guide_1773725741508.md`
- `documentation/coding-guidelines_1773725741509.md`
- `documentation/agent-rules_1773725741507.md`
- `documentation/route-template_1773725741508.md`
