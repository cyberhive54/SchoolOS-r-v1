# Phase 2 — Lesson Planning Module (Module 13)

## What & Why
Build the Lesson Planning module — the teacher's digital planning workspace for SchoolOS. In Indian schools, teachers are required by CBSE and state boards to maintain a "lesson plan diary" documenting what they plan to teach, what they taught, and the progress of the annual syllabus. This module digitizes that process. It is a Layer 3 Academic Operations module depending on Academics (for subjects, class-sections, academic years). Lesson plans feed into: Homework module (link homework to a lesson topic), Online Examinations module (question bank topic tags come from lesson topics), and Attendance module (topic-wise attendance patterns for future analytics). The module also serves as a syllabus tracker — showing admins and principals how much of the annual syllabus has been covered.

## Done looks like
- Teachers can create lesson plans per subject per class-section per academic year
- Each lesson plan contains multiple topics organized in a structured sequence (Chapter > Topic > Sub-topic)
- For each topic, the teacher specifies: estimated periods needed, learning objectives, teaching methods, materials, reference books, activities
- After teaching a topic, the teacher marks it as "completed" with the actual date taught — this drives the syllabus progress tracker
- Admins and principals can view the syllabus completion percentage per subject per class-section in real time
- Lesson plans can be copied from one academic year to the next (with reset of completion status) — saves repeated data entry
- Lesson plans can be printed or exported as PDF for school record-keeping and inspection visits (inspector can see lesson diary)
- Topics in lesson plans are tagged and used as topic filters in the Online Examinations question bank
- All pages: skeleton loaders, empty states, toast feedback

## Out of scope
- AI lesson plan generation (future enhancement)
- Integration with external curriculum providers (future)
- Student-facing lesson plan view (handled by Homework and LMS modules)
- Parent access to lesson plans (only via Homework references)

## Tasks

1. **DB migration — lesson planning tables** — Create migration `020-lesson-planning.ts` with:
   - `lesson_plans`: `(id UUID PK, school_id UUID NOT NULL, class_section_id UUID NOT NULL FK class_sections, subject_id UUID NOT NULL FK subjects, academic_year_id UUID NOT NULL FK academic_years, title VARCHAR(300) NOT NULL, description TEXT NULL, total_topics INT NOT NULL DEFAULT 0, completed_topics INT NOT NULL DEFAULT 0, total_estimated_periods INT NOT NULL DEFAULT 0, periods_conducted INT NOT NULL DEFAULT 0, completion_percent DECIMAL(5,2) GENERATED ALWAYS AS (CASE WHEN total_topics = 0 THEN 0 ELSE (completed_topics::DECIMAL / total_topics) * 100 END) STORED, status ENUM('draft','active','completed','archived') NOT NULL DEFAULT 'draft', created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ NULL)`.
   - Unique: `(school_id, class_section_id, subject_id, academic_year_id)` — one plan per subject per class per year.
   - Index: `(school_id, academic_year_id, class_section_id)`, `(school_id, subject_id, academic_year_id)`, `(school_id, created_by)`.
   - `lesson_topics`: `(id UUID PK, school_id UUID NOT NULL, lesson_plan_id UUID NOT NULL FK lesson_plans, parent_topic_id UUID NULL FK lesson_topics, chapter_name VARCHAR(200) NULL, topic_name VARCHAR(300) NOT NULL, description TEXT NULL, sequence_order INT NOT NULL, estimated_periods INT NOT NULL DEFAULT 1, learning_objectives TEXT NULL, teaching_methods TEXT NULL, materials_required TEXT NULL, reference_books TEXT NULL, activities TEXT NULL, topic_tag VARCHAR(100) NULL, is_completed BOOLEAN NOT NULL DEFAULT false, completed_date DATE NULL, actual_periods_used INT NULL, completion_notes TEXT NULL, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`.
   - Check: `(is_completed = true AND completed_date IS NOT NULL) OR (is_completed = false AND completed_date IS NULL)`.
   - Index: `(school_id, lesson_plan_id, sequence_order)`, `(school_id, lesson_plan_id, is_completed)`, `(school_id, topic_tag)` (for question bank linking).
   - `lesson_plan_copies`: `(id UUID PK, school_id UUID NOT NULL, source_plan_id UUID NOT NULL FK lesson_plans, target_plan_id UUID NOT NULL FK lesson_plans, copied_by UUID NOT NULL FK users, copied_at TIMESTAMPTZ)` — tracks copy history for audit purposes.
   - All composite indexes start with `school_id`.

