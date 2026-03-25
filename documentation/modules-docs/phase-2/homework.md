# Phase 2 — Homework & Assignment Management (Module 12)

## What & Why
Build the Homework & Assignment module — the digital replacement for the paper homework diary in Indian schools. Teachers assign homework per subject per class; students and parents view assignments, track due dates, and submit digital work. This is a Layer 3 Academic Operations module depending on Students, Academics, and Lesson Planning (optionally — homework can be linked to a lesson plan topic). In Indian K-12 education, homework is one of the most common parent touchpoints — parents regularly check "what homework is given today?" on the parent portal and app. This module integrates with the Notification Engine (Phase 4) to push daily homework summaries to parents via WhatsApp/Push at the end of each school day.

## Done looks like
- Teachers can create homework assignments per class-section per subject with: title, description (rich text), due date, estimated duration, attachment files, and optional link to a lesson plan topic
- Homework assignments can have `submission_required: true/false` — optional assignments don't need student submission
- Students can submit homework digitally: file upload, text response, or URL link
- Teachers can mark submissions as Reviewed, Graded (with score and feedback), or Returned for revision
- Parents can view all pending and completed homework for their child on the Parent Portal
- Homework list is filterable by: class-section, subject, date range, submission status
- Homework can be linked to an Online Exam (auto-assign as homework, submit via attempt)
- Teachers get a submission status dashboard per assignment (Submitted / Not Submitted / Graded per student)
- Late submission is flagged automatically; teacher can accept or reject late submissions with a note
- Homework calendar view shows daily assignment load per class to help teachers avoid overloading students
- All pages: skeleton loaders, empty states, toast feedback

## Out of scope
- Online exam integration beyond linking (Online Examinations module handles the attempt itself)
- Plagiarism detection (future)
- AI-powered homework generation (future)
- Grade book / GPA computation from homework grades (Examinations module handles this for formal assessments)

## Tasks

1. **DB migration — homework tables** — Create migration `019-homework.ts` with:
   - `homework_assignments`: `(id UUID PK, school_id UUID NOT NULL, class_section_id UUID NOT NULL FK class_sections, subject_id UUID NOT NULL FK subjects, academic_year_id UUID NOT NULL FK academic_years, title VARCHAR(300) NOT NULL, description TEXT NULL, due_date DATE NOT NULL, due_time TIME NULL, estimated_duration_minutes INT NULL, submission_required BOOLEAN DEFAULT true, submission_type ENUM('file','text','url','any') DEFAULT 'any', max_file_size_mb INT NULL DEFAULT 10, allowed_file_types VARCHAR(200) NULL, allow_late_submission BOOLEAN DEFAULT true, late_submission_note TEXT NULL, total_marks DECIMAL(5,2) NULL, linked_lesson_topic_id UUID NULL FK lesson_topics, linked_online_exam_id UUID NULL FK online_exams, status ENUM('draft','published','closed') NOT NULL DEFAULT 'draft', published_at TIMESTAMPTZ NULL, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ NULL)`.
   - Indexes: `(school_id, class_section_id, academic_year_id)`, `(school_id, subject_id, due_date)`, `(school_id, created_by)`, `(school_id, due_date)`.
   - `homework_attachments`: `(id UUID PK, school_id UUID NOT NULL, homework_id UUID NOT NULL FK homework_assignments, file_url TEXT NOT NULL, file_name VARCHAR(300) NOT NULL, file_size_kb INT NOT NULL, mime_type VARCHAR(100) NOT NULL, uploaded_by UUID NOT NULL FK users, created_at TIMESTAMPTZ)`. Index: `(school_id, homework_id)`.
   - `homework_submissions`: `(id UUID PK, school_id UUID NOT NULL, homework_id UUID NOT NULL FK homework_assignments, student_id UUID NOT NULL FK students, enrollment_id UUID NOT NULL FK student_enrollments, submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(), is_late BOOLEAN DEFAULT false, text_response TEXT NULL, submission_url TEXT NULL, status ENUM('submitted','reviewed','graded','returned','rejected') NOT NULL DEFAULT 'submitted', grade DECIMAL(5,2) NULL, feedback TEXT NULL, reviewed_by UUID NULL FK users, reviewed_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`.
   - Unique: `(school_id, homework_id, student_id)`. Index: `(school_id, student_id, homework_id)`, `(school_id, homework_id, status)`.
   - `homework_submission_files`: `(id UUID PK, school_id UUID NOT NULL, submission_id UUID NOT NULL FK homework_submissions, file_url TEXT NOT NULL, file_name VARCHAR(300) NOT NULL, file_size_kb INT NOT NULL, mime_type VARCHAR(100) NOT NULL, created_at TIMESTAMPTZ)`. Index: `(school_id, submission_id)`.
   - All composite indexes start with `school_id`.

