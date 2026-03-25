# Phase 2 — Annual Calendar Module (Module 23)

## What & Why
Build the Annual Calendar module — the school's master timeline system. This is the last remaining Layer 2 Core Domain module. Every operational module (Attendance, Examinations, Timetable, HR, Fees, Communication) consults the calendar to resolve working days, holidays, and academic term boundaries. Without a canonical calendar, attendance percentages, late-fee triggers, exam scheduling, and substitution registers have no reference frame. Must be fully configurable per school — Indian schools vary significantly in their academic calendars (April–March vs. June–May, varying state holidays, different examination cycles).

## Done looks like
- Super Admin can define the school's academic calendar for any academic year: term start/end dates, working days, exam periods, public holidays, and school events
- Multiple event types are supported: `public_holiday`, `school_holiday`, `exam_week`, `school_event`, `sports_day`, `cultural_event`, `parent_teacher_meeting`, `working_saturday` (override), `other`
- Working days are configured per school — default Mon–Fri; Super Admin can mark specific Saturdays as working days (compensatory) or mark any day as a holiday
- Holidays can be created in bulk (e.g., "add all Gazetted holidays for Maharashtra 2025–26") by importing a predefined state list or manually adding one by one
- The calendar exposes a public-facing API used by: Attendance module (skip holiday marking), Timetable module (show holiday on schedule), Parent Portal (event calendar), Notification engine (send event reminders)
- All calendar events are visible on the parent portal and mobile app via the timetable/events feed
- Full frontend calendar view exists at `/dashboard/calendar` — monthly calendar grid with event chips, day detail sidebar, and event management panel
- Events can optionally trigger school-wide push notifications/announcements (uses Notification Engine event in Phase 4)
- Skeleton loaders, empty states, toast feedback on all mutations

## Out of scope
- Attendance marking (Attendance module)
- Timetable slot scheduling (Academics module — timetable submodule)
- Examination scheduling (Examinations module — consults this calendar)
- Class-specific events (e.g., only Grade 10 has board exams) — use Examinations module for that
- Live class scheduling (Live Classes module)

## Tasks

