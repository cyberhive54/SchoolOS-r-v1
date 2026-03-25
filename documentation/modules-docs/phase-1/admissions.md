# Phase 2 — Admissions Module

## What & Why
Build the Admissions module — the student onboarding pipeline from public enquiry to enrolled student. Layer 7 Administrative Operations. Depends on Students (Layer 2) and Academics (Layer 2) being complete. Supports a public-facing enquiry form and online application form (no login required), plus an internal admission pipeline for staff to review, process, and approve applications. Once approved, a student record is automatically created in the Students module. Board-agnostic.

## Done looks like
- A public enquiry form is accessible at `/apply/:schoolSlug` (no login required) where parents can register initial interest
- A public online application form is accessible at `/apply/:schoolSlug/apply/:sessionId` for formal applications with document upload
- Applicants can check their application status at `/apply/:schoolSlug/status` using their reference number + DOB
- Internal staff can view enquiry pipeline, convert enquiries to applications, review submitted applications, schedule admission tests, and approve/reject
- On approval, a student record is auto-created in the Students module and parent is notified
- Admission sessions (open periods) are configurable per school with academic year, class-wise seat limits, and open/close dates
- All internal pages use skeleton loaders, filters, and toast feedback
- Public forms use a branded minimal layout with the school's theme

## Out of scope
- Fee collection during admission (Fees module handles this)
- Biometric registration
- Online payment gateway (Phase 2.2)

## Tasks

1. **DB migration — admissions** — Create migration `010-admissions.ts` with:
   - `admission_sessions`: `(id, school_id, academic_year_id [FK], name [e.g. "2025-26 Admissions"], open_date, close_date, status ['draft'|'open'|'closed'|'archived'], created_by, created_at, updated_at)`. Index `(school_id, status)`.
   - `admission_session_classes`: `(id, session_id, class_id [FK classes], total_seats [int nullable], reserved_seats [int default 0], created_at)`. Unique on `(session_id, class_id)`.
   - `enquiries`: `(id, school_id, session_id [FK nullable], reference_no [unique per school, auto-generated], student_first_name, student_last_name, date_of_birth, gender, class_applying_for_id [FK classes nullable], guardian_name, guardian_phone, guardian_email [nullable], source ['walk_in'|'online'|'phone'|'referral'|'other'], referral_name [nullable], notes [nullable], status ['new'|'contacted'|'converted'|'not_interested'|'duplicate'], followed_up_by [FK users nullable], followed_up_at [nullable], created_at, updated_at)`. Index `(school_id, status)`. Index `(school_id, reference_no)` unique.
   - `applications`: `(id, school_id, session_id [FK], enquiry_id [FK enquiries nullable], reference_no [unique per school], student_first_name, student_last_name, date_of_birth, gender, blood_group [nullable], religion [nullable], category_id [FK student_categories nullable], guardian_father_name, guardian_father_phone, guardian_father_occupation [nullable], guardian_mother_name [nullable], guardian_mother_phone [nullable], guardian_mother_occupation [nullable], address_line1, city, state, pincode, previous_school [nullable], previous_class [nullable], class_applying_for_id [FK classes], status ['submitted'|'under_review'|'test_scheduled'|'approved'|'rejected'|'waitlisted'|'enrolled'], reviewed_by [FK users nullable], reviewed_at [nullable], rejection_reason [nullable], notes [nullable], submitted_at, created_at, updated_at)`. Index `(school_id, status)`. Index `(school_id, reference_no)` unique.
   - `application_documents`: `(id, application_id, school_id, document_type ['birth_certificate'|'photo'|'previous_marksheet'|'transfer_certificate'|'aadhaar'|'other'], file_url, original_name, uploaded_at)`. Index `(application_id)`.
   - `admission_tests`: `(id, school_id, session_id, application_id [FK], scheduled_date [DATE], scheduled_time [TIME nullable], venue [nullable], status ['scheduled'|'completed'|'no_show'], score [DECIMAL nullable], max_score [DECIMAL nullable], notes [nullable], created_at, updated_at)`. Index `(school_id, application_id)`.
   - `admission_config`: `(id, school_id, auto_reference_prefix [e.g. "ENQ"], require_documents BOOLEAN DEFAULT false, allow_online_applications BOOLEAN DEFAULT true, application_fee_amount [DECIMAL nullable — for Phase 2.2], created_at, updated_at)`. One row per school.

