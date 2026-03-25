# Phase 2 — Learning Management System (Module 14)

## What & Why
Build the LMS (Learning Management System) module — a structured course and content delivery platform integrated within SchoolOS. Unlike the Homework module (assignment-centric) and Lesson Planning module (teacher diary), the LMS is student-facing: it allows teachers to create self-paced courses with video lessons, reading materials, quizzes, and projects. Students consume content at their own pace and can earn certificates on completion. In the Indian school context, the LMS serves: (1) remedial learning for students who need extra practice; (2) enrichment content for advanced students; (3) digital textbook supplements; (4) online subject courses that complement classroom instruction. This is a Layer 3 Academic Operations module depending on Students, Academics, and Online Examinations (quizzes within LMS courses use the question bank). Optionally integrates with Digital Content Center (Module 20) for media hosting.

## Done looks like
- Teachers/admins can create courses organized as: Course → Modules → Lessons (3-level hierarchy)
- Course types: `subject_course` (linked to a subject + class), `enrichment_course` (standalone, available to any class), `remedial_course` (targeted to weak students)
- Lessons support multiple content types: Video (YouTube embed or uploaded video URL), PDF, Text/Article (rich text), External URL, Quiz (uses online exam question bank), Project (file submission)
- Students can self-enroll in available courses or be enrolled by teachers (for remedial courses)
- Students progress through lessons sequentially (or freely — teacher configures); each lesson marked Complete when finished
- Quizzes within courses are powered by the Online Examinations question bank — same question types, auto-graded
- On course completion, a school-branded completion certificate is generated as a PDF
- Students can see their course progress across all enrolled courses
- Teacher/admin sees enrollment statistics and per-student progress
- Courses can be published (visible to students) or kept as draft
- All pages: skeleton loaders, empty states, toast feedback