2. **Lesson plans CRUD endpoints** — Teacher-facing plan management:
   - `POST /v1/lesson-planning/plans` — create plan. Body: `{ class_section_id, subject_id, academic_year_id, title, description? }`. Validates: class-section + subject combination belongs to school; no existing plan for this combination in this year (unique constraint). Sets status to `draft`. Permission: `lesson_planning.plan.create`. PBAC: teacher can only create for assigned class-sections and subjects. Audit logged.
   - `GET /v1/lesson-planning/plans` — list; filters: `class_section_id`, `subject_id`, `academic_year_id`, `status`, `created_by`. Paginated. Permission: `lesson_planning.plan.view`. PBAC: teacher sees own; admin/principal sees all.
   - `GET /v1/lesson-planning/plans/:id` — full plan with topic count, completion stats. Permission: `lesson_planning.plan.view`.
   - `PATCH /v1/lesson-planning/plans/:id` — update title, description, status. Permission: `lesson_planning.plan.update`. Audit logged.
   - `DELETE /v1/lesson-planning/plans/:id` — soft delete; only in draft or if all topics are incomplete. Permission: `lesson_planning.plan.delete`. Audit logged.
   - Full endpoint folders for each.

3. **Lesson plan lifecycle endpoints** —
   - `POST /v1/lesson-planning/plans/:id/activate` — sets status to `active`; validates at least 1 topic exists. Permission: `lesson_planning.plan.update`.
   - `POST /v1/lesson-planning/plans/:id/complete` — sets status to `completed`; validates all topics are marked complete. Permission: `lesson_planning.plan.update`.
   - `POST /v1/lesson-planning/plans/:id/archive` — sets status to `archived`. Permission: `lesson_planning.plan.update`.
   - Full endpoint folders.

4. **Lesson plan copy endpoint** — `POST /v1/lesson-planning/plans/:id/copy` — copies an existing plan (including all topics, clearing completion data) into a new academic year or the same year with a new title. Body: `{ target_academic_year_id, new_title?, target_class_section_id? }`. Creates new `lesson_plan` + all `lesson_topics` with `is_completed = false`, `completed_date = null`, `actual_periods_used = null`. Logs to `lesson_plan_copies`. Returns the new plan's id. Permission: `lesson_planning.plan.create`. Audit logged. Full endpoint folder.

5. **Lesson plan PDF export endpoint** — `GET /v1/lesson-planning/plans/:id/export` — generates and streams a PDF of the lesson diary. Format: school header, subject/class/teacher info, topics table (chapter, topic, description, objectives, methods, materials, reference, estimated/actual periods, completed date). Suitable for inspection visits. Returns `Content-Type: application/pdf`. Permission: `lesson_planning.plan.view`.

