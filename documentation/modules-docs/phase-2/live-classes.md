# Phase 2 — Live Classes Module (Module 25)

## What & Why
Build the Live Classes module — the virtual classroom integration layer for SchoolOS. Rather than building a video conferencing system from scratch, this module integrates with Google Meet and Zoom (and optionally Microsoft Teams in future) to allow teachers to schedule, launch, and record virtual classes directly from the SchoolOS dashboard. Students and parents receive the meeting link automatically. This module is a Layer 3 Academic Operations module depending on Academics (for class-sections and timetable), Students, and the Communication module (for meeting link delivery — integrated in Phase 4). In Indian schools post-COVID, many hybrid schools still conduct online classes for certain subjects or for absent students — this module covers that workflow cleanly.

## Done looks like
- Teachers can schedule a live class session: select class-section, subject, date and time, duration, platform (Google Meet / Zoom), and enter a meeting link (manual link entry — OAuth integration for auto-creation is a Phase 4 enhancement)
- Recurring sessions are supported: teacher sets a recurrence (daily, weekly on Mon/Wed/Fri, etc.) and the system creates all sessions in one action
- All scheduled sessions appear on the class timetable as special "Online Class" events (visible in the timetable grid in Academics module)
- Students and parents see live class sessions in their portal/app with a "Join Now" button that becomes active 5 minutes before start time
- Teachers can start a session (marks it as started), end it (marks it as ended), and mark attendance per student (who joined / did not join)
- Optional: recording URL can be added after the session (YouTube/Drive link) so students can watch later
- Admins and principals can view all scheduled live class sessions across classes and teachers
- Session reports: per-teacher session count, per-class session frequency, student join rates
- All pages: skeleton loaders, empty states, toast feedback

## Out of scope
- Building a native video conferencing system (use Google Meet / Zoom links)
- Automated Google Meet / Zoom API integration for room creation (Phase 4 enhancement — OAuth)
- AI transcription or summary of class recordings (future)
- Interactive whiteboard (future)
- Breakout rooms management within SchoolOS (handled by the video platform)

## Tasks