## Out of scope
- SCORM/xAPI content import (future)
- Third-party video hosting integration (only YouTube embed + uploaded video URL)
- Live streaming within LMS (use Live Classes module)
- AI-powered course generation (future)
- Parent access to LMS course content (parent portal shows child's progress summary only)

## Tasks

1. **DB migration — LMS tables** — Create migration `021-lms.ts` with:
   - `lms_course_categories`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(100) NOT NULL, description TEXT NULL, color_hex VARCHAR(7) NULL, icon VARCHAR(50) NULL, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Unique: `(school_id, name)`. Index: `(school_id)`.
   - `lms_courses`: `(id UUID PK, school_id UUID NOT NULL, academic_year_id UUID NOT NULL FK academic_years, category_id UUID NULL FK lms_course_categories, subject_id UUID NULL FK subjects, title VARCHAR(300) NOT NULL, description TEXT NULL, course_type ENUM('subject_course','enrichment_course','remedial_course') NOT NULL DEFAULT 'subject_course', target_class_section_ids UUID[] NULL, thumbnail_url TEXT NULL, is_sequential BOOLEAN DEFAULT true, pass_percent DECIMAL(5,2) NOT NULL DEFAULT 60.00, issue_certificate BOOLEAN DEFAULT true, certificate_template_url TEXT NULL, status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft', total_modules INT NOT NULL DEFAULT 0, total_lessons INT NOT NULL DEFAULT 0, total_enrolled INT NOT NULL DEFAULT 0, enrollment_type ENUM('open','teacher_assigned','school_assigned') NOT NULL DEFAULT 'open', created_by UUID NOT NULL FK users, published_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ NULL)`.
   - Index: `(school_id, academic_year_id, status)`, `(school_id, subject_id)`, `(school_id, course_type)`, `(school_id, created_by)`.
   - `lms_modules`: `(id UUID PK, school_id UUID NOT NULL, course_id UUID NOT NULL FK lms_courses, title VARCHAR(300) NOT NULL, description TEXT NULL, sequence_order INT NOT NULL, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Index: `(school_id, course_id, sequence_order)`.
   - `lms_lessons`: `(id UUID PK, school_id UUID NOT NULL, module_id UUID NOT NULL FK lms_modules, course_id UUID NOT NULL FK lms_courses, title VARCHAR(300) NOT NULL, description TEXT NULL, lesson_type ENUM('video','pdf','text','url','quiz','project') NOT NULL, content_url TEXT NULL, content_text TEXT NULL, video_duration_seconds INT NULL, reading_time_minutes INT NULL, quiz_id UUID NULL FK online_exams, is_mandatory BOOLEAN DEFAULT true, sequence_order INT NOT NULL, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`.
   - Index: `(school_id, module_id, sequence_order)`, `(school_id, course_id)`.
   - `lms_lesson_attachments`: `(id UUID PK, school_id UUID NOT NULL, lesson_id UUID NOT NULL FK lms_lessons, file_url TEXT NOT NULL, file_name VARCHAR(300) NOT NULL, file_size_kb INT NOT NULL, mime_type VARCHAR(100) NOT NULL, created_at TIMESTAMPTZ)`. Index: `(school_id, lesson_id)`.
   - `lms_enrollments`: `(id UUID PK, school_id UUID NOT NULL, course_id UUID NOT NULL FK lms_courses, student_id UUID NOT NULL FK students, enrolled_by UUID NOT NULL FK users, enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE, status ENUM('active','completed','dropped','expired') NOT NULL DEFAULT 'active', progress_percent DECIMAL(5,2) NOT NULL DEFAULT 0, completed_lessons INT NOT NULL DEFAULT 0, certificate_issued BOOLEAN DEFAULT false, certificate_url TEXT NULL, certificate_issued_at TIMESTAMPTZ NULL, completed_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`.
   - Unique: `(school_id, course_id, student_id)`. Index: `(school_id, student_id)`, `(school_id, course_id, status)`.
   - `lms_lesson_progress`: `(id UUID PK, school_id UUID NOT NULL, enrollment_id UUID NOT NULL FK lms_enrollments, lesson_id UUID NOT NULL FK lms_lessons, student_id UUID NOT NULL FK students, status ENUM('not_started','in_progress','completed') NOT NULL DEFAULT 'not_started', started_at TIMESTAMPTZ NULL, completed_at TIMESTAMPTZ NULL, time_spent_seconds INT NOT NULL DEFAULT 0, quiz_score DECIMAL(5,2) NULL, project_submission_url TEXT NULL, project_feedback TEXT NULL)`.
   - Unique: `(school_id, enrollment_id, lesson_id)`. Index: `(school_id, student_id, lesson_id)`, `(school_id, enrollment_id)`.
   - All composite indexes start with `school_id`.

2. **LMS course categories endpoints** — `POST /v1/lms/categories`, `GET /v1/lms/categories`, `PATCH /v1/lms/categories/:id`, `DELETE /v1/lms/categories/:id`. Permission: `lms.settings.manage`. Full endpoint folders.

3. **LMS courses CRUD endpoints** —
   - `POST /v1/lms/courses` — create course. Body: `{ academic_year_id, category_id?, subject_id?, title, description?, course_type, target_class_section_ids?, is_sequential, pass_percent, issue_certificate, enrollment_type }`. Permission: `lms.course.create`. PBAC: teacher creates for own assigned subjects; admin creates any. Audit logged.
   - `GET /v1/lms/courses` — list; filters: `status`, `course_type`, `subject_id`, `academic_year_id`, `category_id`, `created_by`. Paginated. Permission: `lms.course.view`.
   - `GET /v1/lms/courses/:id` — includes module count, total lesson count, enrollment count. Permission: `lms.course.view`.
   - `PATCH /v1/lms/courses/:id`. Permission: `lms.course.update`. Audit logged.
   - `DELETE /v1/lms/courses/:id` — soft delete; only in draft status. Permission: `lms.course.delete`. Audit logged.
   - Full endpoint folders.

4. **Course lifecycle endpoints** —
   - `POST /v1/lms/courses/:id/publish` — sets status to `published`, `published_at = now()`. Validates: at least 1 module with 1 lesson exists. Permission: `lms.course.publish`.
   - `POST /v1/lms/courses/:id/archive` — sets status to `archived`; existing enrollments remain active. Permission: `lms.course.publish`.
   - Full endpoint folders.

5. **LMS modules CRUD endpoints** — Course content structure:
   - `POST /v1/lms/courses/:courseId/modules` — add module. Body: `{ title, description?, sequence_order }`. Updates course `total_modules`. Permission: `lms.course.update`.
   - `GET /v1/lms/courses/:courseId/modules` — list in sequence order. Permission: `lms.course.view`.
   - `PATCH /v1/lms/modules/:id`. Permission: `lms.course.update`.
   - `DELETE /v1/lms/modules/:id` — only if no lessons inside. Permission: `lms.course.update`.
   - `PATCH /v1/lms/courses/:courseId/modules/reorder` — bulk reorder. Body: `{ order: [{ id, sequence_order }] }`. Permission: `lms.course.update`.
   - Full endpoint folders.

6. **LMS lessons CRUD endpoints** — Lesson content management:
   - `POST /v1/lms/modules/:moduleId/lessons` — add lesson. Body: `{ title, description?, lesson_type, content_url?, content_text?, video_duration_seconds?, reading_time_minutes?, quiz_id?, is_mandatory, sequence_order }`. Validates: if `lesson_type = 'quiz'`, `quiz_id` must be provided and quiz must belong to this school. Updates module and course lesson counts. Permission: `lms.course.update`.
   - `GET /v1/lms/modules/:moduleId/lessons` — list in order. Permission: `lms.course.view`.
   - `GET /v1/lms/lessons/:id` — full lesson with attachments. Permission: `lms.course.view`.
   - `PATCH /v1/lms/lessons/:id`. Permission: `lms.course.update`.
   - `DELETE /v1/lms/lessons/:id` — only if no student progress on this lesson (or admin override). Permission: `lms.course.update`.
   - `POST /v1/lms/lessons/:id/attachments` — add file attachment. Permission: `lms.course.update`.
   - `DELETE /v1/lms/lesson-attachments/:attachmentId`. Permission: `lms.course.update`.
   - Full endpoint folders.

7. **Enrollment endpoints** — Student enrollment management:
   - `POST /v1/lms/courses/:courseId/enroll` — enroll student(s). Body: `{ student_ids: [uuid] }` (or `{ student_id }` for self-enroll with student_ids: [req.user.studentId]). Validates: course is published; students enrolled in school; if enrollment_type = 'open', any student can self-enroll. Bulk or single. Idempotent (no error if already enrolled). Returns `{ enrolled: N, already_enrolled: N }`. Permission: `lms.enrollment.manage` (for teacher/admin); `lms.enrollment.self` (for students — only open courses). Emits `lms.student_enrolled`.
   - `GET /v1/lms/courses/:courseId/enrollments` — list enrolled students with progress stats. Permission: `lms.enrollment.view`.
   - `POST /v1/lms/enrollments/:enrollmentId/drop` — drop student from course. Permission: `lms.enrollment.manage`.
   - `GET /v1/lms/my-courses?student_id=uuid` — student's enrolled courses with progress. PBAC: student sees own; parent sees children. Permission: `lms.course.view`.
   - Full endpoint folders.

8. **Lesson progress tracking endpoints** — Student learning progress:
   - `POST /v1/lms/lessons/:lessonId/progress/start` — student begins a lesson. Creates or updates `lms_lesson_progress` record with `status = 'in_progress'`, `started_at = now()`. Validates enrollment is active. Permission: `lms.progress.update`. (Student role.)
   - `POST /v1/lms/lessons/:lessonId/progress/complete` — student marks lesson as complete. Body: `{ time_spent_seconds, quiz_score? (if quiz type) }`. Sets `status = 'completed'`, `completed_at`. Updates parent `lms_enrollment` progress_percent (completed_lessons / total_lessons * 100). Checks if all mandatory lessons done → if so, sets enrollment status to `completed`, generates certificate if `issue_certificate = true`. Emits `lms.lesson_completed`; if course completed emits `lms.course_completed`. Permission: `lms.progress.update`.
   - `GET /v1/lms/enrollments/:enrollmentId/progress` — full progress breakdown by module and lesson. Permission: `lms.progress.view`. PBAC: student sees own; teacher/admin sees all.
   - `POST /v1/lms/lessons/:lessonId/progress/project-submit` — submit project file URL for project-type lessons. Body: `{ project_submission_url }`. Permission: `lms.progress.update`.
   - `POST /v1/lms/progress/:progressId/project-grade` — teacher grades project. Body: `{ project_feedback, marks_awarded? }`. Sets lesson progress to completed. Permission: `lms.progress.grade`.
   - Full endpoint folders.

9. **Certificate generation endpoint** — `POST /v1/lms/enrollments/:enrollmentId/generate-certificate` — triggers async BullMQ job to generate PDF certificate. Validates enrollment is completed and `issue_certificate = true`. Returns 202 with job_id. Job renders school-branded certificate template with: student name, course name, completion date, school logo, principal signature. Uploads PDF to object storage. Updates `certificate_url` and `certificate_issued_at`. Emits `lms.certificate_issued`. Permission: `lms.course.publish` (or auto-triggered on completion).

10. **LMS analytics endpoint** — `GET /v1/lms/courses/:id/analytics` — Returns: `{ total_enrolled, active, completed, dropped, average_progress_percent, lesson_completion_rates: [{ lesson_id, lesson_title, completion_rate }], quiz_performance: [{ quiz_id, average_score }] }`. Permission: `lms.course.view`.

11. **LMS NestJS module** — Create `LmsModule` in `backend/src/modules/lms/`. Entities: all 7 LMS entities. Import: `StudentsModule`, `AcademicsModule`, `OnlineExaminationsModule` (for quiz linking). Export `LmsCourseService`, `LmsEnrollmentService` (used by Parent Portal). Register in `AppModule`. Create all entity files and module.ts.

12. **Permissions registration** — Add to `backend/src/config/permissions.ts`:
    - `lms.settings.manage` (categories)
    - `lms.course.view`, `lms.course.create`, `lms.course.update`, `lms.course.delete`, `lms.course.publish`
    - `lms.enrollment.view`, `lms.enrollment.manage`, `lms.enrollment.self`
    - `lms.progress.view`, `lms.progress.update`, `lms.progress.grade`
    Default: `super_admin`, `admin`, `principal` — all. `teacher` — course.view/create/update (own PBAC), enrollment.view/manage, progress.view/grade. `student` — course.view (enrolled only PBAC), enrollment.self, progress.view (own), progress.update. `parent` — course.view (children's enrolled), progress.view (children PBAC).

13. **Frontend — Course catalog page** (`/dashboard/lms`) — Student and teacher landing page:
    - **Teacher/Admin view**: Table or cards of all courses. Columns/cards: thumbnail, title, type badge, subject, status, enrolled count, completion rate. "Create Course" button. Filters: type, subject, status, academic year.
    - **Student view**: Grid of enrolled courses with progress bars. "Browse Courses" button (opens open enrollment courses list). Filter by subject. Skeleton loader. Empty state: "You haven't enrolled in any courses."

14. **Frontend — Course builder page** (`/dashboard/lms/courses/new`) — Multi-step wizard (teacher/admin):
    - **Step 1**: Basic details — title, description, type, subject, target classes, category, thumbnail upload.
    - **Step 2**: Settings — enrollment type (open/teacher-assigned), sequential vs free navigation, pass percent, issue certificate toggle, certificate template upload.
    - **Step 3**: Curriculum builder — drag-and-drop module + lesson builder. Add module (title). Inside each module: add lessons with type selector (Video/PDF/Text/URL/Quiz/Project). Drag to reorder modules and lessons. Inline form for each lesson type.
    - **Step 4**: Review and publish.
    - Progress stepper at top.

15. **Frontend — Course detail page** (`/dashboard/lms/courses/:id`) — Two views:
    - **Teacher/Admin**: Tabs — Curriculum (module/lesson tree with edit/delete/add), Enrollments (table of students with progress), Analytics (completion rates chart, quiz scores).
    - **Student**: Single-page layout — left sidebar: course outline (modules + lessons, checkmarks on completed), right main area: lesson content viewer (video player for video lessons, PDF viewer, rich text for articles, quiz launcher for quiz lessons). Progress indicator at top. Certificate download button (once complete). "Mark as Complete" button.

16. **Frontend — My Courses page** (`/dashboard/lms/my-courses`) — Student's learning dashboard:
    - Cards: course thumbnail, title, progress bar (%), last accessed date, "Continue" button. Filter by subject/status.
    - Completed courses section below with certificate download links.
    - Skeleton loader. Empty state.

17. **Frontend — LMS navigation** — Add "Learning" to sidebar:
    - "Course Catalog" — `/dashboard/lms` (admin/teacher label: "Courses")
    - "My Courses" — `/dashboard/lms/my-courses` (student only)
    Permission guard: `lms.course.view`.

18. **Seed LMS data** — Update `seed.ts` to:
    - Create 1 LMS course category: "Core Subjects".
    - Create 1 course: "Mathematics Fundamentals — Grade 1", subject_course type, linked to Mathematics subject, Grade 1-A, status published, enrollment_type open.
    - Add 2 modules: "Module 1: Numbers" (2 lessons: Video "Counting 1–10", Text "Practice Numbers") and "Module 2: Basic Operations" (1 quiz lesson linked to the seeded online exam).

## Relevant files
- `backend/src/modules/lms/`
- `backend/src/modules/lms/entities/lms-course-category.entity.ts`
- `backend/src/modules/lms/entities/lms-course.entity.ts`
- `backend/src/modules/lms/entities/lms-module.entity.ts`
- `backend/src/modules/lms/entities/lms-lesson.entity.ts`
- `backend/src/modules/lms/entities/lms-lesson-attachment.entity.ts`
- `backend/src/modules/lms/entities/lms-enrollment.entity.ts`
- `backend/src/modules/lms/entities/lms-lesson-progress.entity.ts`
- `backend/src/database/migrations/021-lms.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `backend/src/modules/online-examinations/entities/online-exam.entity.ts`
- `frontend/src/app/(dashboard)/lms/page.tsx`
- `frontend/src/app/(dashboard)/lms/courses/new/page.tsx`
- `frontend/src/app/(dashboard)/lms/courses/[id]/page.tsx`
- `frontend/src/app/(dashboard)/lms/my-courses/page.tsx`
- `frontend/src/components/modules/lms/CourseCard.tsx`
- `frontend/src/components/modules/lms/CurriculumBuilder.tsx`
- `frontend/src/components/modules/lms/LessonViewer.tsx`
- `frontend/src/hooks/use-lms.ts`
- `documentation/api-style-guide.md`
- `documentation/coding-guidelines.md`
- `documentation/agent-rules.md`
- `documentation/route-template.md`