6. **Lesson topics CRUD endpoints** — Topic-level management within a plan:
   - `POST /v1/lesson-planning/plans/:planId/topics` — add topic. Body: `{ parent_topic_id?, chapter_name?, topic_name, description?, sequence_order, estimated_periods, learning_objectives?, teaching_methods?, materials_required?, reference_books?, activities?, topic_tag? }`. Updates parent plan's `total_topics` and `total_estimated_periods`. Permission: `lesson_planning.topic.manage`.
   - `GET /v1/lesson-planning/plans/:planId/topics` — list topics in tree structure (parent topics with nested sub-topics). No pagination (lesson plans are bounded in size). Permission: `lesson_planning.topic.view`.
   - `PATCH /v1/lesson-planning/plans/:planId/topics/:topicId` — update topic fields. Permission: `lesson_planning.topic.manage`.
   - `DELETE /v1/lesson-planning/plans/:planId/topics/:topicId` — delete topic; also deletes sub-topics. Updates parent plan counts. Only if topic is not completed. Permission: `lesson_planning.topic.manage`.
   - `PATCH /v1/lesson-planning/plans/:planId/topics/reorder` — bulk reorder: body: `{ order: [{ id, sequence_order }] }`. Permission: `lesson_planning.topic.manage`.
   - Full endpoint folders for each.

7. **Topic completion endpoint** — Core teaching diary action:
   - `POST /v1/lesson-planning/topics/:topicId/complete` — mark topic as taught. Body: `{ completed_date, actual_periods_used, completion_notes? }`. Sets `is_completed = true`. Updates parent plan's `completed_topics` and `periods_conducted` counts. Emits `lesson_planning.topic_completed` event. Permission: `lesson_planning.topic.manage`. PBAC: teacher who owns the plan.
   - `POST /v1/lesson-planning/topics/:topicId/reopen` — undo completion (admin override). Sets `is_completed = false`, clears completion data. Permission: `lesson_planning.topic.manage` + must be `admin` or `principal` (not just teacher). Audit logged.
   - Full endpoint folders.

8. **Syllabus progress report endpoint** — Admin/principal reporting:
   - `GET /v1/lesson-planning/reports/progress?academic_year_id=uuid&class_section_id=uuid&subject_id=uuid` — returns syllabus completion overview. Response: `{ plans: [{ plan_id, class_section_name, subject_name, teacher_name, total_topics, completed_topics, completion_percent, total_estimated_periods, periods_conducted, status }] }`. Filters are all optional — no filter returns all plans for the academic year. Permission: `lesson_planning.report.view`. Redis cache: 15 min TTL.
   - Full endpoint folder.

9. **Topic tags endpoint** — Used by Online Examinations question bank:
   - `GET /v1/lesson-planning/topic-tags?subject_id=uuid&academic_year_id=uuid` — returns distinct topic tags from all lesson topics for the given subject. Used as autocomplete values in question bank creation and online exam question filtering. Permission: `lesson_planning.topic.view`.
   - Full endpoint folder.

10. **Lesson Planning NestJS module** — Create `LessonPlanningModule` in `backend/src/modules/lesson-planning/`. Entities: `LessonPlanEntity`, `LessonTopicEntity`, `LessonPlanCopyEntity`. Import: `AcademicsModule`. Export `LessonTopicService` (so Online Examinations module can query topic tags). Register in `AppModule`. Create all entity files and module.ts.

11. **Permissions registration** — Add to `backend/src/config/permissions.ts`:
    - `lesson_planning.plan.view`, `lesson_planning.plan.create`, `lesson_planning.plan.update`, `lesson_planning.plan.delete`
    - `lesson_planning.topic.view`, `lesson_planning.topic.manage`
    - `lesson_planning.report.view`
    Default: `super_admin`, `admin`, `principal` — all. `teacher` — plan.view/create/update (own assignments PBAC), topic.view/manage (own plan PBAC), report.view. `parent`, `student` — no access.

12. **Frontend — Lesson plans list page** (`/dashboard/lesson-planning`) — Overview:
    - **Top bar**: Academic year selector, "My Plans" / "All Plans" toggle (teacher vs admin view), Class-Section filter, Subject filter, Status filter, "Create Plan" button.
    - **Plan cards grid**: Each card shows: subject chip (colored by subject type), class-section badge, plan title, teacher name (for admin view), completion progress bar (completed_topics/total_topics), period tracking (conducted/estimated), status badge (Draft/Active/Completed/Archived), last updated date, Actions dropdown (View, Copy, Export PDF, Archive).
    - **Quick stats bar** (admin only): Total active plans, Overall completion %, Plans behind schedule (< 50% at mid-year).
    - Skeleton loader (4 card shimmer). Empty state: "No lesson plans. Create your first plan."

