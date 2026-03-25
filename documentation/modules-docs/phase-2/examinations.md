# Phase 2 — Examination Management Module (Module 6)

## What & Why
Build the Examination Management module — the core academic evaluation system for SchoolOS. Indian K-12 schools run 3–6 major examinations per academic year (Unit Tests, Half-Yearly, Quarterly, Pre-Board, Annual, Board) plus continuous assessment components. This is a Layer 3 Academic Operations module, dependent on Students, Academics, and Annual Calendar. Examination data is the primary output that drives report cards, parent communication, rank lists, and UDISE compliance reports. Must support multiple board formats: CBSE, ICSE, IGCSE, and state boards — each with different grading schemes, mark distributions, and report card layouts. NEP 2020 compliance requires Holistic Progress Cards (HPC) with competency-based assessment alongside marks.

## Done looks like
- Super Admin can define exam groups (e.g., "Half-Yearly 2025", "Annual Exam 2025–26") with an exam type category (Unit Test, Half-Yearly, Quarterly, Annual, Pre-Board)
- Within each exam group, individual subject exams can be scheduled per class-section with date, time, duration, and maximum marks
- Admit cards / hall tickets can be generated per student per exam group — PDF format, school-branded
- Teachers can enter marks for each student for each subject exam — inline table editor with max-marks validation
- Multiple mark components are supported: Theory, Practical, Internal Assessment, Oral — each configurable per exam per subject
- Grading is configurable per school: percentage-based, GPA (A+/A/B+...), letter grades, CBSE 9-point scale, ICSE percentage format
- After marks entry is complete, report cards are generated per student — school-branded PDF with all subjects, grades, teacher remarks, attendance summary, and principal signature area
- Rank lists and merit lists can be generated per class or per school
- Marks and report cards are published to the Parent Portal and parent mobile app
- Tabulation register (consolidated marks sheet for all students) can be exported as Excel
- Co-scholastic assessment (activities, sports, arts, values) can be recorded per student per term
- NEP 2020 Holistic Progress Card (HPC) mode can be activated per school — competency indicators replace raw marks
- All pages: skeleton loaders, empty states, toast feedback, print-ready views

## Out of scope
- Online computer-based examinations (Module 7 — Online Examination System)
- Board exam registrations (State Board or CBSE direct — external systems)
- Competitive exam coaching tracking (out of scope entirely)
- Live invigilation or proctoring

## Tasks