2. **Admission sessions endpoints** —
   - `POST /v1/admissions/sessions`, `GET /v1/admissions/sessions`, `GET /v1/admissions/sessions/:id`, `PATCH /v1/admissions/sessions/:id`, `DELETE /v1/admissions/sessions/:id`
   - `POST /v1/admissions/sessions/:id/open` (change status to 'open'), `POST /v1/admissions/sessions/:id/close`
   - `POST /v1/admissions/sessions/:id/classes` (add class with seat limit), `DELETE /v1/admissions/sessions/:id/classes/:classId`
   Permission: `admissions.session.manage`. Full endpoint folder structure each.

3. **Public enquiry endpoint** — `POST /v1/public/admissions/:schoolSlug/enquiries` — No auth. Rate-limited to 5/hour per IP. Creates enquiry record, generates reference_no (format: `ENQ-YYYYMMDD-XXXX`), sends confirmation email to guardian_email if provided. Returns `{ reference_no, message }`. No global response envelope (public endpoint uses simplified response). Include CORS for all origins on this endpoint only. Route.md must mark this as anonymous/public access.

4. **Public application endpoint** — `POST /v1/public/admissions/:schoolSlug/sessions/:sessionId/applications` — No auth. Validates session is open and class has seats. Accepts JSON + document upload handled separately via presigned URL flow (see task 5). Creates application record with `status = 'submitted'`. Returns `{ reference_no, application_id }`. Rate-limited: 3 applications per IP per hour. Emits `admissions.application_submitted` (notification to admin).

5. **Public document upload endpoint** — `POST /v1/public/admissions/documents/upload-url` — No auth. Body: `{ application_id, document_type, mime_type, file_size }`. Returns presigned upload URL (Firebase/S3). After client uploads, client calls `POST /v1/public/admissions/documents/confirm` with `{ application_id, document_type, upload_key }` to create the `application_documents` record. Rate-limited per IP.

6. **Public status check endpoint** — `GET /v1/public/admissions/:schoolSlug/status?reference_no=ENQ-XXX&dob=YYYY-MM-DD` — No auth. Returns application status and basic info. Strips sensitive internal fields.

7. **Internal enquiry endpoints** —
   - `GET /v1/admissions/enquiries` — list with filters: `filter[status]`, `filter[session_id]`, `filter[class_applying_for_id]`, date range, `q` (name/phone search)
   - `GET /v1/admissions/enquiries/:id`
   - `PATCH /v1/admissions/enquiries/:id` (update status, assign follow-up staff, add notes)
   - `POST /v1/admissions/enquiries/:id/convert` — convert enquiry to application; body optionally pre-fills application data; emits `admissions.enquiry_converted`
   - `POST /v1/admissions/enquiries` — internal staff can create enquiry (walk-in)
   Permission: `admissions.enquiry.view`, `admissions.enquiry.manage`.

8. **Internal application endpoints** —
   - `GET /v1/admissions/applications` — list with filters: status, session, class, date range; paginated; sortable
   - `GET /v1/admissions/applications/:id` — full detail with documents
   - `PATCH /v1/admissions/applications/:id` — update notes, reviewer info
   - `POST /v1/admissions/applications/:id/schedule-test` — schedule admission test; body: `{ date, time, venue }`
   - `POST /v1/admissions/applications/:id/approve` — sets status to `approved`; emits `admissions.application_approved` (notification to parent); does NOT auto-create student yet
   - `POST /v1/admissions/applications/:id/reject` — body: `{ reason }`; emits `admissions.application_rejected`
   - `POST /v1/admissions/applications/:id/enroll` — triggers student creation in Students module; sets application status `enrolled`; body: `{ class_section_id, roll_number? }`. Emits `student.created` + `admissions.student_enrolled`. Requires `students.profile.create` AND `admissions.application.manage` permissions.
   Permission: `admissions.application.view`, `admissions.application.manage`.

