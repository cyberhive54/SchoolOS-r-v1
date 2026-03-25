# Phase 2 — Students Module

## What & Why
Build the Students module — the central identity system for every student across SchoolOS. This module is Layer 2 Core Domain. All other modules (Attendance, Fees, Admissions, Examinations, etc.) reference student records. Covers student profile management, guardian linking, sibling linking, enrollment tracking per academic year, document management, bulk operations, student categories, and house management. Board-agnostic by design.

## Done looks like
- Admins can create, view, edit, and soft-delete student profiles with full Indian school data fields (admission no, category, religion, caste, blood group, aadhaar, etc.)
- Each student is enrolled in a class-section per academic year; enrollment history is preserved
- Guardians (Father, Mother, Local Guardian etc.) can be linked to students with contact info; a guardian user account can be optionally created for portal access
- **Sibling students can be linked** — bi-directional relationship used by Fees module for automatic sibling discounts
- **Student documents can be uploaded and managed** — birth certificate, TC, Aadhaar, marksheets, etc.
- Student categories (General, SC, ST, OBC, EWS, etc.) are school-configurable and assigned per student
- Student houses (Red House, Blue House, etc.) are school-configurable
- Bulk CSV import of students works with validation error feedback per row
- Student list supports search, filter by class, section, category, gender, status; pagination via API
- Individual student profile page shows all tabs: Profile, Guardian, Academic History, Siblings, Documents
- All mutations give toast feedback; list pages use skeleton loaders; forms show inline field errors
- Proper empty states with prompts on all list views

## Out of scope
- Attendance marking (Attendance module)
- Fee invoicing (Fees module)
- Exam marks (Examinations module)
- Admission application workflow (Admissions module)
- Transport or hostel assignment
- Medical records (Health & Medical module — Module 34)

## Tasks

1. **DB migration — students core** — Create migration `006-students-core.ts` with tables:
   - `student_categories`: `(id, school_id, name, code, description, is_active, created_at, updated_at)` — school-defined categories like General/SC/ST/OBC/EWS
   - `student_houses`: `(id, school_id, name, color_hex, description, is_active, created_at, updated_at)` — school-defined house system
   - `students`: `(id, school_id, admission_no, first_name, middle_name, last_name, date_of_birth, gender ['male'|'female'|'other'], blood_group, religion, caste, nationality, aadhaar_no [nullable], category_id [FK student_categories nullable], house_id [FK student_houses nullable], profile_photo_url [nullable], status ['active'|'inactive'|'transferred_out'|'alumni'], created_at, updated_at, deleted_at)`. Unique index on `(school_id, admission_no)`.
   - `student_profiles`: `(id, student_id, school_id, address_line1, address_line2, city, state, pincode, country, phone, alternate_phone, previous_school, previous_class, admission_date, created_at, updated_at)` — extended profile data, one-to-one with students.
   All composite indexes `school_id` first.

2. **DB migration — guardians and enrollments** — Create migration `007-students-guardians-enrollments.ts` with:
   - `guardians`: `(id, school_id, relation ['father'|'mother'|'guardian'|'other'], first_name, last_name, phone, email [nullable], occupation, aadhaar_no [nullable], user_id [nullable FK users — for portal access], created_at, updated_at)`. Index on `(school_id, phone)`.
   - `student_guardians`: `(id, student_id, guardian_id, school_id, is_primary BOOLEAN, emergency_contact BOOLEAN, created_at)`. Unique index on `(student_id, guardian_id)`. Index on `(school_id, student_id)`.
   - `student_enrollments`: `(id, student_id, school_id, class_section_id [FK class_sections], academic_year_id [FK academic_years], roll_number [nullable], status ['active'|'transferred'|'promoted'|'detained'], enrolled_at, left_at [nullable], created_at, updated_at)`. Unique partial index on `(student_id, academic_year_id)` where `status = 'active'`. Index on `(school_id, class_section_id, academic_year_id)`.

3. **DB migration — siblings and documents** ✅ Created `012-students-siblings-documents.ts` with:
   - `student_siblings`: bi-directional sibling link; unique on `(school_id, student_id, sibling_id)`; check constraint `student_id != sibling_id`.
   - `student_documents`: file metadata (document_type enum, title, file_url, file_name, file_size_kb, mime_type, uploaded_by, notes).