1. **DB migration — examinations core** — Create migration `016-examinations-core.ts` with:
   - `exam_types`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(100) NOT NULL, code VARCHAR(20) NOT NULL, sequence_order INT NOT NULL, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Unique: `(school_id, code)`. Index: `(school_id, sequence_order)`.
   - `exam_groups`: `(id UUID PK, school_id UUID NOT NULL, academic_year_id UUID NOT NULL FK academic_years, exam_type_id UUID NOT NULL FK exam_types, name VARCHAR(200) NOT NULL, description TEXT NULL, start_date DATE NULL, end_date DATE NULL, result_declaration_date DATE NULL, is_published BOOLEAN DEFAULT false, grading_scheme_id UUID NULL FK grading_schemes, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ NULL)`. Index: `(school_id, academic_year_id, exam_type_id)`.
   - `grading_schemes`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(100) NOT NULL, scheme_type ENUM('percentage','gpa','letter','cbse_9point','icse_percentage','nep_hpc') NOT NULL, is_default BOOLEAN DEFAULT false, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Index: `(school_id, is_default)`.
   - `grading_scheme_rules`: `(id UUID PK, school_id UUID NOT NULL, grading_scheme_id UUID NOT NULL FK grading_schemes, min_percent DECIMAL(5,2) NOT NULL, max_percent DECIMAL(5,2) NOT NULL, grade VARCHAR(10) NOT NULL, grade_point DECIMAL(4,2) NULL, description VARCHAR(100) NULL, color_hex VARCHAR(7) NULL)`. Index: `(school_id, grading_scheme_id)`.
   - `exam_schedules`: `(id UUID PK, school_id UUID NOT NULL, exam_group_id UUID NOT NULL FK exam_groups, class_section_id UUID NOT NULL FK class_sections, subject_id UUID NOT NULL FK subjects, exam_date DATE NULL, start_time TIME NULL, duration_minutes INT NULL, venue VARCHAR(200) NULL, max_marks DECIMAL(6,2) NOT NULL, pass_marks DECIMAL(6,2) NOT NULL, is_cancelled BOOLEAN DEFAULT false, cancel_reason TEXT NULL, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Unique: `(school_id, exam_group_id, class_section_id, subject_id)`. Index: `(school_id, exam_group_id)`, `(school_id, class_section_id, exam_date)`.
   - `exam_mark_components`: `(id UUID PK, school_id UUID NOT NULL, exam_schedule_id UUID NOT NULL FK exam_schedules, component_type ENUM('theory','practical','internal_assessment','oral','project','portfolio','other') NOT NULL, name VARCHAR(100) NOT NULL, max_marks DECIMAL(6,2) NOT NULL, is_required BOOLEAN DEFAULT true, sequence_order INT NOT NULL)`. Index: `(school_id, exam_schedule_id)`.
   - All composite indexes start with `school_id`.

2. **DB migration — marks and report cards** — Create migration `017-examinations-marks.ts` with:
   - `marks_entries`: `(id UUID PK, school_id UUID NOT NULL, exam_schedule_id UUID NOT NULL FK exam_schedules, student_id UUID NOT NULL FK students, enrollment_id UUID NOT NULL FK student_enrollments, is_absent BOOLEAN DEFAULT false, total_marks_obtained DECIMAL(6,2) NULL, is_pass BOOLEAN NULL, grade VARCHAR(10) NULL, grade_point DECIMAL(4,2) NULL, remarks TEXT NULL, entered_by UUID NOT NULL FK users, entered_at TIMESTAMPTZ DEFAULT now(), verified_by UUID NULL FK users, verified_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Unique: `(school_id, exam_schedule_id, student_id)`. Index: `(school_id, student_id, exam_schedule_id)`, `(school_id, exam_schedule_id)`.
   - `marks_component_entries`: `(id UUID PK, school_id UUID NOT NULL, marks_entry_id UUID NOT NULL FK marks_entries, mark_component_id UUID NOT NULL FK exam_mark_components, marks_obtained DECIMAL(6,2) NULL, is_absent BOOLEAN DEFAULT false)`. Unique: `(school_id, marks_entry_id, mark_component_id)`.
   - `coscholastic_entries`: `(id UUID PK, school_id UUID NOT NULL, exam_group_id UUID NOT NULL FK exam_groups, student_id UUID NOT NULL FK students, activity_name VARCHAR(100) NOT NULL, grade VARCHAR(10) NOT NULL, remarks TEXT NULL, entered_by UUID NOT NULL FK users, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Index: `(school_id, exam_group_id, student_id)`.
   - `report_cards`: `(id UUID PK, school_id UUID NOT NULL, exam_group_id UUID NOT NULL FK exam_groups, student_id UUID NOT NULL FK students, enrollment_id UUID NOT NULL FK student_enrollments, overall_percent DECIMAL(5,2) NULL, overall_grade VARCHAR(10) NULL, overall_grade_point DECIMAL(4,2) NULL, rank_in_class INT NULL, result ENUM('pass','fail','compartment','promoted','detained') NULL, teacher_remarks TEXT NULL, principal_remarks TEXT NULL, attendance_percent DECIMAL(5,2) NULL, is_published BOOLEAN DEFAULT false, pdf_url TEXT NULL, pdf_generated_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Unique: `(school_id, exam_group_id, student_id)`. Index: `(school_id, exam_group_id)`, `(school_id, student_id)`.
   - All composite indexes start with `school_id`.

3. **Exam types endpoints** — `POST /v1/exams/types`, `GET /v1/exams/types`, `PATCH /v1/exams/types/:id`, `DELETE /v1/exams/types/:id`. Permission: `exams.settings.manage`. Default seed values: Unit Test, Quarterly, Half-Yearly, Annual, Pre-Board. Full endpoint folder.

4. **Grading scheme endpoints** — Full CRUD:
   - `POST /v1/exams/grading-schemes` — create scheme with rules array in body. Body: `{ name, scheme_type, rules: [{ min_percent, max_percent, grade, grade_point?, description?, color_hex? }] }`. Validates rules cover 0–100 with no gaps. Permission: `exams.settings.manage`.
   - `GET /v1/exams/grading-schemes`, `GET /v1/exams/grading-schemes/:id`, `PATCH /v1/exams/grading-schemes/:id`, `DELETE /v1/exams/grading-schemes/:id`.
   - `POST /v1/exams/grading-schemes/:id/set-default` — sets is_default true for this scheme, false for all others. Permission: `exams.settings.manage`.
   - Full endpoint folders for each.

5. **Exam groups endpoints** — Core exam management:
   - `POST /v1/exams/groups` — create exam group. Body: `{ academic_year_id, exam_type_id, name, description?, start_date?, end_date?, result_declaration_date?, grading_scheme_id? }`. Permission: `exams.group.manage`. Audit logged.
   - `GET /v1/exams/groups` — filters: `academic_year_id`, `exam_type_id`, `is_published`. Paginated. Permission: `exams.group.view`.
   - `GET /v1/exams/groups/:id` — includes schedule count, marks entry progress (N of M class-sections completed). Permission: `exams.group.view`.
   - `PATCH /v1/exams/groups/:id`. Permission: `exams.group.manage`. Audit logged.
   - `DELETE /v1/exams/groups/:id` — soft delete; only if no marks entered. Permission: `exams.group.manage`.
   - `POST /v1/exams/groups/:id/publish` — sets `is_published = true`; publishes results to Parent Portal. Validates all marks entered. Emits `exam.results_published`. Permission: `exams.group.manage`.
   - Full endpoint folders.

6. **Exam schedules endpoints** — Subject-level exam scheduling within a group:
   - `POST /v1/exams/groups/:groupId/schedules` — add a subject exam to the group. Body: `{ class_section_id, subject_id, exam_date?, start_time?, duration_minutes?, venue?, max_marks, pass_marks }`. Permission: `exams.schedule.manage`.
   - `GET /v1/exams/groups/:groupId/schedules` — list all schedules for this group; filters: `class_section_id`. Permission: `exams.schedule.view`.
   - `PATCH /v1/exams/schedules/:id` — update schedule details. Permission: `exams.schedule.manage`.
   - `DELETE /v1/exams/schedules/:id` — only if no marks entered. Permission: `exams.schedule.manage`.
   - `POST /v1/exams/schedules/:id/cancel` — body: `{ reason }`. Sets `is_cancelled = true`. Permission: `exams.schedule.manage`.
   - `POST /v1/exams/schedules/:scheduleId/components` — add mark component to a schedule. Permission: `exams.schedule.manage`.
   - `DELETE /v1/exams/schedules/:scheduleId/components/:componentId`. Permission: `exams.schedule.manage`.
   - Full endpoint folders.

7. **Marks entry endpoints** — The teacher's marks entry workflow:
   - `GET /v1/exams/schedules/:scheduleId/marks` — returns a marks entry sheet: list of all enrolled students with their current marks_entry record (null if not yet entered). Sorted by roll number. Permission: `exams.marks.view`. PBAC: teacher sees only their assigned subject's class-sections.
   - `POST /v1/exams/schedules/:scheduleId/marks/bulk-save` — bulk save marks for multiple students. Body: `{ records: [{ student_id, is_absent, total_marks_obtained?, components?: [{ mark_component_id, marks_obtained, is_absent }], remarks? }] }`. Validates marks_obtained ≤ max_marks per component. Upserts. Computes grade from grading_scheme. **Requires `Idempotency-Key` header**. Returns summary: `{ saved: N, errors: [] }`. Permission: `exams.marks.enter`. Audit logged.
   - `PATCH /v1/exams/marks/:markEntryId` — update individual student's marks. Permission: `exams.marks.enter`.
   - `POST /v1/exams/marks/:markEntryId/verify` — mark as verified by senior teacher/admin. Sets `verified_by`, `verified_at`. Permission: `exams.marks.verify`.
   - `GET /v1/exams/groups/:groupId/marks/progress` — progress report: per class-section per subject, how many students have marks entered. Response: `{ schedules: [{ schedule_id, class_section_name, subject_name, total_students, entered, pending, is_complete }] }`. Permission: `exams.marks.view`.
   - Full endpoint folders.

8. **Report card generation endpoint** — `POST /v1/exams/groups/:groupId/report-cards/generate` — Async BullMQ job. Generates report cards for all students in the group (or specific class-section if `class_section_id` filter provided). Body: `{ class_section_id? }`. **Requires `Idempotency-Key` header**. Returns 202 with job_id. Job: (1) compute totals, ranks; (2) fetch attendance from AttendanceModule; (3) render PDF (Puppeteer + school-branded template); (4) upload to object storage; (5) save `pdf_url` to `report_cards` table; (6) emit `exam.report_card_ready` per student. Permission: `exams.report_card.generate`. Only allowed when exam group marks entry is complete.

9. **Report card retrieval endpoint** — `GET /v1/exams/groups/:groupId/report-cards` — list all report cards for group; filters: `class_section_id`. Returns: `{ student_id, student_name, admission_no, overall_percent, rank, result, is_published, pdf_url }`. Permission: `exams.report_card.view`. PBAC: teacher sees own class; parent sees own child.

10. **Admit card generation endpoint** — `POST /v1/exams/groups/:groupId/admit-cards/generate` — Async BullMQ job. Generates admit cards (hall tickets) for all students. Body: `{ class_section_id? }`. Returns 202 with job_id. Admit card includes: student photo, name, admission no, class, exam schedule (date, time, venue per subject), exam roll number (auto-assigned sequential per class). Permission: `exams.admit_card.generate`.

11. **Tabulation register export** — `GET /v1/exams/groups/:groupId/tabulation?class_section_id=uuid` — Returns Excel file (stream). Columns: Roll No, Name, Admission No, then one column per subject (marks obtained / max), Total, Percent, Grade, Rank. Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Permission: `exams.report.export`.

12. **Co-scholastic entries endpoints** — `POST /v1/exams/groups/:groupId/coscholastic`, `GET /v1/exams/groups/:groupId/coscholastic?student_id=`, `PATCH /v1/exams/coscholastic/:id`, `DELETE /v1/exams/coscholastic/:id`. Full endpoint folders. Permission: `exams.marks.enter`.

13. **Rank computation endpoint** — `POST /v1/exams/groups/:groupId/compute-ranks` — Synchronous (not async — fast computation). Computes rank for each student in each class-section based on overall_percent. Updates `rank_in_class` in `report_cards`. Returns `{ ranks_computed: N }`. Permission: `exams.group.manage`.

14. **Examinations NestJS module** — Create `ExaminationsModule` in `backend/src/modules/examinations/`. Entities: all 8 entities from migrations 016 and 017. Import: `StudentsModule`, `AcademicsModule`, `AttendanceModule` (for attendance_percent on report cards), `CalendarModule`. Export `MarksService` (used by Parent Portal). Register in `AppModule`. Create all entity files and module.ts.

15. **Permissions registration** — Add to `backend/src/config/permissions.ts`:
    - `exams.settings.manage` (exam types, grading schemes)
    - `exams.group.view`, `exams.group.manage`
    - `exams.schedule.view`, `exams.schedule.manage`
    - `exams.marks.view`, `exams.marks.enter`, `exams.marks.verify`
    - `exams.report_card.view`, `exams.report_card.generate`
    - `exams.admit_card.generate`
    - `exams.report.export`
    Default assignments: `super_admin`, `admin`, `principal` — all. `teacher` — schedule.view, marks.view, marks.enter (own subjects only PBAC), report_card.view. `parent` — report_card.view (own children PBAC). `student` — report_card.view (own only).

16. **Frontend — Exam groups list page** (`/dashboard/examinations`) — Overview page:
    - Cards grid: one card per exam group showing name, type badge, date range, progress bar (marks entry completion %), Published badge. "Create Exam Group" button. Academic year filter.
    - Click card → exam group detail page.
    - Skeleton loader (4 card shimmer). Empty state: "No exam groups. Create your first exam."

17. **Frontend — Exam group detail page** (`/dashboard/examinations/:groupId`) — Tabbed layout:
    - **Schedule tab**: Table of exam schedules grouped by class-section. Columns: Class-Section, Subject, Date, Time, Duration, Max Marks, Pass Marks, Venue, Status. "Add Subject Exam" button. Edit/Cancel per row. Skeleton loader.
    - **Marks Entry tab**: Progress matrix — rows = class-sections, columns = subjects. Cell shows fraction (e.g., 28/30) and a color (green=complete, amber=partial, grey=pending). Click cell → opens marks entry sheet for that class+subject.
    - **Report Cards tab**: Table per class-section showing student list with their report card status (Generated / Not Generated / Published). Generate button per class-section. Download PDF per student. Bulk download ZIP button.
    - **Admit Cards tab**: Generate button per class-section. Download links.
    - **Settings tab**: Edit group name, dates, grading scheme, result declaration date.
    - Breadcrumb: Examinations → {Group Name}.

18. **Frontend — Marks entry sheet** (`/dashboard/examinations/:groupId/marks/:scheduleId`) — Spreadsheet-style editor:
    - Top: Class-Section name, Subject name, Max Marks, Pass Marks. Back button.
    - Table: Roll No, Student Name, then one column per mark component (if components defined) OR a single "Marks" column. Each cell is an editable number input. Absent checkbox per student row — disables mark inputs and sets to 0. Grade auto-computed and shown as badge as user types (client-side grading scheme lookup).
    - Bottom bar: "Save All" button, "Unsaved changes" indicator (count of modified rows). Keyboard navigation (Tab moves to next cell). Auto-save on blur with debounce.
    - Skeleton loader. Empty state: "No students enrolled."

19. **Frontend — Report card view page** (`/dashboard/examinations/:groupId/report-cards/:studentId`) — Print-ready report card preview:
    - School header (logo, name, address).
    - Student info section: photo, name, admission no, class, roll no, academic year.
    - Marks table: subject, theory, practical, internal, total, max, percent, grade.
    - Co-scholastic table (if any entries).
    - Attendance summary: Present/Total, Percentage.
    - Remarks sections (teacher, principal).
    - Overall result band at bottom.
    - Print button (window.print() with print-only CSS). Download PDF button (fetches stored pdf_url).

20. **Frontend — Examination navigation** — Add "Examinations" to sidebar:
    - "Exam Groups" — `/dashboard/examinations`
    - "Grading Schemes" — `/dashboard/examinations/grading-schemes`
    - "Settings" — `/dashboard/examinations/settings`
    Permission guard: `exams.group.view`.

21. **Seed examinations data** — Update `seed.ts` to:
    - Create 1 grading scheme: CBSE 9-Point (`A1: 91–100 = 10.0`, `A2: 81–90 = 9.0`, `B1: 71–80 = 8.0`, `B2: 61–70 = 7.0`, `C1: 51–60 = 6.0`, `C2: 41–50 = 5.0`, `D: 33–40 = 4.0`, `E: 0–32 = 0.0`). Mark as default.
    - Create 3 exam types: Unit Test 1 (order 1), Half-Yearly (order 2), Annual (order 3).
    - Create 1 exam group: "Unit Test 1 — 2025" for 2025–26 academic year, Unit Test type, max_marks 25, pass_marks 10.
    - Create exam schedules for all 5 subjects for Grade 1-A.

## Relevant files
- `backend/src/modules/examinations/`
- `backend/src/modules/examinations/entities/exam-type.entity.ts`
- `backend/src/modules/examinations/entities/exam-group.entity.ts`
- `backend/src/modules/examinations/entities/grading-scheme.entity.ts`
- `backend/src/modules/examinations/entities/grading-scheme-rule.entity.ts`
- `backend/src/modules/examinations/entities/exam-schedule.entity.ts`
- `backend/src/modules/examinations/entities/exam-mark-component.entity.ts`
- `backend/src/modules/examinations/entities/marks-entry.entity.ts`
- `backend/src/modules/examinations/entities/marks-component-entry.entity.ts`
- `backend/src/modules/examinations/entities/coscholastic-entry.entity.ts`
- `backend/src/modules/examinations/entities/report-card.entity.ts`
- `backend/src/database/migrations/016-examinations-core.ts`
- `backend/src/database/migrations/017-examinations-marks.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `backend/src/modules/attendance/services/attendance-summary.service.ts`
- `frontend/src/app/(dashboard)/examinations/page.tsx`
- `frontend/src/app/(dashboard)/examinations/[groupId]/page.tsx`
- `frontend/src/app/(dashboard)/examinations/[groupId]/marks/[scheduleId]/page.tsx`
- `frontend/src/components/modules/examinations/MarksEntrySheet.tsx`
- `frontend/src/components/modules/examinations/ReportCardPreview.tsx`
- `frontend/src/hooks/use-examinations.ts`
- `documentation/api-style-guide.md`
- `documentation/coding-guidelines.md`
- `documentation/agent-rules.md`
- `documentation/route-template.md`
