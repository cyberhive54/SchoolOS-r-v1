# Phase 4 — Parent Portal & Mobile App (Module 33)

## What & Why
Build the Parent Portal — the primary parent-facing interface of SchoolOS. In Indian K-12 schools, parents are the primary stakeholders for financial (fees), academic (results, attendance), and administrative (leave, transport, notices) matters. Historically they must call the school office or visit in person for routine information — the portal eliminates this completely. A single parent login gives access to all linked children's data: real-time attendance, exam results, fee ledger and online payment, homework, circulars, report cards (PDF download), timetable, and transport location. The portal is web-first (browser-based, no install required) and fully mobile-responsive. Native Android and iOS apps (Expo/React Native) are a parallel deliverable consuming the same API. This module defines the portal configuration layer (what schools enable), the parent-facing composite data APIs, and the mobile app spec. Actual data is owned by operational modules — this module aggregates and presents.

## Done looks like
- Parent can log in (via Replit Auth or phone+OTP), see all linked children in a switcher, and access all permitted data without calling the school.
- Attendance view: daily and monthly attendance for each child; calendar view (P/A/L/E per day); monthly summary card; current attendance % badge; generates WhatsApp/email alert if child is absent (via Notification Engine).
- Fee ledger: all invoices with due amounts, overdue badges; online payment via Razorpay (redirects to gateway, webhook updates payment status); fee receipt download (PDF); payment history.
- Exam results: marks per subject per exam group; grade, rank, class average shown alongside; report card PDF download; progress chart (marks trend across terms).
- Homework: upcoming and submitted homework per subject; mark as seen (optional parent acknowledgment).
- Timetable: class timetable for the week (read-only); today's period view on dashboard.
- Circulars & Notices: list of school circulars and notices with download (PDF); signed/unsigned status (school can require digital acknowledgment).
- Transport ETA: if transport module is active, parent sees assigned bus route, stop, and live ETA (mocked until GPS integration).
- Profile update request: parent submits change request (address, phone, blood group); admin approves before applying.
- Dashboard: action center highlights pending fees, unsigned circulars, upcoming exam dates, and homework due.
- Notification preferences: parent controls which event types trigger SMS/WhatsApp/Email/Push per child.
- School can configure portal: which modules are enabled, dashboard layout, welcome message.
- Native Android + iOS app (Expo React Native) consuming all of the above APIs — same feature parity as web.

## Out of scope
- Actual sending of notifications (handled by Notification Engine — this module emits events).
- Direct teacher-parent chat (handled by Communication module — Direct Messaging feature).
- Payment gateway setup/configuration (handled by Fees module — Razorpay keys managed there).
- Native app store publishing workflow (separate DevOps task).
- Students accessing their own data via this portal (handled by a separate Student Portal — future).

## Tasks

