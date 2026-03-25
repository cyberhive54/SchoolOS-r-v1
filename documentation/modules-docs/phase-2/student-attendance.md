# Phase 2 — Student Attendance Module (Module 5)

## What & Why
Build the Student Attendance module — the most-used daily workflow in any Indian school. Teachers mark attendance every morning (and per period for secondary classes); principals track it; parents receive alerts. This is a Layer 3 Academic Operations module that sits on top of Layer 2 (Students, Academics, Annual Calendar). Attendance data feeds into: report cards (attendance percentage), parent portal (daily summary), communication engine (absence alerts), and UDISE compliance reports (annual data). Must support two modes: (1) daily class-wise attendance (primary and middle school) and (2) period-wise attendance (secondary school, Grades 9–12). Must work offline-first on the teacher app — attendance taken without internet must sync when reconnected.

## Done looks like
- Teachers can mark daily attendance for their assigned class-section from any device — Present, Absent, Late, Half-Day, Excused
- Attendance for any given day is locked once the admin has closed the day (configurable: auto-close at end of school day or manual close)
- Period-wise attendance is supported: teachers can mark attendance per subject per period for secondary class-sections
- Attendance auto-skips holidays and non-working days (consults `CalendarService`)
- Low attendance threshold alerts are configurable per school (e.g., below 75%) — flagged in reports and visible to admins
- Students can apply for leave (parent-approved request); approved leave days count as excused absence, not unexcused
- Leave requests go through an approval workflow: parent/student submits → class teacher or admin approves/rejects
- Bulk attendance marking: mark all present with one click, then mark exceptions
- Monthly and annual attendance summary reports per student, per class, per school
- Attendance data is visible to parents on the Parent Portal (their child's daily and monthly summary)
- All pages: skeleton loaders, empty states, toast feedback. Offline marking queued in service worker and synced on reconnect

## Out of scope
- Staff/HR attendance (HR module — Module 10 — already covers this separately)
- Biometric / RFID / facial recognition attendance (future hardware integration)
- QR code attendance scanning (Phase 4 enhancement)
- Exam hall attendance (Examinations module)

## Tasks

1. **DB migration — attendance core tables** — Create migration `015-student-attendance.ts` with:
   - `attendance_sessions`: `(id UUID PK, school_id UUID NOT NULL, class_section_id UUID NOT NULL FK class_sections, academic_year_id UUID NOT NULL FK academic_years, date DATE NOT NULL, session_type ENUM('daily','period') NOT NULL DEFAULT 'daily', timetable_period_id UUID NULL FK timetable_periods, status ENUM('open','closed','holiday') NOT NULL DEFAULT 'open', opened_by UUID NULL FK users, closed_by UUID NULL FK users, opened_at TIMESTAMPTZ NULL, closed_at TIMESTAMPTZ NULL, notes TEXT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Unique index: `(school_id, class_section_id, date, session_type, timetable_period_id)` — prevents duplicate sessions per class per day per period.
   - Index: `(school_id, date)`, `(school_id, class_section_id, academic_year_id)`.
   - `attendance_records`: `(id UUID PK, school_id UUID NOT NULL, session_id UUID NOT NULL FK attendance_sessions, student_id UUID NOT NULL FK students, enrollment_id UUID NOT NULL FK student_enrollments, status ENUM('present','absent','late','half_day','excused','holiday') NOT NULL, leave_request_id UUID NULL FK attendance_leave_requests, note TEXT NULL, marked_by UUID NOT NULL FK users, marked_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Unique index: `(school_id, session_id, student_id)`. Index: `(school_id, student_id, session_id)`.
   - `attendance_leave_requests`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, requested_by UUID NOT NULL FK users, from_date DATE NOT NULL, to_date DATE NOT NULL, total_days INT NOT NULL, reason TEXT NOT NULL, status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending', reviewed_by UUID NULL FK users, reviewed_at TIMESTAMPTZ NULL, review_note TEXT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Check constraint: `to_date >= from_date`. Index: `(school_id, student_id, status)`, `(school_id, from_date, to_date)`.
   - `attendance_thresholds`: `(id UUID PK, school_id UUID NOT NULL, academic_year_id UUID NOT NULL FK academic_years, threshold_percent DECIMAL(5,2) NOT NULL DEFAULT 75.00, alert_at_percent DECIMAL(5,2) NOT NULL DEFAULT 80.00, applies_to ENUM('all','class','student') NOT NULL DEFAULT 'all', class_section_id UUID NULL FK class_sections, student_id UUID NULL FK students, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Unique index: `(school_id, academic_year_id, applies_to, class_section_id, student_id)`.
   - All composite indexes start with `school_id`.

2. **Attendance sessions endpoints** — Manage the attendance marking session lifecycle:
   - `POST /v1/attendance/sessions` — Open an attendance session for a class-section on a date. Body: `{ class_section_id, date, session_type, timetable_period_id? }`. Validates: (a) class-section exists and belongs to school; (b) date is not a holiday (CalendarService lookup); (c) no session already open for this class+date+type+period. Sets `status = 'open'`, `opened_by = req.user.id`. Returns 201. Permission: `attendance.session.manage`. Roles: `super_admin`, `admin`, `teacher` (only their assigned sections — PBAC).
   - `GET /v1/attendance/sessions` — list; filters: `class_section_id`, `date`, `date[gte]`, `date[lte]`, `academic_year_id`, `status`, `session_type`; paginated. Permission: `attendance.session.view`.
   - `GET /v1/attendance/sessions/:id` — single session with record counts (present, absent, etc.). Permission: `attendance.session.view`.
   - `POST /v1/attendance/sessions/:id/close` — closes the session (`status = 'closed'`, `closed_by`, `closed_at`). Validates all enrolled students have a record; if not, returns warning but still closes. Permission: `attendance.session.manage`.
   - Full endpoint folder for each. Teacher PBAC: teacher can only open/close sessions for class-sections they are assigned to in `teacher_subject_assignments` or `class_teacher_assignments`.

3. **Attendance records endpoints** — Core marking:
   - `POST /v1/attendance/sessions/:sessionId/records/bulk-mark` — mark attendance for multiple students in one call. Body: `{ records: [{ student_id, status, note?, leave_request_id? }] }`. Upserts existing records (idempotent per student per session). Validates all student_ids are enrolled in the session's class-section. Returns summary: `{ saved: N, errors: [] }`. **Requires `Idempotency-Key` header**. Permission: `attendance.record.mark`. Emits `attendance.marked` event with summary payload. Audit logged.
   - `GET /v1/attendance/sessions/:sessionId/records` — list all records for a session with student names. Permission: `attendance.record.view`.
   - `PATCH /v1/attendance/records/:recordId` — update a single record (re-mark or add note). Only allowed when session is open OR user has `attendance.record.manage` (admin override). Permission: `attendance.record.mark`. Audit logged.
   - Full endpoint folders for each.

4. **Student attendance summary endpoint** — `GET /v1/attendance/students/:studentId/summary` — Aggregate for a student:
   - Query params: `academic_year_id` (required), `month` (YYYY-MM, optional — month-level summary), `from_date`, `to_date`.
   - Response: `{ student_id, academic_year_id, total_working_days, present, absent, late, half_day, excused, attendance_percent, is_below_threshold, monthly_breakdown: [{ month, working_days, present, percent }] }`.
   - Computed from `attendance_records` joins. Redis cache: `{school_id}:attendance:summary:{student_id}:{year}:{month}`, TTL 30 min. Invalidated on any record change.
   - Permission: `attendance.report.view`. PBAC: teacher sees only their class students; parent sees only own children.

5. **Class attendance summary endpoint** — `GET /v1/attendance/class-sections/:id/summary` — Aggregate for a full class-section:
   - Query params: `academic_year_id`, `date`, `month`.
   - Response: `{ class_section_id, date_or_month, records: [{ student_id, student_name, roll_number, status, attendance_percent }], summary: { total, present, absent, late, excused } }`.
   - Used by teacher's daily view and principal's dashboard widget.
   - Permission: `attendance.report.view`. PBAC: teacher sees only assigned classes.

6. **Leave request endpoints** — Student attendance leave workflow:
   - `POST /v1/attendance/leave-requests` — student/parent/teacher submits leave for a student. Body: `{ student_id, from_date, to_date, reason }`. Validates: date range valid; student enrolled. Returns 201. Emits `attendance.leave_request_submitted`. Permission: `attendance.leave.request`.
   - `GET /v1/attendance/leave-requests` — list; filters: `student_id`, `status`, `from_date`, `to_date`; paginated. Permission: `attendance.leave.view`. PBAC: teacher sees class students; parent sees own children.
   - `GET /v1/attendance/leave-requests/:id`. Permission: `attendance.leave.view`.
   - `POST /v1/attendance/leave-requests/:id/approve` — approves; sets `status = 'approved'`, `reviewed_by`, `reviewed_at`. Optionally auto-marks relevant attendance records as `excused` if sessions already exist for those dates. Emits `attendance.leave_approved`. Permission: `attendance.leave.approve`.
   - `POST /v1/attendance/leave-requests/:id/reject` — body: `{ reason }`. Emits `attendance.leave_rejected`. Permission: `attendance.leave.approve`.
   - `POST /v1/attendance/leave-requests/:id/cancel` — student/parent can cancel pending request. Permission: `attendance.leave.request`.
   - Full endpoint folders for each.

7. **Attendance threshold endpoints** — Configure low-attendance alert thresholds:
   - `PUT /v1/attendance/thresholds` — upsert school-level or class-level threshold. Body: `{ academic_year_id, threshold_percent, alert_at_percent, applies_to, class_section_id? }`. Permission: `attendance.settings.manage`.
   - `GET /v1/attendance/thresholds?academic_year_id=uuid`. Permission: `attendance.settings.manage`.
   - Full endpoint folder.

8. **Low-attendance report endpoint** — `GET /v1/attendance/reports/low-attendance?academic_year_id=uuid&class_section_id=uuid&threshold=75` — Returns list of students below threshold. Response: `{ students: [{ student_id, name, admission_no, class_section, attendance_percent, working_days, present_days }] }`. Permission: `attendance.report.view`.

9. **Attendance module NestJS wiring** — Create `AttendanceModule` in `backend/src/modules/attendance/`. Entities: `AttendanceSessionEntity`, `AttendanceRecordEntity`, `AttendanceLeaveRequestEntity`, `AttendanceThresholdEntity`. Import `CalendarModule` (for working day checks), `StudentsModule` (for enrollment lookups), `AcademicsModule` (for class-section validation). Export `AttendanceSummaryService` (needed by Examinations module for report cards). Register in `AppModule`. Create `attendance.module.ts` and all entity files.

10. **Permissions registration** — Add to `backend/src/config/permissions.ts`:
    - `attendance.session.view`, `attendance.session.manage`
    - `attendance.record.view`, `attendance.record.mark`, `attendance.record.manage` (admin override for closed sessions)
    - `attendance.leave.view`, `attendance.leave.request`, `attendance.leave.approve`
    - `attendance.report.view`, `attendance.report.export`
    - `attendance.settings.manage`
    Default assignments: `super_admin`, `admin`, `principal` — all. `teacher` — session.view/manage (own classes), record.view/mark (own classes), leave.view/approve (own class students). `parent` — leave.request (own children). `student` — leave.request (own record only).

11. **Frontend — Attendance marking page** (`/dashboard/attendance/mark`) — The teacher's daily workflow:
    - **Top bar**: Academic year selector (defaults current), Class-Section selector (filtered by teacher's assigned sections or all if admin), Date picker (defaults today), Session type toggle (Daily / Period-wise). "Open Session" button if no session exists for that combination.
    - **Student list** (main panel): Shows all enrolled students sorted by roll number. Each row: roll number, photo thumbnail, student name, attendance status selector (Present / Absent / Late / Half-Day / Excused — segmented control or dropdown), note field (collapsible). "Mark All Present" quick action at top. Changed rows highlighted with amber border.
    - **Session summary bar** (sticky bottom): Present N, Absent N, Late N, Unmarked N. "Save & Submit" button. "Close Session" button (with confirmation dialog). Shows session status badge (Open / Closed / Holiday).
    - Loading state: skeleton rows (8 shimmer rows). Empty state: "No students enrolled in this class-section."
    - Holiday state: Banner "Today is a holiday: {holiday_name}. No attendance required." with option to override and open a session anyway (admin only).

12. **Frontend — Student attendance detail page** (`/dashboard/students/:id/attendance`) — Tab on student detail page (added to existing student detail page layout):
    - Monthly calendar view showing attendance status per day (color-coded: green=present, red=absent, yellow=late, blue=excused, grey=holiday/non-working). Weekends and holidays grayed out.
    - Summary cards row: Total Working Days, Present, Absent, Attendance %.
    - Month navigation. Default: current month.
    - Below calendar: attendance records table with date, session type, status, marked by, notes.
    - "Apply Leave" button → opens leave request form (from_date, to_date, reason).
    - Skeleton loader on month change.

13. **Frontend — Class attendance report page** (`/dashboard/attendance/reports`) — Two tabs:
    - **Class Summary tab**: Select class-section + month → show student-wise attendance grid. Rows = students, columns = dates. Cell color by status. Export to CSV button. Skeleton loader.
    - **Low Attendance tab**: Select class-section + threshold percent → show students below threshold with percentage and days count. "Send reminder to parents" bulk action (future — Notification Engine Phase 4). Skeleton loader. Empty state: "All students are above the threshold."

14. **Frontend — Attendance navigation** — Add "Attendance" section to dashboard sidebar:
    - "Mark Attendance" — `/dashboard/attendance/mark`
    - "Reports" — `/dashboard/attendance/reports`
    - "Leave Requests" — `/dashboard/attendance/leave`
    Permission guard: `attendance.session.view`.

15. **Frontend — Leave requests management page** (`/dashboard/attendance/leave`) — Table of all leave requests:
    - Filters: student name search, status (pending/approved/rejected), date range.
    - Columns: Student, Class, Dates, Days, Reason (truncated), Status badge, Actions.
    - Action buttons on pending rows: Approve (green) / Reject (red) with confirm dialog (reject asks for reason).
    - Skeleton loader. Empty state: "No leave requests."

16. **Seed attendance data** — Update `seed.ts` to:
    - Open and close one attendance session for each of the 5 seeded demo students in Grade 1-A on the latest weekday (calculate dynamically or use a fixed past date like 2025-04-07).
    - Mark 4 students as Present, 1 as Absent.
    - Create one pending leave request for the absent student.

## Relevant files
- `backend/src/modules/attendance/`
- `backend/src/modules/attendance/entities/attendance-session.entity.ts`
- `backend/src/modules/attendance/entities/attendance-record.entity.ts`
- `backend/src/modules/attendance/entities/attendance-leave-request.entity.ts`
- `backend/src/modules/attendance/entities/attendance-threshold.entity.ts`
- `backend/src/modules/attendance/endpoints/sessions/`
- `backend/src/modules/attendance/endpoints/records/`
- `backend/src/modules/attendance/endpoints/leave-requests/`
- `backend/src/modules/attendance/endpoints/thresholds/`
- `backend/src/modules/attendance/endpoints/reports/`
- `backend/src/database/migrations/015-student-attendance.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `backend/src/modules/calendar/calendar.service.ts`
- `backend/src/modules/academics/entities/class-section.entity.ts`
- `backend/src/modules/students/entities/student-enrollment.entity.ts`
- `backend/src/modules/platform/audit/audit.service.ts`
- `frontend/src/app/(dashboard)/attendance/mark/page.tsx`
- `frontend/src/app/(dashboard)/attendance/reports/page.tsx`
- `frontend/src/app/(dashboard)/attendance/leave/page.tsx`
- `frontend/src/components/modules/attendance/AttendanceMarker.tsx`
- `frontend/src/components/modules/attendance/AttendanceCalendar.tsx`
- `frontend/src/hooks/use-attendance.ts`
- `documentation/api-style-guide.md`
- `documentation/coding-guidelines.md`
- `documentation/agent-rules.md`
- `documentation/route-template.md`