4. **Student categories & houses endpoints** — `POST /v1/students/categories`, `GET /v1/students/categories`, `PATCH /v1/students/categories/:id`, `DELETE /v1/students/categories/:id`. Same CRUD pattern for `/v1/students/houses`. Permission: `students.settings.manage`. Each endpoint: route.md, controller, service, DTOs, permissions, tests, examples.

5. **Students CRUD endpoints** —
   - `POST /v1/students` (201; emits `student.created`; audit log)
   - `GET /v1/students` (paginated list; query params: `page`, `per_page`, `sort`, `q` [full-text on name+admission_no], `filter[class_section_id]`, `filter[academic_year_id]`, `filter[category_id]`, `filter[gender]`, `filter[status]`; default sort: `last_name ASC`)
   - `GET /v1/students/:id` (includes current enrollment, guardian count)
   - `PATCH /v1/students/:id` (partial update; emits `student.updated`)
   - `DELETE /v1/students/:id` (soft delete; sets `deleted_at` and `status = inactive`; emits `student.deactivated`)
   Permission: `students.profile.view` for GET, `students.profile.create` for POST, `students.profile.update` for PATCH, `students.profile.delete` for DELETE. Each as full endpoint folder.

6. **Student profile sub-resource endpoint** — `PUT /v1/students/:id/profile` (upsert extended profile — creates or replaces the `student_profiles` row). `GET /v1/students/:id/profile`. Permission: `students.profile.update`.

7. **Guardian endpoints** —
   - `GET /v1/students/:id/guardians` — list guardians for a student
   - `POST /v1/students/:id/guardians` — create a new guardian and link to this student; body includes relation, contact info, and optional `create_portal_account: boolean` (if true, creates a `users` record and school_membership for guardian)
   - `PATCH /v1/students/:id/guardians/:guardianId` — update guardian info
   - `DELETE /v1/students/:id/guardians/:guardianId` — unlink guardian from student (guardian record retained)
   - `POST /v1/guardians/:guardianId/invite` — send portal invite email to guardian
   Permission: `students.guardian.manage`.

8. **Enrollment endpoints** —
   - `POST /v1/students/:id/enrollments` — enroll student in a class-section for academic year; validates no active enrollment already exists; body: `{ class_section_id, academic_year_id, roll_number? }`. Emits `student.enrolled`.
   - `GET /v1/students/:id/enrollments` — full enrollment history
   - `PATCH /v1/students/:id/enrollments/:enrollmentId` — update roll number or transfer (change class-section within same year)
   Permission: `students.enrollment.manage`.

9. **Sibling endpoints** ✅ —
   - `GET /v1/students/:id/siblings` — list all siblings with their basic profile (name, admission_no). Permission: `students.profile.read`.
   - `POST /v1/students/:id/siblings` — body: `{ sibling_id }`. Creates bi-directional link (A→B and B→A). Idempotent. Permission: `students.profile.update`.
   - `DELETE /v1/students/:id/siblings/:siblingId` — removes both rows. Permission: `students.profile.update`.

10. **Student document endpoints** ✅ —
    - `GET /v1/students/:id/documents` — list all documents. Permission: `students.profile.read`.
    - `POST /v1/students/:id/documents` — add document (file_url from object-storage; store metadata). Permission: `students.profile.update`.
    - `GET /v1/students/:id/documents/:docId` — single document. Permission: `students.profile.read`.
    - `PATCH /v1/students/:id/documents/:docId` — update title, type, notes. Permission: `students.profile.update`.
    - `DELETE /v1/students/:id/documents/:docId` — delete record. Permission: `students.profile.update`.

11. **Bulk import endpoint** — `POST /v1/students/bulk-import` — accepts `multipart/form-data` with a CSV file. Requires `Idempotency-Key` header. Returns `202 Accepted` with job_id. BullMQ job processes rows: validates each row, creates students + profiles + enrollments. Job status endpoint: `GET /v1/jobs/:id`. On completion emits `students.bulk_import_completed`. Permission: `students.profile.create`. Max 500 rows per import. Provide a CSV template download endpoint: `GET /v1/students/bulk-import/template`.

12. **Students NestJS module** ✅ — `StudentsModule` wiring all controllers, services, repositories. Register in `AppModule`. Export `StudentsService` for use by other modules. Includes `SiblingsController`, `StudentDocumentsController`, `SiblingsService`, `StudentDocumentsService`.

