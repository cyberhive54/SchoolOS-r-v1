# Phase 2 — Academics Module

## What & Why
Build the Academics module — the foundational academic structure of SchoolOS. This module defines academic years, classes, sections, subjects, subject groups, timetables, class-teacher assignments, and student promotion. Every other domain module (Attendance, Examinations, Fees, etc.) depends on entities created here. Must be board-agnostic: grading, class naming, and subject groupings are fully configurable per school.

## Done looks like
- Super Admin can create/manage academic years (sessions like 2024–25, 2025–26) and mark one as current
- Classes (Grade 1 → Grade 12, or custom names) can be created and managed
- Sections (A, B, C) can be added to any class; each class-section is a distinct teaching unit with a capacity
- Subjects can be created globally per school and assigned to specific class-sections
- Subject groups (Science, Commerce, Arts) can be defined and subjects mapped to groups
- Class teachers can be assigned to class-sections; one class teacher per class-section
- Subject teachers can be assigned per subject per class-section
- Students can be bulk-promoted from one class-section to the next at year-end
- **Timetable period slots can be configured per academic year** (Period 1–8, Lunch, Recess)
- **Period-by-period class schedule can be built** — each slot assigns a teacher+subject to a class-section on a given day
- **Daily substitutions can be recorded** — when a teacher is absent, substitute teacher is logged per slot
- All pages use skeleton loaders during data fetch; empty states have actionable prompts; all mutations give toast feedback
- Full frontend pages exist for all management screens within a `/dashboard/academics/` route group

## Out of scope
- Online examinations
- Lesson planning
- Attendance marking (that is the Attendance module)

## Tasks

1. **DB migration — academic core tables** — Create migration `003-academics-core.ts` with tables: `academic_years`, `classes`, `sections`, `class_sections` (joins class + section + academic year, stores capacity and status), `subjects`, `subject_groups`, `subject_group_items`. All tables include `school_id`, composite indexes starting with `school_id`, soft-delete where applicable, `created_at`/`updated_at`.

2. **DB migration — assignment tables** — Create migration `004-academics-assignments.ts` with: `class_section_subjects` (subject assigned to a class-section), `class_teacher_assignments` (one class teacher per class-section per academic year), `teacher_subject_assignments` (which staff teaches which subject in which class-section). Foreign keys reference `class_sections`, `subjects`, `staff` (staff table created by HR module; use nullable FK or deferred constraint with comment explaining dependency).

3. **Academic Years endpoints** — `POST /v1/academics/years`, `GET /v1/academics/years`, `GET /v1/academics/years/:id`, `PATCH /v1/academics/years/:id`, `DELETE /v1/academics/years/:id`, `POST /v1/academics/years/:id/set-current`. Each endpoint: route.md, controller, service, request/response DTOs, permissions.ts, tests/service.spec.ts, examples/. Permission: `academics.year.manage`. Only one year can be `is_current = true` per school.

4. **Classes endpoints** — `POST /v1/academics/classes`, `GET /v1/academics/classes`, `GET /v1/academics/classes/:id`, `PATCH /v1/academics/classes/:id`, `DELETE /v1/academics/classes/:id`. Fields: `name` (string, e.g. "Grade 1" or "Class 6"), `order_index` (for display ordering), `school_id`. Permission: `academics.class.manage`.

5. **Sections endpoints** — `POST /v1/academics/sections`, `GET /v1/academics/sections`, `PATCH /v1/academics/sections/:id`, `DELETE /v1/academics/sections/:id`. Fields: `name` (A/B/C/custom), `school_id`. Permission: `academics.section.manage`.

6. **Class-Sections endpoints** — `POST /v1/academics/class-sections` (create a class-section for a given academic year, e.g. Grade 6-A for 2025-26), `GET /v1/academics/class-sections` (filter by academic_year_id, class_id), `GET /v1/academics/class-sections/:id`, `PATCH /v1/academics/class-sections/:id`, `DELETE /v1/academics/class-sections/:id`. Fields include `class_id`, `section_id`, `academic_year_id`, `capacity`, `room_no` (optional). Permission: `academics.class_section.manage`.