1. **DB migration — live classes tables** — Create migration `022-live-classes.ts` with:
   - `live_class_sessions`: `(id UUID PK, school_id UUID NOT NULL, class_section_id UUID NOT NULL FK class_sections, subject_id UUID NOT NULL FK subjects, academic_year_id UUID NOT NULL FK academic_years, timetable_slot_id UUID NULL FK timetable_slots, title VARCHAR(300) NOT NULL, description TEXT NULL, platform ENUM('google_meet','zoom','teams','other') NOT NULL, meeting_link TEXT NOT NULL, meeting_id VARCHAR(200) NULL, meeting_password VARCHAR(100) NULL, host_name VARCHAR(200) NULL, scheduled_at TIMESTAMPTZ NOT NULL, duration_minutes INT NOT NULL, is_recurring BOOLEAN DEFAULT false, recurrence_id UUID NULL FK live_class_recurrences, status ENUM('scheduled','started','completed','cancelled') NOT NULL DEFAULT 'scheduled', started_at TIMESTAMPTZ NULL, ended_at TIMESTAMPTZ NULL, actual_duration_minutes INT NULL, recording_url TEXT NULL, recording_title VARCHAR(300) NULL, notes TEXT NULL, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ NULL)`.
   - Index: `(school_id, class_section_id, scheduled_at)`, `(school_id, created_by, scheduled_at)`, `(school_id, academic_year_id, status)`, `(school_id, recurrence_id)`.
   - `live_class_recurrences`: `(id UUID PK, school_id UUID NOT NULL, recurrence_type ENUM('daily','weekly','custom') NOT NULL, days_of_week INT[] NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, total_sessions_generated INT NOT NULL DEFAULT 0, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Index: `(school_id, created_by)`.
   - `live_class_participants`: `(id UUID PK, school_id UUID NOT NULL, session_id UUID NOT NULL FK live_class_sessions, student_id UUID NOT NULL FK students, enrollment_id UUID NOT NULL FK student_enrollments, joined BOOLEAN NULL, join_time TIMESTAMPTZ NULL, leave_time TIMESTAMPTZ NULL, marked_by UUID NULL FK users, notes TEXT NULL, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`.
   - Unique: `(school_id, session_id, student_id)`. Index: `(school_id, session_id)`, `(school_id, student_id)`.
   - All composite indexes start with `school_id`.

2. **Live class sessions CRUD endpoints** — Core scheduling:
   - `POST /v1/live-classes/sessions` — create a single session. Body: `{ class_section_id, subject_id, academic_year_id, timetable_slot_id?, title, description?, platform, meeting_link, meeting_id?, meeting_password?, host_name?, scheduled_at, duration_minutes, notes? }`. Validates: class-section belongs to school; subject is assigned to class-section; `scheduled_at` is in the future (warning if < 30 min away); meeting_link is a valid URL. Permission: `live_classes.session.create`. PBAC: teacher creates only for own assigned class-sections and subjects. Audit logged.
   - `GET /v1/live-classes/sessions` — list; filters: `class_section_id`, `subject_id`, `academic_year_id`, `status`, `platform`, `created_by`, `from_datetime`, `to_datetime`; sort: `scheduled_at ASC` (default). Paginated. Permission: `live_classes.session.view`.
   - `GET /v1/live-classes/sessions/:id` — full session detail with participant count. Permission: `live_classes.session.view`.
   - `PATCH /v1/live-classes/sessions/:id` — update; only in `scheduled` or `started` status (limited fields in started). Permission: `live_classes.session.update`. Audit logged.
   - `DELETE /v1/live-classes/sessions/:id` — soft delete; only in `scheduled` status. Emits `live_class.session_cancelled`. Permission: `live_classes.session.delete`. Audit logged.
   - Full endpoint folders for each.

3. **Recurring session creation endpoint** — `POST /v1/live-classes/sessions/recurring` — creates multiple sessions based on a recurrence rule. Body: `{ recurrence: { type: 'weekly', days_of_week: [1,3,5], start_date, end_date }, session_template: { class_section_id, subject_id, title, platform, meeting_link, scheduled_time, duration_minutes, ... } }`. Creates `live_class_recurrences` record first, then generates all sessions (max 52 sessions per recurrence, ~1 year of weekly sessions). Returns `{ sessions_created: N, recurrence_id }`. **Requires `Idempotency-Key` header**. Permission: `live_classes.session.create`. Full endpoint folder.

4. **Session lifecycle endpoints** — Status management:
   - `POST /v1/live-classes/sessions/:id/start` — teacher marks session as started. Sets `status = 'started'`, `started_at = now()`. Emits `live_class.session_started` (Notification Engine sends push/WhatsApp to enrolled students/parents with meeting link — Phase 4). Permission: `live_classes.session.manage`. PBAC: only the teacher who created the session or admin.
   - `POST /v1/live-classes/sessions/:id/end` — marks session as completed. Body: `{ actual_duration_minutes? }`. Sets `status = 'completed'`, `ended_at = now()`. Permission: `live_classes.session.manage`.
   - `POST /v1/live-classes/sessions/:id/cancel` — body: `{ reason }`. Sets `status = 'cancelled'`. Emits `live_class.session_cancelled`. Permission: `live_classes.session.manage`.
   - `POST /v1/live-classes/sessions/:id/add-recording` — after session, teacher adds recording link. Body: `{ recording_url, recording_title? }`. Permission: `live_classes.session.manage`.
   - Full endpoint folders for each.

5. **Participant attendance endpoints** — Student join tracking:
   - `POST /v1/live-classes/sessions/:sessionId/participants/bulk-mark` — teacher marks which students joined. Body: `{ participants: [{ student_id, joined, join_time?, leave_time?, notes? }] }`. Upserts records. Only allowed when session status is `started` or `completed`. **Requires `Idempotency-Key` header**. Permission: `live_classes.attendance.mark`. PBAC: teacher who owns the session or admin.
   - `GET /v1/live-classes/sessions/:sessionId/participants` — list all enrolled students with join status. Returns: `{ session_id, total_enrolled, joined, not_joined, students: [{ student_id, name, roll_number, joined, join_time, leave_time }] }`. Permission: `live_classes.attendance.view`.
   - Full endpoint folders.

6. **Student-facing sessions endpoint** — Portal and app:
   - `GET /v1/live-classes/my-sessions?student_id=uuid&from_datetime=&to_datetime=&status=` — returns live class sessions for a student's enrolled class-sections. Includes `is_join_active` boolean (true when `scheduled_at - 5 min <= now() <= scheduled_at + duration`). PBAC: student sees own; parent sees children. Permission: `live_classes.session.view`.
   - Full endpoint folder. Used by Parent Portal and student app.

7. **Session analytics and reports** — `GET /v1/live-classes/reports/summary?academic_year_id=uuid&class_section_id=uuid&from_date=&to_date=` — Returns: `{ total_sessions, completed, scheduled, cancelled, total_hours_conducted, sessions_by_subject: [{ subject, count }], top_teachers: [{ teacher, count }], average_student_join_rate }`. Permission: `live_classes.report.view`. Full endpoint folder.

8. **Live Classes NestJS module** — Create `LiveClassesModule` in `backend/src/modules/live-classes/`. Entities: `LiveClassSessionEntity`, `LiveClassRecurrenceEntity`, `LiveClassParticipantEntity`. Import: `AcademicsModule`, `StudentsModule`. Export `LiveClassSessionService` (used by Parent Portal). Register in `AppModule`. Create all entity files and module.ts.

9. **Permissions registration** — Add to `backend/src/config/permissions.ts`:
   - `live_classes.session.view`, `live_classes.session.create`, `live_classes.session.update`, `live_classes.session.delete`, `live_classes.session.manage`
   - `live_classes.attendance.view`, `live_classes.attendance.mark`
   - `live_classes.report.view`
   Default: `super_admin`, `admin`, `principal` — all. `teacher` — session.view/create/update/delete/manage (own class-sections PBAC), attendance.view/mark (own sessions). `student` — session.view (own classes PBAC). `parent` — session.view (children PBAC).

10. **Frontend — Live classes schedule page** (`/dashboard/live-classes`) — Teacher and admin view:
    - **View toggle**: Calendar view (week/month with session blocks) and List view (table).
    - **Calendar view**: Week calendar with time grid. Sessions shown as colored blocks (color by subject). Click session → details popover with join link, student count, start/end buttons.
    - **List view**: Table — Title, Class-Section, Subject, Platform badge (Google Meet / Zoom chip with icon), Scheduled Date/Time, Duration, Status badge, Actions.
    - **Top bar**: Date range picker, Class-Section filter, Subject filter, Platform filter, "Schedule Class" button, "Schedule Recurring" button.
    - Upcoming sessions section and Past sessions section (tabs or date divider).
    - Skeleton loader. Empty state: "No live classes scheduled."

11. **Frontend — Schedule live class form** (slide-over drawer):
    - **Basic**: Title, Class-Section (select — filtered by teacher's assignments), Subject (cascades from class-section), Description (optional).
    - **Meeting details**: Platform selector (radio: Google Meet / Zoom / Other with icons), Meeting link (URL input), Meeting ID (optional), Password (optional).
    - **Timing**: Date (date picker), Start time (time picker), Duration (select: 30/45/60/90/120 min).
    - **Recurrence toggle** (off by default): When enabled — Recurrence type (weekly), Days of week (multi-checkboxes Mon–Sun), End date.
    - React Hook Form + Zod. Inline validation. Loading state on submit.

12. **Frontend — Session detail page** (`/dashboard/live-classes/:sessionId`) — Full detail view:
    - **Header**: Title, Class-Section, Subject, Platform chip, Scheduled time, Duration, Status badge.
    - **Meeting info card**: Meeting link (clickable), Meeting ID, Password. "Copy Link" button. "Join" button (opens link in new tab).
    - **Session controls** (teacher/admin): Start Session button (green, only if scheduled + time within 30 min). End Session button (red, only if started). Cancel button (only if scheduled). Add Recording button.
    - **Participants tab**: Student join status table. Columns: Roll No, Name, Joined (checkbox toggle), Join Time, Leave Time. "Save Attendance" button. Skeleton loader. Empty state: "No participants marked."
    - **Recording section**: Shows recording URL (if added) with "Watch Recording" button. "Add Recording" form (URL + title).

13. **Frontend — Student/Parent session view** (`/dashboard/live-classes/my-sessions`) — Student's upcoming and past sessions:
    - Today's sessions prominently at top with "Join Now" button (active 5 min before). Timer countdown chip.
    - Upcoming sessions list (next 7 days). Past sessions list with recording link button (if available).
    - Session card: subject chip, title, teacher name, time, duration, platform icon, join/recording button.

14. **Frontend — Live classes navigation** — Add "Live Classes" to sidebar:
    - "Schedule" — `/dashboard/live-classes` (teacher/admin)
    - "My Classes" — `/dashboard/live-classes/my-sessions` (student/parent)
    Permission guard: `live_classes.session.view`.

15. **Seed live classes data** — Update `seed.ts` to:
    - Create 1 scheduled live class session: "Mathematics Online Class", Grade 1-A, Mathematics subject, Google Meet platform, meeting link `https://meet.google.com/demo-link`, scheduled 2 days from now at 10:00 AM, 45 minutes.
    - Do not create participants (marked during actual session).

## Relevant files
- `backend/src/modules/live-classes/`
- `backend/src/modules/live-classes/entities/live-class-session.entity.ts`
- `backend/src/modules/live-classes/entities/live-class-recurrence.entity.ts`
- `backend/src/modules/live-classes/entities/live-class-participant.entity.ts`
- `backend/src/database/migrations/022-live-classes.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `backend/src/modules/academics/entities/class-section.entity.ts`
- `backend/src/modules/academics/entities/timetable-slot.entity.ts`
- `backend/src/modules/students/entities/student-enrollment.entity.ts`
- `backend/src/modules/platform/audit/audit.service.ts`
- `frontend/src/app/(dashboard)/live-classes/page.tsx`
- `frontend/src/app/(dashboard)/live-classes/[sessionId]/page.tsx`
- `frontend/src/app/(dashboard)/live-classes/my-sessions/page.tsx`
- `frontend/src/components/modules/live-classes/SessionCalendar.tsx`
- `frontend/src/components/modules/live-classes/SessionCard.tsx`
- `frontend/src/components/modules/live-classes/ScheduleForm.tsx`
- `frontend/src/components/modules/live-classes/ParticipantsTable.tsx`
- `frontend/src/hooks/use-live-classes.ts`
- `documentation/api-style-guide.md`
- `documentation/coding-guidelines.md`
- `documentation/agent-rules.md`
- `documentation/route-template.md`