9. **Admission config endpoint** — `GET /v1/admissions/config`, `PUT /v1/admissions/config`. Permission: `admissions.settings.manage`.

10. **Admissions NestJS module** — `AdmissionsModule` with all controllers, services, repositories. Depends on `StudentsModule` (calls `StudentsService.create` internally for enroll flow) and `AcademicsModule` (validates class_section_id). Register in `AppModule`.

11. **Public-facing pages** (Next.js, minimal layout, no auth required):
    - `/apply/[schoolSlug]` — Landing page showing admission session info: school name/logo (fetched from theme endpoint), currently open session details (seats available per class), key dates. "Enquire Now" and "Apply Online" CTAs. Fully responsive.
    - `/apply/[schoolSlug]/enquire` — Enquiry form: student name, DOB, gender, class applying for (dropdown), guardian name, phone, email, how did you hear. Submit → success screen showing reference number with instructions. Loading state on submit. Error handling for school not found / session closed.
    - `/apply/[schoolSlug]/apply/[sessionId]` — Full online application form in multi-step layout:
      - Step 1: Student details (name, DOB, gender, blood group, religion, category, previous school)
      - Step 2: Guardian details (father/mother names, phones, occupations)
      - Step 3: Address (line1, line2, city, state, pincode)
      - Step 4: Documents (file upload for birth certificate, photo, previous marksheet — optional based on config)
      - Step 5: Review and submit
      Progress bar across top. "Save & Continue" per step. Step state persisted in sessionStorage. Submit → success screen with reference number.
    - `/apply/[schoolSlug]/status` — Status check form: reference number + date of birth. Submit → shows application status card with timeline of events.

12. **Frontend — Internal admission pipeline page** (`/dashboard/admissions`) — Kanban-style pipeline view with columns: New Enquiries, Converted to Application, Under Review, Test Scheduled, Approved, Enrolled, Rejected. Cards show student name, class applied for, guardian phone, date. Click card → detail slide-over. Drag disabled (use action buttons). Filters: session dropdown (default current open session). Skeleton loader for cards. Count badge on each column header.

13. **Frontend — Enquiries list page** (`/dashboard/admissions/enquiries`) — Data table with columns: Reference No, Student Name, Class, Guardian, Phone, Status badge, Source, Date, Actions. Filters: Status, Class, Session, Date range, Search. "Add Enquiry" button (walk-in). Row click → detail slide-over with edit form and "Convert to Application" action.

14. **Frontend — Applications list page** (`/dashboard/admissions/applications`) — Data table with Status badge column. Click row → full application detail page (`/dashboard/admissions/applications/:id`) with:
    - Summary card at top (reference no, status badge, submitted date)
    - Student details section
    - Guardian details section
    - Documents section (preview/download links)
    - Admission test section (schedule test form if none scheduled)
    - Action bar: Approve / Reject / Enroll buttons (shown based on status). Enroll opens dialog to select class-section.
    Status timeline on right side showing all status transitions with timestamps.

15. **Frontend — Admission sessions management** (`/dashboard/admissions/sessions`) — List of sessions with status badges, date ranges, seat info. Create/edit via slide-over. Open/Close session with confirmation. Click session → detail page showing class-wise seat availability table.

16. **Frontend — Admissions navigation** — Add "Admissions" to sidebar with sub-items: "Pipeline", "Enquiries", "Applications", "Sessions". Permission-guard internal routes.

## Relevant files
- `backend/src/modules/users/users.service.ts`
- `backend/src/modules/platform/audit/audit.service.ts`
- `backend/src/common/decorators/public.decorator.ts`
- `backend/src/common/guards/`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/components/ui/`
- `frontend/src/lib/api-client.ts`
- `frontend/src/app/(dashboard)/layout.tsx`
- `frontend/src/app/(auth)/layout.tsx`
- `documentation/api-style-guide_1773725741508.md`
- `documentation/platform-architecture-rules_1773725741510.md`
- `documentation/coding-guidelines_1773725741509.md`
- `documentation/agent-rules_1773725741507.md`
- `documentation/route-template_1773725741508.md`