13. **Frontend — Student list page** (`/dashboard/students`) — Full-featured data table:
    - Columns: Photo thumbnail, Name, Admission No, Class-Section, Gender, Status badge, Actions
    - Top bar: Search input (debounced 300ms), Filter dropdowns (Academic Year, Class-Section, Category, Gender, Status), "Add Student" button (primary), "Bulk Import" button (secondary)
    - Pagination controls at bottom
    - Skeleton loader: 10 rows of shimmer cells matching column widths on initial load
    - Empty state: illustration + "No students found. Add your first student." with CTA button
    - Row click navigates to student detail page
    - Checkboxes for bulk select (future bulk actions)

14. **Frontend — Student detail page** (`/dashboard/students/:id`) — Tabbed layout:
    - **Profile tab**: Two-column card grid showing all fields. Edit button opens slide-over edit form. Profile photo with upload placeholder. Status badge with change action.
    - **Guardian tab**: Guardian cards (one per guardian) showing relation, name, contact. "Add Guardian" button opens form with option to create portal account.
    - **Siblings tab**: Sibling cards showing name, admission no, current class. "Add Sibling" button opens search-and-link dialog. Remove sibling icon. Empty state: "No siblings linked."
    - **Academic History tab**: Timeline of enrollments across academic years. Current enrollment highlighted.
    - **Documents tab**: Document list with type badge, file name, upload date, download/delete actions. "Upload Document" button opens upload form with file picker + type selection.
    - Skeleton loader for each tab content on first load. Breadcrumb navigation.

15. **Frontend — Add/Edit Student form** — Slide-over drawer with sections:
    - **Basic Info**: First name, Middle name, Last name, Admission No (auto-suggest format based on school config), Date of birth (date picker), Gender (radio), Blood group (select), Religion (text), Category (select from school categories), House (select from school houses)
    - **Contact**: Phone, Alternate phone, Address fields (line1, line2, city, state, pincode)
    - **Academic**: Previous school, Previous class, Admission date (date picker)
    - **Enrollment** (create only): Academic year (default current), Class-Section (cascading from year), Roll number (optional)
    - React Hook Form + Zod validation. Inline field errors. Submit shows loading spinner. Toast on success/error.

16. **Frontend — Bulk Import page** (`/dashboard/students/bulk-import`) — Step wizard:
    - Step 1: Download CSV template button. Instructions on required vs optional columns.
    - Step 2: Drag-and-drop file upload zone. File validation (CSV only, max 2MB, max 500 rows shown after parse preview). Preview first 5 rows in a table.
    - Step 3: Confirm and submit. Progress indicator showing job status via polling. Completion summary: X created, Y errors. Error rows downloadable as CSV with error column.

17. **Frontend — Student Categories & Houses settings** (`/dashboard/students/settings`) — Two sections on one page. Each has a simple list with inline edit and delete. "Add Category" / "Add House" opens a small dialog form. Skeleton loaders. Toast on mutations.

18. **Frontend — Students navigation** — Add "Students" to sidebar with sub-items: "All Students", "Bulk Import", "Settings". Permission-guard all routes on frontend.

19. **Seed student data** — Update `seed.ts` to create 3 student categories (General, SC, OBC), 2 houses (Red House, Blue House), and 5 sample students enrolled in Grade 1-A for 2025–26. Include 1 guardian linked to first student. Link students 1 & 2 as siblings.

## Relevant files
- `backend/src/modules/platform/audit/audit.service.ts`
- `backend/src/common/guards/`
- `backend/src/common/decorators/`
- `backend/src/database/migrations/006-students-core.ts`
- `backend/src/database/migrations/007-students-guardians-enrollments.ts`
- `backend/src/database/migrations/012-students-siblings-documents.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `backend/src/modules/students/entities/student-sibling.entity.ts`
- `backend/src/modules/students/entities/student-document.entity.ts`
- `backend/src/modules/students/endpoints/siblings/`
- `backend/src/modules/students/endpoints/documents/`
- `frontend/src/components/ui/`
- `frontend/src/lib/api-client.ts`
- `frontend/src/app/(dashboard)/layout.tsx`
- `documentation/api-style-guide_1773725741508.md`
- `documentation/coding-guidelines_1773725741509.md`
- `documentation/agent-rules_1773725741507.md`
- `documentation/route-template_1773725741508.md`