7. **Subjects endpoints** — `POST /v1/academics/subjects`, `GET /v1/academics/subjects`, `GET /v1/academics/subjects/:id`, `PATCH /v1/academics/subjects/:id`, `DELETE /v1/academics/subjects/:id`. Fields: `name`, `code` (short code e.g. "MATH"), `type` (enum: `core`, `elective`, `activity`), `school_id`. Permission: `academics.subject.manage`.

8. **Subject groups endpoints** — `POST /v1/academics/subject-groups`, `GET /v1/academics/subject-groups`, `PATCH /v1/academics/subject-groups/:id`, `DELETE /v1/academics/subject-groups/:id`, `POST /v1/academics/subject-groups/:id/subjects` (add subject), `DELETE /v1/academics/subject-groups/:id/subjects/:subjectId` (remove subject). Permission: `academics.subject_group.manage`.

9. **Class-section subject assignment endpoints** — `POST /v1/academics/class-sections/:id/subjects` (assign subject to class-section), `DELETE /v1/academics/class-sections/:id/subjects/:subjectId`, `GET /v1/academics/class-sections/:id/subjects`. Permission: `academics.class_section.manage`.

10. **Teacher assignment endpoints** — `POST /v1/academics/class-sections/:id/class-teacher` (assign class teacher; replaces previous), `DELETE /v1/academics/class-sections/:id/class-teacher`, `POST /v1/academics/class-sections/:id/subject-teachers` (assign subject teacher), `DELETE /v1/academics/class-sections/:id/subject-teachers/:assignmentId`, `GET /v1/academics/class-sections/:id/teachers`. Permission: `academics.teacher_assignment.manage`.

11. **Student promotion endpoint** — `POST /v1/academics/promotions` with body: `{ from_academic_year_id, to_academic_year_id, promotions: [{ student_id, from_class_section_id, to_class_section_id, status: 'promoted'|'detained'|'transferred_out' }] }`. This is a bulk async operation (BullMQ job). Returns `202 Accepted` with `job_id`. Requires idempotency key. Permission: `academics.promotion.manage`. Emits `student.promoted` event per student.

12. **Academics NestJS module** — Wire all controllers, services, and repositories into `AcademicsModule`. Register in `AppModule`. ✅ Complete — includes timetable controllers/services.

13. **DB migration — timetable tables** ✅ Created `011-academics-timetable.ts` with:
    - `timetable_periods` — period slot definitions per school per academic year (name, period_number, start_time, end_time, is_break)
    - `timetable_slots` — actual class-section schedule (day_of_week, subject_id, staff_id, is_free_period, effective dates)
    - `timetable_substitutions` — daily substitution records (absent_staff, substitute_staff, date, slot_id)

14. **Timetable Periods endpoints** ✅ — `POST /v1/academics/timetable/periods`, `GET /v1/academics/timetable/periods?academic_year_id=`, `GET /v1/academics/timetable/periods/:id`, `PATCH /v1/academics/timetable/periods/:id`, `DELETE /v1/academics/timetable/periods/:id`. Permission: `academics.timetable.write` / `academics.timetable.read`.

15. **Timetable Slots endpoints** ✅ — `POST /v1/academics/timetable/slots`, `GET /v1/academics/timetable/slots?academic_year_id=&class_section_id=&staff_id=&day_of_week=`, `GET /v1/academics/timetable/slots/:id`, `PATCH /v1/academics/timetable/slots/:id`, `DELETE /v1/academics/timetable/slots/:id`. One slot = one cell in the class timetable grid.

16. **Timetable Substitutions endpoints** ✅ — `POST /v1/academics/timetable/substitutions`, `GET /v1/academics/timetable/substitutions?date=&absent_staff_id=`, `GET /v1/academics/timetable/substitutions/:id`, `PATCH /v1/academics/timetable/substitutions/:id`, `DELETE /v1/academics/timetable/substitutions/:id`.