2. **Homework assignments CRUD endpoints** — Teacher-facing assignment management:
   - `POST /v1/homework` — create assignment. Body: full assignment fields. Validates: `due_date` is not in the past (warning, not error); `class_section_id` belongs to school; subject is assigned to this class-section. Status defaults to `draft`. Permission: `homework.assignment.create`. PBAC: teacher can only create for class-sections and subjects they are assigned to. Audit logged.
   - `GET /v1/homework` — list; filters: `class_section_id`, `subject_id`, `academic_year_id`, `status`, `due_date[gte]`, `due_date[lte]`, `created_by`; sort: `due_date ASC` (default). Paginated. Permission: `homework.assignment.view`. PBAC: teacher sees own + others (view only); admin sees all.
   - `GET /v1/homework/:id` — full detail including attachments and submission count summary. Permission: `homework.assignment.view`.
   - `PATCH /v1/homework/:id` — partial update; only in `draft` status (or `published` for non-structural fields like description). Permission: `homework.assignment.update`. Audit logged.
   - `DELETE /v1/homework/:id` — soft delete; only if no submissions exist. Permission: `homework.assignment.delete`. Audit logged.
   - Full endpoint folders for each.

3. **Homework publish/close endpoints** —
   - `POST /v1/homework/:id/publish` — sets status to `published`, `published_at = now()`. Validates assignment has title, due_date. Emits `homework.published` event (Notification Engine picks up in Phase 4 to send WhatsApp/push to parents of enrolled students). Permission: `homework.assignment.publish`.
   - `POST /v1/homework/:id/close` — sets status to `closed`; no new submissions accepted. Permission: `homework.assignment.publish`.
   - Full endpoint folders.

4. **Homework attachments endpoints** — Teacher uploads files to an assignment:
   - `POST /v1/homework/:id/attachments` — add file attachment (file stored via object-storage presigned URL flow; this endpoint stores metadata). Body: `{ file_url, file_name, file_size_kb, mime_type }`. Permission: `homework.assignment.update`.
   - `DELETE /v1/homework/attachments/:attachmentId`. Permission: `homework.assignment.update`.
   - Full endpoint folder.

5. **Submission status endpoint** — Teacher's submission dashboard for an assignment:
   - `GET /v1/homework/:id/submissions/status` — returns per-student submission status for all enrolled students. Response: `{ total_students, submitted, not_submitted, graded, students: [{ student_id, name, roll_number, submission_status, is_late, submitted_at, grade }] }`. Permission: `homework.submission.view`. PBAC: teacher sees own assignment's students; admin sees all.
   - Full endpoint folder.

6. **Submission CRUD endpoints** — Student-facing submission flow:
   - `POST /v1/homework/:homeworkId/submit` — student submits. Body: `{ text_response?, submission_url? }` (multipart for file uploads). Validates: homework is published (not draft/closed); submission_required = true (if false, still allowed); not already submitted (or re-submission — configurable). Computes `is_late = (submitted_at > due_date)`. Returns 201. Permission: `homework.submission.submit`. PBAC: student can only submit for own assignments (enrolled class).
   - `GET /v1/homework/:homeworkId/submissions/:submissionId` — get own submission. Permission: `homework.submission.view`. PBAC: student sees own; teacher sees all for their assignment.
   - Full endpoint folders.

7. **Submission review and grading endpoints** — Teacher marks and returns submissions:
   - `POST /v1/homework/submissions/:submissionId/review` — mark as reviewed. Sets `status = 'reviewed'`, `reviewed_by`, `reviewed_at`. Permission: `homework.submission.grade`. PBAC: teacher who created the assignment or admin.
   - `POST /v1/homework/submissions/:submissionId/grade` — set grade and feedback. Body: `{ grade, feedback? }`. Validates `grade ≤ total_marks` (if total_marks set). Sets `status = 'graded'`. Emits `homework.graded` (parent notification). Permission: `homework.submission.grade`.
   - `POST /v1/homework/submissions/:submissionId/return` — return for revision. Body: `{ feedback }`. Sets `status = 'returned'`. Emits `homework.returned`. Permission: `homework.submission.grade`.
   - `POST /v1/homework/submissions/:submissionId/reject` — reject late submission. Body: `{ reason }`. Sets `status = 'rejected'`. Permission: `homework.submission.grade`.
   - Full endpoint folders.

8. **Homework calendar endpoint** — Teacher and admin planning view:
   - `GET /v1/homework/calendar?class_section_id=uuid&academic_year_id=uuid&month=YYYY-MM` — returns homework load per day for the given class. Response: `{ days: [{ date, homework_count, subjects: [subject_name] }] }`. Helps teachers avoid assignment overload. Permission: `homework.assignment.view`.
   - Full endpoint folder.

9. **Student homework feed endpoint** — Student / parent portal use:
   - `GET /v1/homework/my?student_id=uuid&status=pending|completed|all&from_date=&to_date=` — list of homework assignments for a student with submission status embedded. PBAC: student sees own; parent sees own children's (with student_id param required and validated against parent's linked children). Permission: `homework.assignment.view`. Used by Parent Portal and mobile app.
   - Full endpoint folder.