13. **Frontend — Lesson plan detail page** (`/dashboard/lesson-planning/:planId`) — Full plan management:
    - **Header**: Plan title, subject chip, class-section, academic year, teacher name, status badge. Edit title inline. "Activate" / "Mark Complete" / "Export PDF" / "Copy to Next Year" action buttons.
    - **Progress summary row**: Animated progress bar (completion %) + stats chips: Topics X/Y, Periods X/Y estimated.
    - **Topics section**: Hierarchical tree view — chapters as collapsible sections, topics and sub-topics nested within. Each topic row: sequence number, topic name, estimated periods, actual periods (editable inline once completed), completion date, completion status (checkbox + green check icon when done). "Mark as Taught" button per topic opens a small popover with date picker + actual periods + notes. Topic actions: Edit, Add sub-topic, Delete, Reorder (drag handle).
    - **Add Topic** button opens slide-over form with all topic fields.
    - **Reorder mode toggle**: Enables drag-and-drop reordering of topics.
    - Skeleton loader for topics tree.

14. **Frontend — Syllabus progress report page** (`/dashboard/lesson-planning/reports`) — Admin/principal view:
    - Academic year selector + Class filter + Subject filter.
    - Data table: Teacher, Class-Section, Subject, Total Topics, Completed, %, Periods (Conducted/Estimated), Status badge. Sortable columns.
    - Color-coding: < 50% completion = red; 50–80% = amber; > 80% = green.
    - "Export Report" CSV button. Skeleton loader.

15. **Frontend — Lesson planning navigation** — Add to sidebar:
    - "My Plans" — `/dashboard/lesson-planning`
    - "Progress Report" — `/dashboard/lesson-planning/reports` (admin/principal only)
    Permission guard: `lesson_planning.plan.view`.

16. **Seed lesson planning data** — Update `seed.ts` to:
    - Create 1 active lesson plan for Mathematics, Grade 1-A, 2025–26.
    - Add 3 topics: "Chapter 1: Numbers 1–100" (10 periods), "Chapter 2: Addition" (8 periods), "Chapter 3: Subtraction" (8 periods).
    - Mark Chapter 1 as completed (2025-04-15, 10 periods used, notes: "Covered counting, writing, and ordering 1–100").

## Relevant files
- `backend/src/modules/lesson-planning/`
- `backend/src/modules/lesson-planning/entities/lesson-plan.entity.ts`
- `backend/src/modules/lesson-planning/entities/lesson-topic.entity.ts`
- `backend/src/modules/lesson-planning/entities/lesson-plan-copy.entity.ts`
- `backend/src/database/migrations/020-lesson-planning.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `backend/src/modules/academics/entities/class-section-subject.entity.ts`
- `backend/src/modules/online-examinations/services/question-bank.service.ts`
- `frontend/src/app/(dashboard)/lesson-planning/page.tsx`
- `frontend/src/app/(dashboard)/lesson-planning/[planId]/page.tsx`
- `frontend/src/app/(dashboard)/lesson-planning/reports/page.tsx`
- `frontend/src/components/modules/lesson-planning/PlanCard.tsx`
- `frontend/src/components/modules/lesson-planning/TopicsTree.tsx`
- `frontend/src/components/modules/lesson-planning/TopicCompletePopover.tsx`
- `frontend/src/hooks/use-lesson-planning.ts`
- `documentation/api-style-guide.md`
- `documentation/coding-guidelines.md`
- `documentation/agent-rules.md`
- `documentation/route-template.md`