17. **Frontend — Academic Years page** (`/dashboard/academics/years`) — List all academic years in a table (name, start date, end date, current badge, actions). Add/Edit via slide-over form with validation. Skeleton loader on initial load. Set Current action with confirmation dialog. Toast on all mutations.

18. **Frontend — Classes & Sections page** (`/dashboard/academics/classes`) — Two-panel layout: left shows classes list, right shows sections within selected class. Add class / add section via inline forms. Drag-to-reorder classes (updates `order_index`). Skeleton loaders.

19. **Frontend — Class-Sections management page** (`/dashboard/academics/class-sections`) — Table of all class-sections for selected academic year with columns: Class, Section, Capacity, Class Teacher, Room. Quick assign class teacher inline. Filter by class. Skeleton loader.

20. **Frontend — Subjects page** (`/dashboard/academics/subjects`) — Searchable subject list with type badge. Add/Edit subject via slide-over. Subject groups sub-page with drag-to-add subject to group. Skeleton loaders.

21. **Frontend — Teacher Assignments page** (`/dashboard/academics/assignments`) — Matrix-style view: rows = class-sections, columns = subjects. Click cell to assign teacher from staff dropdown. Save row button. Skeleton loader with shimmer cells. Toast on save.

22. **Frontend — Timetable page** (`/dashboard/academics/timetable`) — Grid view: rows = periods (Period 1–8), columns = days (Mon–Fri). Each cell shows subject + teacher name. Click cell to assign/change. Toggle between class view and teacher view. Conflict indicator (teacher double-booked). Publish button makes timetable visible to parents via Parent Portal.

23. **Frontend — Substitution Register page** (`/dashboard/academics/timetable/substitutions`) — Date picker at top (defaults today). Shows all slots with absent teachers. Per-slot: select substitute from staff dropdown. Save button. Print-friendly substitution register view.

24. **Frontend — Student Promotion page** (`/dashboard/academics/promotion`) — Step wizard: (1) Select from/to academic years; (2) Select class-section to promote; (3) Review student list with per-student action dropdown (Promoted / Detained / Not applicable); (4) Confirm and submit. Progress loader during async job. Poll job status and show completion toast.

25. **Frontend — Academics layout and navigation** — Add "Academics" section to dashboard sidebar with sub-links. Protect all routes with `academics.*.manage` permission check on the frontend.

26. **Seed academic data** — Update `seed.ts` to create a demo academic year (2025–26, marked current), 3 classes (Grade 1, Grade 2, Grade 3), 2 sections each (A, B), 5 core subjects (English, Mathematics, Science, Social Studies, Hindi), wire them into class-sections, and create 8 sample timetable periods (Periods 1–7 + Lunch break).

## Relevant files
- `backend/src/modules/auth/`
- `backend/src/modules/platform/audit/audit.service.ts`
- `backend/src/modules/platform/permissions/`
- `backend/src/common/guards/permissions.guard.ts`
- `backend/src/common/decorators/`
- `backend/src/database/migrations/003-academics-core.ts`
- `backend/src/database/migrations/004-academics-assignments.ts`
- `backend/src/database/migrations/011-academics-timetable.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `backend/src/modules/academics/entities/timetable-period.entity.ts`
- `backend/src/modules/academics/entities/timetable-slot.entity.ts`
- `backend/src/modules/academics/entities/timetable-substitution.entity.ts`
- `backend/src/modules/academics/endpoints/timetable-periods/`
- `backend/src/modules/academics/endpoints/timetable-slots/`
- `backend/src/modules/academics/endpoints/timetable-substitutions/`
- `frontend/src/components/ui/`
- `frontend/src/store/auth.store.ts`
- `frontend/src/lib/api-client.ts`
- `frontend/src/app/(dashboard)/layout.tsx`
- `documentation/api-style-guide_1773725741508.md`
- `documentation/coding-guidelines_1773725741509.md`
- `documentation/agent-rules_1773725741507.md`
- `documentation/route-template_1773725741508.md`