10. **Homework NestJS module** — Create `HomeworkModule` in `backend/src/modules/homework/`. Entities: `HomeworkAssignmentEntity`, `HomeworkAttachmentEntity`, `HomeworkSubmissionEntity`, `HomeworkSubmissionFileEntity`. Import: `StudentsModule`, `AcademicsModule`. Export `HomeworkService` (used by Parent Portal module). Register in `AppModule`. Create all entity files and module.ts.

11. **Permissions registration** — Add to `backend/src/config/permissions.ts`:
    - `homework.assignment.view`, `homework.assignment.create`, `homework.assignment.update`, `homework.assignment.delete`, `homework.assignment.publish`
    - `homework.submission.view`, `homework.submission.submit`, `homework.submission.grade`
    Default: `super_admin`, `admin`, `principal` — all. `teacher` — assignment.view/create/update/delete/publish (own class-sections PBAC), submission.view/grade (own assignments PBAC). `student` — assignment.view (enrolled classes only PBAC), submission.submit/view (own only). `parent` — assignment.view, submission.view (own children PBAC).

12. **Frontend — Homework management page** (`/dashboard/homework`) — Teacher's main view:
    - **Top bar**: Class-Section filter, Subject filter, Status filter (Draft/Published/Closed), Date range picker, "Create Assignment" button.
    - **Assignment cards list**: Each card shows: subject chip, title, due date (with days remaining badge in amber if < 3 days, red if overdue), class-section, submission progress bar (N/M submitted), status badge, Edit/Publish/Close/Delete actions.
    - **Calendar view tab**: Monthly calendar grid showing assignment load per day per class with colored dots per subject. Helps identify overloaded days.
    - Skeleton loader (3 card shimmer). Empty state: "No homework yet. Create your first assignment."

13. **Frontend — Create/Edit assignment form** (`/dashboard/homework/new`) — Full-page form (not slide-over — complex enough to need full page):
    - **Section 1 — Basics**: Title (required), Class-Section (select), Subject (cascades from class-section), Academic year (default current).
    - **Section 2 — Details**: Description (rich text editor — TipTap or similar), Due date + optional time, Estimated duration (minutes select: 10/15/20/30/45/60/90 min), Lesson topic link (optional — searchable from lesson plan).
    - **Section 3 — Submission settings**: Submission required toggle, Submission type (File / Text / URL / Any), Max file size, Allowed file types, Allow late submission toggle, Total marks (optional).
    - **Section 4 — Attachments**: Drag-drop file upload area. Uploaded files list with delete option.
    - Bottom action bar: "Save as Draft" (grey) and "Save & Publish" (primary). React Hook Form + Zod.

14. **Frontend — Assignment detail page** (`/dashboard/homework/:id`) — Two-tab layout:
    - **Assignment tab**: Full assignment content display (description rendered, attachments listed). Edit / Publish / Close buttons.
    - **Submissions tab**: Student submission status table. Columns: Roll No, Name, Status chip, Submitted At, Is Late badge, Grade, Actions (Review/Grade/Return). Filter: submitted/not submitted. "Export submissions" CSV button. Click student row → submission detail modal with file preview / text response and grade entry form.
    - Skeleton loader. Empty state: "No submissions yet."

15. **Frontend — Student/Parent homework view** (Parent Portal — added in Phase 4, but component built now):
    - `<HomeworkFeed student_id={id} />` component: Lists today's and upcoming homework with subject chip, title, due date countdown, submission status. "View Details" expands to show description and "Submit" button. Filterable by subject and date.
    - Built now, integrated into Parent Portal in Phase 4.

16. **Frontend — Homework navigation** — Add "Homework" to sidebar:
    - "Assignments" — `/dashboard/homework`
    - "Create Assignment" — `/dashboard/homework/new`
    Permission guard: `homework.assignment.view`.

17. **Seed homework data** — Update `seed.ts` to:
    - Create 1 published homework assignment: "Practice Addition — Page 24, Exercise 3" for Grade 1-A, Mathematics, due tomorrow, submission required.
    - No submissions (students submit on parent portal — created later).

## Relevant files
- `backend/src/modules/homework/`
- `backend/src/modules/homework/entities/homework-assignment.entity.ts`
- `backend/src/modules/homework/entities/homework-attachment.entity.ts`
- `backend/src/modules/homework/entities/homework-submission.entity.ts`
- `backend/src/modules/homework/entities/homework-submission-file.entity.ts`
- `backend/src/database/migrations/019-homework.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `backend/src/modules/academics/entities/class-section-subject.entity.ts`
- `backend/src/modules/students/entities/student-enrollment.entity.ts`
- `frontend/src/app/(dashboard)/homework/page.tsx`
- `frontend/src/app/(dashboard)/homework/new/page.tsx`
- `frontend/src/app/(dashboard)/homework/[id]/page.tsx`
- `frontend/src/components/modules/homework/AssignmentCard.tsx`
- `frontend/src/components/modules/homework/SubmissionsTable.tsx`
- `frontend/src/components/modules/homework/HomeworkFeed.tsx`
- `frontend/src/hooks/use-homework.ts`
- `documentation/api-style-guide.md`
- `documentation/coding-guidelines.md`
- `documentation/agent-rules.md`
- `documentation/route-template.md`