1. **DB migration — calendar tables** — Create migration `014-annual-calendar.ts` with:
   - `calendar_events`: `(id UUID PK, school_id UUID NOT NULL, academic_year_id UUID NOT NULL FK academic_years, title VARCHAR(200) NOT NULL, description TEXT NULL, event_type ENUM('public_holiday','school_holiday','exam_week','school_event','sports_day','cultural_event','parent_teacher_meeting','working_saturday','other') NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, is_full_day BOOLEAN DEFAULT true, start_time TIME NULL, end_time TIME NULL, affects_attendance BOOLEAN DEFAULT true, is_recurring BOOLEAN DEFAULT false, recurrence_rule TEXT NULL, is_published BOOLEAN DEFAULT false, color_hex VARCHAR(7) NULL, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), deleted_at TIMESTAMPTZ NULL)`. 
   - Check constraint: `end_date >= start_date`. 
   - Check constraint: `(is_full_day = true AND start_time IS NULL AND end_time IS NULL) OR (is_full_day = false AND start_time IS NOT NULL AND end_time IS NOT NULL)`.
   - Index: `(school_id, academic_year_id, start_date)`, `(school_id, event_type, start_date)`, `(school_id, start_date, end_date)` for range queries, `(school_id, affects_attendance)` for attendance module lookups.
   - `calendar_working_day_config`: `(id UUID PK, school_id UUID NOT NULL, academic_year_id UUID NOT NULL FK academic_years, monday BOOLEAN DEFAULT true, tuesday BOOLEAN DEFAULT true, wednesday BOOLEAN DEFAULT true, thursday BOOLEAN DEFAULT true, friday BOOLEAN DEFAULT true, saturday BOOLEAN DEFAULT false, sunday BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique on `(school_id, academic_year_id)`.
   - All composite indexes start with `school_id`.

2. **Working day config endpoint** — `GET /v1/calendar/working-day-config` (returns config for active or specified academic year), `PUT /v1/calendar/working-day-config` (upsert — create or replace; body includes `academic_year_id` and day booleans). Permission: `calendar.settings.manage`. Default roles: `super_admin`, `admin`. Endpoint folder: `working-day-config/`. Files: route.md, controller.ts, service.ts, dto/request.dto.ts, dto/response.dto.ts, permissions.ts, tests/service.spec.ts, examples/.

3. **Calendar Events CRUD endpoints** — Full endpoint folder for each:
   - `POST /v1/calendar/events` — create event; validates `end_date >= start_date`; validates `start_time < end_time` when `is_full_day = false`; validates `academic_year_id` belongs to this school; emits `calendar.event_created`. Returns 201. Permission: `calendar.event.create`. Audit logged.
   - `GET /v1/calendar/events` — paginated list; query params: `academic_year_id` (required), `month` (YYYY-MM, optional — filter to a calendar month), `event_type[]` (multi-value filter), `affects_attendance` (boolean), `is_published` (boolean), `from_date` (DATE), `to_date` (DATE), `sort` (default: `start_date ASC`). Returns flat list with meta. Permission: `calendar.event.view`.
   - `GET /v1/calendar/events/:id` — single event. Permission: `calendar.event.view`.
   - `PATCH /v1/calendar/events/:id` — partial update; re-validates date constraints; emits `calendar.event_updated`. Permission: `calendar.event.update`. Audit logged.
   - `DELETE /v1/calendar/events/:id` — soft delete; emits `calendar.event_deleted`. Permission: `calendar.event.delete`. Audit logged.
   - `POST /v1/calendar/events/:id/publish` — sets `is_published = true`; makes event visible to parents/students; emits `calendar.event_published`. Permission: `calendar.event.publish`.
   - `POST /v1/calendar/events/:id/unpublish` — sets `is_published = false`. Permission: `calendar.event.publish`.

4. **Bulk holiday import endpoint** — `POST /v1/calendar/events/bulk-import` — Accepts JSON body: `{ academic_year_id, events: [{ title, start_date, end_date, event_type, description? }] }`. Max 100 events per request. Validates each event. Inserts all valid events; returns summary: `{ imported: N, skipped: [], errors: [] }`. Does NOT use BullMQ (synchronous, max 100 rows). Requires `Idempotency-Key` header. Permission: `calendar.event.create`. Returns 200 with summary object (not 201 since it's a batch result). Endpoint folder: `bulk-import-events/`.

5. **Holiday check utility endpoint** — `GET /v1/calendar/is-working-day?date=YYYY-MM-DD&academic_year_id=uuid` — Returns `{ date, is_working_day, reason? }`. Used internally by Attendance and Fees modules. Returns 200. No body. Permission: `calendar.event.view` (or authenticated — any role). This endpoint should be heavily cached: Redis key `{school_id}:calendar:working_day:{date}`, TTL 24 hours. Invalidated when any event covering that date is created/updated/deleted.

6. **Calendar summary endpoint** — `GET /v1/calendar/summary?academic_year_id=uuid&month=YYYY-MM` — Returns: `{ total_working_days: N, holidays: N, events: N, working_day_breakdown: { mon: N, tue: N, ... }, events_this_month: [{ id, title, event_type, start_date, end_date, color_hex }] }`. Used by dashboard widgets and attendance reports. Permission: `calendar.event.view`. Redis cache: `{school_id}:calendar:summary:{year}:{month}`, TTL 1 hour.

7. **Calendar NestJS module** — Create `CalendarModule` in `backend/src/modules/calendar/`. Register entities: `CalendarEventEntity`, `WorkingDayConfigEntity`. Register in `AppModule`. Export `CalendarService` (needed by Attendance, Examinations, Fees modules for working-day lookups). Wire all controllers and services. Create `calendar.module.ts`, `entities/calendar-event.entity.ts`, `entities/working-day-config.entity.ts`.

8. **Permissions registration** — Add to `backend/src/config/permissions.ts`:
   - `calendar.event.view`
   - `calendar.event.create`
   - `calendar.event.update`
   - `calendar.event.delete`
   - `calendar.event.publish`
   - `calendar.settings.manage`
   Default role assignments: `super_admin` and `admin` get all. `principal` gets view + publish. `teacher` gets view only.

9. **Frontend — Calendar page** (`/dashboard/calendar`) — Full-page calendar application:
   - **Top bar**: Academic Year selector (defaults to current), Month navigation arrows (← →), Today button, "Add Event" primary button, "Bulk Import" secondary button.
   - **Calendar grid** (main area): Monthly calendar grid, 7 columns (Mon–Sun), 4–6 rows. Each day cell shows: date number, holiday indicator (red dot), event chips (color-coded by event_type). Clicking a day opens the day detail sidebar. Working Saturday cells have a subtle background difference. Today highlighted with primary color ring.
   - **Day detail sidebar** (right panel, 320px): Slides in when a date is clicked. Shows: date heading, "Working day" or "Holiday/Non-working" status badge, list of all events for that day with type chip, time (if not full-day), description preview, Edit/Delete action icons per event. "Add event on this day" button pre-fills the form with the selected date.
   - **Event form** (slide-over drawer): Title (required), Event type (select with color preview), Start date (date picker), End date (date picker), Full day toggle (if off: show start_time + end_time pickers), Affects attendance toggle, Description (textarea), Color hex (color picker). React Hook Form + Zod validation. Submit shows loading. Toast on success/error.
   - **Bulk Import dialog**: JSON paste area or file upload (JSON). Preview table of events to import. Confirm button. Result summary after import.
   - **Event type legend** below calendar grid with color chips.
   - Skeleton loader: grid shimmer on initial load. Empty state for months with no events: "No events this month. Add a holiday or school event."

10. **Frontend — Calendar mini-widget** — Reusable `<CalendarMiniWidget>` component used on the main dashboard home page. Shows current month in a compact 3-row grid (no day names). Dots on days with events. Click → navigates to full calendar page. Skeleton loader. Props: `academicYearId`. Export from `components/modules/calendar/`.

11. **Frontend — Calendar navigation** — Add "Calendar" to dashboard sidebar under an "Administration" section. Icon: Calendar. Route: `/dashboard/calendar`. Permission guard: `calendar.event.view`. Show active event count badge.

12. **Seed calendar data** — Update `seed.ts` to:
    - Create a `WorkingDayConfig` for the demo school (2025–26 academic year): Mon–Fri working, Saturday off.
    - Create 8 sample calendar events for 2025–26:
      - Independence Day (15 Aug 2025, public_holiday, affects_attendance: true)
      - Diwali Vacation (20–24 Oct 2025, school_holiday, affects_attendance: true)
      - Republic Day (26 Jan 2026, public_holiday, affects_attendance: true)
      - Annual Sports Day (14 Feb 2026, sports_day, affects_attendance: false)
      - Parent-Teacher Meeting (22 Nov 2025, parent_teacher_meeting, affects_attendance: false)
      - Half-Yearly Exams (24 Nov – 5 Dec 2025, exam_week, affects_attendance: false)
      - Annual Day (15 Mar 2026, school_event, affects_attendance: false)
      - Summer Vacation start (1 Apr 2026, school_holiday, affects_attendance: true)
    - All events marked `is_published: true`.

## Relevant files
- `backend/src/modules/calendar/`
- `backend/src/modules/calendar/entities/calendar-event.entity.ts`
- `backend/src/modules/calendar/entities/working-day-config.entity.ts`
- `backend/src/modules/calendar/endpoints/working-day-config/`
- `backend/src/modules/calendar/endpoints/events/`
- `backend/src/modules/calendar/endpoints/bulk-import-events/`
- `backend/src/database/migrations/014-annual-calendar.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `backend/src/modules/academics/entities/academic-year.entity.ts`
- `backend/src/modules/platform/audit/audit.service.ts`
- `frontend/src/app/(dashboard)/calendar/page.tsx`
- `frontend/src/components/modules/calendar/CalendarGrid.tsx`
- `frontend/src/components/modules/calendar/DayDetailSidebar.tsx`
- `frontend/src/components/modules/calendar/EventForm.tsx`
- `frontend/src/components/modules/calendar/CalendarMiniWidget.tsx`
- `frontend/src/hooks/use-calendar.ts`
- `documentation/api-style-guide.md`
- `documentation/coding-guidelines.md`
- `documentation/agent-rules.md`
- `documentation/route-template.md`