1. **DB migration 037** — Create migration `037-parent-portal.ts` using `queryRunner.query()` raw SQL. Tables:
   - `parent_portal_configs`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL UNIQUE, enabled_modules TEXT[] NOT NULL DEFAULT '{attendance,fees,exams,homework,circulars,timetable}', allow_profile_update_requests BOOLEAN NOT NULL DEFAULT true, require_approval_for_profile_updates BOOLEAN NOT NULL DEFAULT true, dashboard_layout_type VARCHAR(20) NOT NULL DEFAULT 'grid' CHECK (dashboard_layout_type IN ('grid','list','compact')), welcome_message TEXT NULL, emergency_contact_number VARCHAR(15) NULL, show_class_average_in_results BOOLEAN NOT NULL DEFAULT true, show_rank_in_results BOOLEAN NOT NULL DEFAULT true, allow_fee_payment_online BOOLEAN NOT NULL DEFAULT false, razorpay_key_id VARCHAR(100) NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`.
   - `parent_child_dashboard_settings`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, parent_user_id UUID NOT NULL REFERENCES users(id), student_id UUID NOT NULL REFERENCES students(id), favorite_widgets TEXT[] NOT NULL DEFAULT '{}', notification_prefs JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Unique: `(school_id, parent_user_id, student_id)`. Index: `(school_id, parent_user_id)`.
   - `parent_profile_update_requests`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, student_id UUID NOT NULL REFERENCES students(id), parent_user_id UUID NOT NULL REFERENCES users(id), requested_changes JSONB NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')), reviewed_by UUID NULL REFERENCES users(id), review_note TEXT NULL, reviewed_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Index: `(school_id, status)`, `(school_id, student_id)`.
   - `portal_circular_acknowledgments`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, circular_id UUID NOT NULL REFERENCES circulars(id), student_id UUID NOT NULL REFERENCES students(id), parent_user_id UUID NOT NULL REFERENCES users(id), acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Unique: `(school_id, circular_id, student_id)`. Index: `(school_id, circular_id)`.
   - All composite indexes start with `school_id`.

2. **School Portal Config Endpoints**:
   - `GET /v1/parent-portal/config` — school's portal settings; permission: `parent_portal.settings.view`.
   - `PATCH /v1/parent-portal/config` — upsert config; body: all fields of parent_portal_configs; permission: `parent_portal.settings.manage`; audit logged.
   - `GET /v1/public/parent-portal/config?school_id` — public endpoint (no auth); returns `{ school_name, logo_url, welcome_message, enabled_modules, allow_fee_payment_online }`; Redis cache 30 min. Used by login page to brand the portal.

3. **Parent Dashboard & Child Switcher Endpoints** (all require authenticated parent + PBAC: must be linked guardian):
   - `GET /v1/parent-portal/my-children` — list all students linked to the authenticated parent in this school; returns `[{ student_id, name, class_section, photo_url, roll_number }]`; permission: any authenticated parent.
   - `GET /v1/parent-portal/students/:studentId/dashboard` — composite dashboard for one child; aggregates from all operational modules based on school's `enabled_modules` config:
     `{ student: { name, photo_url, class_section, roll_number }, attendance: { today_status, current_month_percent, last_7_days: [...] }, fees: { total_due, overdue_amount, last_payment_date, next_due_date }, exam_results: { latest_exam_group_name, latest_exam_percent, rank_in_class }, homework: { pending_count, due_today_count }, notices: { unread_count }, timetable_today: [{ period, subject, teacher }], transport: { bus_route, stop_name, eta_minutes } }`. Redis cache key `{school_id}:parent_dashboard:{student_id}`, TTL 5 min. Permission: `parent_portal.student.view` (PBAC).

4. **Attendance View Endpoints** (PBAC: linked guardian only):
   - `GET /v1/parent-portal/students/:studentId/attendance?month&year` — monthly attendance: `{ month, year, summary: { present, absent, late, excused, total_days, percent }, days: [{ date, status: 'P'|'A'|'L'|'E'|'H' }] }`. Permission: `parent_portal.student.view`.
   - `GET /v1/parent-portal/students/:studentId/attendance/annual?academic_year_id` — full year summary with month-by-month breakdown. Permission: `parent_portal.student.view`.

5. **Fee View & Payment Endpoints** (PBAC: linked guardian only):
   - `GET /v1/parent-portal/students/:studentId/fees?academic_year_id?` — all invoices with status (paid/partial/overdue/pending); `{ invoices: [...], total_due, total_paid, outstanding_balance }`. Permission: `parent_portal.student.view`.
   - `GET /v1/parent-portal/students/:studentId/fees/receipts` — list of all payment receipts with download URL (PDF). Permission: `parent_portal.student.view`.
   - `POST /v1/parent-portal/students/:studentId/fees/initiate-payment` — body: `{ invoice_ids[], amount }`; calls Razorpay order creation; returns `{ razorpay_order_id, key_id, amount_paise }`; Idempotency-Key header required; permission: `parent_portal.student.view`. (Actual payment capture handled by Fees module Razorpay webhook — this just creates the order.)
   - `GET /v1/parent-portal/students/:studentId/fees/receipts/:receiptId/download` — streams PDF receipt; permission: `parent_portal.student.view`.

6. **Exam Results & Report Card Endpoints** (PBAC: linked guardian only):
   - `GET /v1/parent-portal/students/:studentId/exams?academic_year_id` — list of exam groups with results for the student; `[{ exam_group_name, exam_type, date, subjects: [{ name, max_marks, marks_obtained, grade }], total_percent, rank_in_class, class_average_percent }]`. Permission: `parent_portal.student.view`.
   - `GET /v1/parent-portal/students/:studentId/exams/:examGroupId/report-card` — returns PDF report card; triggers report card generation from Examinations module (cached 24 hr). Permission: `parent_portal.student.view`.
   - `GET /v1/parent-portal/students/:studentId/exams/progress?academic_year_id` — term-wise % trend data for charting (array of `{ term_name, percent }`). Permission: `parent_portal.student.view`.

7. **Homework, Circulars & Timetable Endpoints** (PBAC: linked guardian only):
   - `GET /v1/parent-portal/students/:studentId/homework?status=pending|submitted|all&limit=20` — list of homework assignments for the student's class with due date, subject, description, submission status. Permission: `parent_portal.student.view`.
   - `GET /v1/parent-portal/students/:studentId/circulars?academic_year_id?&limit=20` — school circulars and notices relevant to the student's class; includes `is_acknowledged` field; permission: `parent_portal.student.view`.
   - `POST /v1/parent-portal/students/:studentId/circulars/:circularId/acknowledge` — records acknowledgment in `portal_circular_acknowledgments`; emits `parent_portal.circular_acknowledged`; permission: `parent_portal.student.view`; Idempotency-Key header required.
   - `GET /v1/parent-portal/students/:studentId/timetable` — class timetable for the current week; grouped by day; each period: subject, teacher name, room; permission: `parent_portal.student.view`.
   - `GET /v1/parent-portal/students/:studentId/documents` — list of downloadable documents: report cards, TC (if issued), bonafide certificates, fee receipts; each with type and download URL; permission: `parent_portal.student.view`.

8. **Profile Update Request Endpoints**:
   - `POST /v1/parent-portal/students/:studentId/profile-update` — body: `{ requested_changes: { address?, phone?, blood_group?, emergency_contact?, ... } }`; creates pending request; emits `parent_portal.profile_update_requested` (Notification Engine sends alert to admin); permission: `parent_portal.student.view` (PBAC). One pending request per student at a time (validate).
   - `GET /v1/parent-portal/admin/profile-requests?status?` — admin view; paginated; permission: `parent_portal.requests.manage`.
   - `POST /v1/parent-portal/admin/profile-requests/:id/review` — body: `{ status: 'approved'|'rejected', review_note? }`; if approved → applies changes to student record in Students module; audit logged; emits `parent_portal.profile_update_reviewed`; permission: `parent_portal.requests.manage`.

9. **Notification Preferences Endpoints** (PBAC: linked guardian only):
   - `GET /v1/parent-portal/students/:studentId/notification-preferences` — current preferences (channels per event type per child); reads from Notification Engine's `user_preferences` table.
   - `PATCH /v1/parent-portal/students/:studentId/notification-preferences` — body: `{ prefs: [{ event_type, channels: { sms, whatsapp, email, push } }] }`; updates `user_preferences` via NotificationEngineService; permission: `parent_portal.student.view` (PBAC).

10. **NestJS Module** — Create `ParentPortalModule` in `backend/src/modules/parent-portal/`:
    - Entities: `ParentPortalConfigEntity`, `ParentChildDashboardSettingEntity`, `ParentProfileUpdateRequestEntity`, `PortalCircularAcknowledgmentEntity`.
    - Import: `StudentsModule`, `AcademicsModule`, `AttendanceModule`, `ExaminationsModule`, `FeesModule`, `HomeworkModule`, `CommunicationModule`, `TransportModule`, `NotificationEngineModule`.
    - `ParentDashboardService` — aggregates data from all imported modules; all reads; no writes to other modules' tables.
    - Export `ParentPortalConfigService` (used by CMS module for portal branding link).
    - Register in `AppModule`.

11. **Permissions** — Register in `backend/src/config/permissions.ts`:
    - `parent_portal.settings.view`, `parent_portal.settings.manage` — admin/super_admin only.
    - `parent_portal.student.view` — parent role only; PBAC: parent must be linked guardian of the student.
    - `parent_portal.requests.manage` — admin/principal.
    - Note: parents do NOT have `parent_portal.settings.*` permissions. Children do NOT access via parent portal.

12. **Frontend Pages — Web Portal** (Next.js 15, app router, `/portal/` route prefix, separate from admin dashboard):
    - Login page (`/portal/login`): School-branded login (logo + school name from public config endpoint). Phone+OTP login or Replit Auth. "Linked to multiple children?" notice.
    - Dashboard (`/portal/dashboard`): Child switcher (tab/dropdown at top if multiple children). Action Center: priority alerts (overdue fees, unsigned circulars, today absent). Widget grid (configurable): Attendance this month card, Pending Fees card, Last Exam % card, Upcoming Homework card, Today's Timetable mini-view, Latest Notice. Mobile-first layout (single column on mobile, 2-col on tablet, 3-col on desktop). Shimmer loading.
    - Attendance (`/portal/attendance`): Monthly calendar view (color: green=P, red=A, yellow=L, grey=Holiday). Month selector (prev/next). Summary row: X present / Y absent / Z late. Annual summary accordion.
    - Fees (`/portal/fees`): Invoice list with status badge (Paid/Overdue/Due). Total outstanding banner. "Pay Now" button (if online payment enabled) — opens Razorpay checkout. Payment history tab. Receipt download button per payment.
    - Exam Results (`/portal/results`): Exam group selector. Results table: subject, marks, max, grade, remarks. Class average and rank shown (if school enables). Performance trend line chart (recharts). Download Report Card PDF button.
    - Homework (`/portal/homework`): Upcoming tab (due this week, sorted by date). All tab with search. Subject filter chips. Due date badge (red if overdue).
    - Circulars (`/portal/circulars`): Chronological list. Unread badge. Acknowledge button (if acknowledgment required by school). PDF download.
    - Timetable (`/portal/timetable`): Week grid. Today highlighted. Period blocks: subject + teacher name. Mobile: swipeable days.
    - Documents (`/portal/documents`): Card list by type (Report Cards, Certificates, Receipts). Download button.
    - Profile (`/portal/profile`): Child's photo, name, class, roll, DOB, blood group, address, emergency contacts (read-only). "Request Changes" button → modal form.
    - Notification Settings (`/portal/settings`): Per-child, per-event-type, per-channel toggles. Quiet hours time picker.

13. **Mobile App Spec** (Expo React Native — separate `apps/parent-mobile/` workspace):
    - All features above adapted for native mobile UX.
    - Push notifications via FCM (device token registered through `POST /v1/notifications/fcm-token`).
    - Bottom tab navigator: Home | Fees | Academics | Notices | More.
    - Biometric login (after first OTP login, enable FaceID/fingerprint).
    - Offline mode: last-fetched attendance and timetable cached locally (AsyncStorage).
    - Pull-to-refresh on all screens.
    - Deep links: fee payment push notification → opens Fees screen with pending invoice highlighted.

14. **Seed Data**:
    - Default `parent_portal_configs` for demo school (enabled_modules: all, allow_fee_payment_online: false, show_class_average: true, show_rank: true).
    - `parent_child_dashboard_settings` for demo parent user linked to demo student (notification_prefs: SMS + WhatsApp for attendance and fees events).
    - 1 pending `parent_profile_update_request` (demo parent requesting address change for demo student).
    - 2 `portal_circular_acknowledgments` (demo parent acknowledged 2 circulars).

## Relevant files
- `backend/src/modules/parent-portal/parent-portal.module.ts`
- `backend/src/modules/parent-portal/services/parent-portal-config.service.ts`
- `backend/src/modules/parent-portal/services/parent-dashboard.service.ts`
- `backend/src/modules/parent-portal/services/profile-update.service.ts`
- `backend/src/modules/parent-portal/entities/parent-portal-config.entity.ts`
- `backend/src/modules/parent-portal/entities/parent-child-dashboard-setting.entity.ts`
- `backend/src/modules/parent-portal/entities/parent-profile-update-request.entity.ts`
- `backend/src/modules/parent-portal/entities/portal-circular-acknowledgment.entity.ts`
- `backend/src/database/migrations/037-parent-portal.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(portal)/dashboard/page.tsx`
- `frontend/src/app/(portal)/attendance/page.tsx`
- `frontend/src/app/(portal)/fees/page.tsx`
- `frontend/src/app/(portal)/results/page.tsx`
- `frontend/src/app/(portal)/homework/page.tsx`
- `frontend/src/app/(portal)/circulars/page.tsx`
- `frontend/src/app/(portal)/timetable/page.tsx`
- `frontend/src/app/(portal)/documents/page.tsx`
- `frontend/src/app/(portal)/profile/page.tsx`
- `frontend/src/app/(portal)/settings/page.tsx`
- `frontend/src/components/portal/ChildSwitcher.tsx`
- `frontend/src/components/portal/AttendanceCalendar.tsx`
- `frontend/src/components/portal/FeeInvoiceCard.tsx`
- `frontend/src/components/portal/ResultsTable.tsx`
- `apps/parent-mobile/` (Expo React Native mobile app)
