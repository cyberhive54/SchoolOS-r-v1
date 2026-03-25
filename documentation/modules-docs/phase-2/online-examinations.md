# Phase 2 — Online Examination System (Module 7)

## What & Why
Build the Online Examination System — a computer-based assessment platform integrated into SchoolOS. This is distinct from the paper-based Examinations module (Module 6). Online exams allow teachers to create digital question banks, schedule timed online tests, have students attempt them on any device, and get auto-graded results instantly. Particularly powerful for: unit tests on digital devices (1:1 device schools), home assignments with auto-scoring, practice tests, and quiz-style formative assessments. This is a Layer 3 Academic Operations module. Depends on Students, Academics, and the paper Examinations module (optional — online exam results can be pushed into the marks ledger). Must be secure enough to discourage tab-switching and copy-paste but does not require proctoring hardware (full proctoring is a future feature).

## Done looks like
- Teachers can create a question bank per subject with multiple question types: Multiple Choice (single), Multiple Select (multi), True/False, Fill in the Blank, Short Answer (manual grading), Match the Following
- Each question carries marks, difficulty level (easy/medium/hard), and optional topic tag (linked to Lesson Planning syllabus topics)
- Teachers can create online exams selecting questions from the bank (manual selection or random pick by topic/difficulty)
- Online exams have configurable settings: duration, start time, end time, shuffle questions, shuffle options, show result immediately or after review, allow re-attempt (yes/no, max N attempts)
- Students can attempt exams from the student portal or parent app — timer visible, auto-submits on timeout
- Auto-grading for objective questions (MCQ, T/F, Fill in the Blank with exact match). Manual grading required for Short Answer
- After submission: student sees result immediately (if configured); teacher sees attempt list and can override scores for short answers
- Results of online exams can optionally be pushed into the paper-based Examinations module marks ledger (marks import)
- Teachers can see attempt analytics: average score, question-wise correct rate, topic-wise performance
- Full frontend: question bank editor, exam builder, result dashboard, student attempt interface

## Out of scope
- Full AI-powered proctoring (camera monitoring, eye tracking) — future Phase
- CBSE online exam submission integration (external)
- Third-party LMS SCORM content import

## Tasks

1. **DB migration — online examinations** — Create migration `018-online-examinations.ts` with:
   - `question_banks`: `(id UUID PK, school_id UUID NOT NULL, subject_id UUID NOT NULL FK subjects, academic_year_id UUID NOT NULL FK academic_years, name VARCHAR(200) NOT NULL, description TEXT NULL, is_active BOOLEAN DEFAULT true, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Index: `(school_id, subject_id)`.
   - `questions`: `(id UUID PK, school_id UUID NOT NULL, question_bank_id UUID NOT NULL FK question_banks, question_type ENUM('mcq_single','mcq_multi','true_false','fill_blank','short_answer','match_following') NOT NULL, question_text TEXT NOT NULL, question_image_url TEXT NULL, marks DECIMAL(5,2) NOT NULL DEFAULT 1, negative_marks DECIMAL(5,2) NOT NULL DEFAULT 0, difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium', topic_tag VARCHAR(100) NULL, explanation TEXT NULL, is_active BOOLEAN DEFAULT true, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Index: `(school_id, question_bank_id, difficulty)`, `(school_id, question_bank_id, topic_tag)`.
   - `question_options`: `(id UUID PK, school_id UUID NOT NULL, question_id UUID NOT NULL FK questions, option_text TEXT NOT NULL, option_image_url TEXT NULL, is_correct BOOLEAN NOT NULL DEFAULT false, sequence_order INT NOT NULL, match_pair_key VARCHAR(200) NULL)`. Index: `(school_id, question_id)`.
   - `online_exams`: `(id UUID PK, school_id UUID NOT NULL, academic_year_id UUID NOT NULL FK academic_years, question_bank_id UUID NOT NULL FK question_banks, class_section_id UUID NOT NULL FK class_sections, subject_id UUID NOT NULL FK subjects, title VARCHAR(200) NOT NULL, instructions TEXT NULL, total_marks DECIMAL(6,2) NOT NULL, duration_minutes INT NOT NULL, start_datetime TIMESTAMPTZ NULL, end_datetime TIMESTAMPTZ NULL, shuffle_questions BOOLEAN DEFAULT false, shuffle_options BOOLEAN DEFAULT false, show_result_immediately BOOLEAN DEFAULT true, allow_reattempt BOOLEAN DEFAULT false, max_attempts INT NOT NULL DEFAULT 1, passing_percent DECIMAL(5,2) NOT NULL DEFAULT 35.00, status ENUM('draft','scheduled','active','completed','cancelled') NOT NULL DEFAULT 'draft', linked_exam_schedule_id UUID NULL FK exam_schedules, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Index: `(school_id, class_section_id, status)`, `(school_id, academic_year_id)`.
   - `online_exam_questions`: `(id UUID PK, school_id UUID NOT NULL, online_exam_id UUID NOT NULL FK online_exams, question_id UUID NOT NULL FK questions, sequence_order INT NOT NULL, marks DECIMAL(5,2) NOT NULL)`. Unique: `(school_id, online_exam_id, question_id)`. Index: `(school_id, online_exam_id)`.
   - `exam_attempts`: `(id UUID PK, school_id UUID NOT NULL, online_exam_id UUID NOT NULL FK online_exams, student_id UUID NOT NULL FK students, enrollment_id UUID NOT NULL FK student_enrollments, attempt_number INT NOT NULL DEFAULT 1, status ENUM('started','in_progress','submitted','timed_out','abandoned') NOT NULL DEFAULT 'started', started_at TIMESTAMPTZ NOT NULL DEFAULT now(), submitted_at TIMESTAMPTZ NULL, timed_out_at TIMESTAMPTZ NULL, total_marks_obtained DECIMAL(6,2) NULL, percentage DECIMAL(5,2) NULL, is_pass BOOLEAN NULL, is_graded BOOLEAN DEFAULT false, graded_by UUID NULL FK users, graded_at TIMESTAMPTZ NULL, ip_address INET NULL, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Unique: `(school_id, online_exam_id, student_id, attempt_number)`. Index: `(school_id, online_exam_id, status)`, `(school_id, student_id)`.
   - `attempt_answers`: `(id UUID PK, school_id UUID NOT NULL, attempt_id UUID NOT NULL FK exam_attempts, question_id UUID NOT NULL FK questions, selected_option_ids UUID[] NULL, text_answer TEXT NULL, is_correct BOOLEAN NULL, marks_awarded DECIMAL(5,2) NULL, is_manually_graded BOOLEAN DEFAULT false, answered_at TIMESTAMPTZ NULL, time_spent_seconds INT NULL)`. Unique: `(school_id, attempt_id, question_id)`. Index: `(school_id, attempt_id)`.
   - All composite indexes start with `school_id`.

2. **Question bank endpoints** — Full CRUD:
   - `POST /v1/online-exams/question-banks` — create bank; body: `{ subject_id, academic_year_id, name, description? }`. Permission: `online_exams.question_bank.manage`.
   - `GET /v1/online-exams/question-banks` — filters: `subject_id`, `academic_year_id`. Permission: `online_exams.question_bank.view`.
   - `GET /v1/online-exams/question-banks/:id` — with question count per difficulty/type summary. Permission: `online_exams.question_bank.view`.
   - `PATCH /v1/online-exams/question-banks/:id`, `DELETE /v1/online-exams/question-banks/:id`. Permission: `online_exams.question_bank.manage`.
   - Full endpoint folders.

3. **Questions CRUD endpoints** — Within a question bank:
   - `POST /v1/online-exams/question-banks/:bankId/questions` — create question with options. Body: `{ question_type, question_text, question_image_url?, marks, negative_marks?, difficulty, topic_tag?, explanation?, options: [{ option_text, option_image_url?, is_correct, sequence_order, match_pair_key? }] }`. Validates: MCQ_single must have exactly 1 correct option; MCQ_multi must have ≥ 2 correct options; True/False must have exactly 2 options (True, False). Permission: `online_exams.question_bank.manage`.
   - `GET /v1/online-exams/question-banks/:bankId/questions` — list with filters: `question_type`, `difficulty`, `topic_tag`, `q` (text search on question_text). Paginated. Permission: `online_exams.question_bank.view`.
   - `GET /v1/online-exams/questions/:id` — full question with options. Permission: `online_exams.question_bank.view`.
   - `PATCH /v1/online-exams/questions/:id` — update question and its options. Permission: `online_exams.question_bank.manage`.
   - `DELETE /v1/online-exams/questions/:id` — soft delete (sets `is_active = false`); blocked if question is used in an active exam. Permission: `online_exams.question_bank.manage`.
   - `POST /v1/online-exams/question-banks/:bankId/questions/bulk-import` — JSON body: `{ questions: [...] }`. Max 50 questions per request. Idempotency-Key required. Permission: `online_exams.question_bank.manage`.
   - Full endpoint folders.

4. **Online exam CRUD endpoints** — Exam creation and management:
   - `POST /v1/online-exams` — create exam. Body: `{ question_bank_id, class_section_id, subject_id, academic_year_id, title, instructions?, total_marks, duration_minutes, start_datetime?, end_datetime?, shuffle_questions, shuffle_options, show_result_immediately, allow_reattempt, max_attempts, passing_percent, linked_exam_schedule_id? }`. Permission: `online_exams.exam.manage`. Audit logged.
   - `GET /v1/online-exams` — list; filters: `class_section_id`, `status`, `academic_year_id`, `subject_id`. Paginated. Permission: `online_exams.exam.view`.
   - `GET /v1/online-exams/:id`. Permission: `online_exams.exam.view`.
   - `PATCH /v1/online-exams/:id` — only allowed in `draft` or `scheduled` status. Permission: `online_exams.exam.manage`.
   - `DELETE /v1/online-exams/:id` — only if status is `draft`. Permission: `online_exams.exam.manage`.
   - Full endpoint folders.

5. **Question assignment endpoints** — Assign questions to an online exam:
   - `POST /v1/online-exams/:examId/questions` — manually add questions. Body: `{ question_ids: [uuid], marks_override?: { [question_id]: marks } }`. Permission: `online_exams.exam.manage`.
   - `POST /v1/online-exams/:examId/questions/auto-pick` — random auto-pick. Body: `{ rules: [{ topic_tag?, difficulty, count, marks }] }`. Selects random questions from the linked bank. Permission: `online_exams.exam.manage`.
   - `DELETE /v1/online-exams/:examId/questions/:questionId`. Permission: `online_exams.exam.manage`.
   - `GET /v1/online-exams/:examId/questions` — list questions in the exam with order. Permission: `online_exams.exam.view`.
   - Full endpoint folders.

6. **Exam lifecycle endpoints** — Status management:
   - `POST /v1/online-exams/:id/activate` — transitions status to `active`; validates: questions assigned; start/end times set. Permission: `online_exams.exam.manage`.
   - `POST /v1/online-exams/:id/cancel` — body: `{ reason }`. Sets status to `cancelled`. Only if no attempts started. Permission: `online_exams.exam.manage`.
   - `POST /v1/online-exams/:id/complete` — manually mark exam as completed (normally auto-transitions when end_datetime passes via cron job). Permission: `online_exams.exam.manage`.
   - Full endpoint folders.

7. **Exam attempt endpoints** — Student-facing attempt flow:
   - `POST /v1/online-exams/:examId/attempts/start` — student starts an attempt. Validates: exam is active; student is enrolled in the class-section; student has not exceeded max_attempts. Creates `exam_attempt` record with `status = 'started'`. Returns the exam with questions (shuffled if configured) — but NOT the correct answers. Permission: `online_exams.attempt.start`. (Student role has this by default.)
   - `GET /v1/online-exams/attempts/:attemptId` — returns attempt status and questions (for resuming). Only accessible by the student who owns the attempt. Permission: `online_exams.attempt.view`.
   - `PUT /v1/online-exams/attempts/:attemptId/answers` — save/update answers (idempotent, call on every answer change for auto-save). Body: `{ answers: [{ question_id, selected_option_ids?, text_answer? }] }`. Validates attempt is still in_progress; exam not expired. Updates `answered_at`, `time_spent_seconds`. Permission: `online_exams.attempt.answer`.
   - `POST /v1/online-exams/attempts/:attemptId/submit` — student submits the exam. Triggers auto-grading for objective questions. Sets `status = 'submitted'`, `submitted_at`. Emits `online_exam.attempt_submitted`. Returns result (if `show_result_immediately = true`). Permission: `online_exams.attempt.submit`.
   - Full endpoint folders.

8. **Auto-grading and manual grading endpoints** — Post-submission:
   - `POST /v1/online-exams/attempts/:attemptId/grade` — manual grade short-answer questions. Body: `{ grades: [{ question_id, marks_awarded, feedback? }] }`. Sets `is_manually_graded = true`. Recomputes `total_marks_obtained`. Permission: `online_exams.attempt.grade`.
   - `GET /v1/online-exams/:examId/results` — list all attempt results for an exam with student names. Permission: `online_exams.results.view`.
   - `GET /v1/online-exams/attempts/:attemptId/result` — detailed result: per-question correct/incorrect/marks. Only accessible by attempt owner or teacher. Permission: `online_exams.results.view`.
   - `POST /v1/online-exams/:examId/push-to-marks-ledger` — push online exam results into the linked `exam_schedule` marks ledger (calls ExaminationsModule service). Only if `linked_exam_schedule_id` is set and exam is completed. Permission: `online_exams.exam.manage`.
   - Full endpoint folders.

9. **Analytics endpoints** — Teacher-facing analytics:
   - `GET /v1/online-exams/:examId/analytics` — exam-level analytics: `{ total_attempts, submitted, average_score, median_score, pass_count, fail_count, score_distribution: [...], question_analytics: [{ question_id, correct_rate, avg_time_seconds }], topic_analytics: [{ topic, correct_rate }] }`. Permission: `online_exams.results.view`.
   - Full endpoint folder.

10. **Online Examinations NestJS module** — Create `OnlineExaminationsModule` in `backend/src/modules/online-examinations/`. Entities: all 7 entities. Import: `StudentsModule`, `AcademicsModule`, `ExaminationsModule` (for marks ledger push). Export `OnlineExamAttemptService`. Register in `AppModule`. Add auto-grading logic to `OnlineExamAttemptService`. Create all entity files and module.ts.

11. **Permissions registration** — Add to `backend/src/config/permissions.ts`:
    - `online_exams.question_bank.view`, `online_exams.question_bank.manage`
    - `online_exams.exam.view`, `online_exams.exam.manage`
    - `online_exams.attempt.start`, `online_exams.attempt.view`, `online_exams.attempt.answer`, `online_exams.attempt.submit`
    - `online_exams.attempt.grade`
    - `online_exams.results.view`
    Default: `super_admin`, `admin`, `principal` — all. `teacher` — question_bank.view/manage, exam.view/manage, attempt.grade, results.view. `student` — attempt.start/view/answer/submit, results.view (own only PBAC).

12. **Frontend — Question bank management page** (`/dashboard/online-examinations/question-banks`) — Two-panel layout:
    - **Left panel**: List of question banks (subject + name). "Create Bank" button. Search. Click → loads questions in right panel.
    - **Right panel**: Question list with type icon, difficulty badge, marks, topic tag, question text preview. "Add Question" button. Filter by type/difficulty/topic. Pagination. Skeleton loader.
    - **Question form** (slide-over): Type selector (MCQ Single/Multi, T/F, Fill Blank, Short Answer, Match). Dynamic form based on type: MCQ shows option builder with "is correct" toggle; Match shows pairs editor; Fill Blank highlights the blank in question text. Marks, difficulty, topic inputs. Zod validation.

13. **Frontend — Exam builder page** (`/dashboard/online-examinations/exams/new`) — Multi-step wizard:
    - **Step 1**: Basic info — title, class-section, subject, academic year, instructions.
    - **Step 2**: Settings — duration, start/end datetime, shuffle options, result visibility, re-attempt settings, passing percent.
    - **Step 3**: Question selection — tab between "Manual select" (searchable question list with checkboxes; total marks shown) and "Auto-pick" (rules builder: add rule rows with topic, difficulty, count, marks).
    - **Step 4**: Review — summary of all settings and selected questions. "Save as Draft" or "Schedule" buttons.
    - Progress indicator at top. Back/Next navigation.

14. **Frontend — Exam list and management page** (`/dashboard/online-examinations/exams`) — Table:
    - Columns: Title, Class-Section, Subject, Status badge, Duration, Start Time, Attempts, Actions.
    - Status filter. "Create Exam" button.
    - Row actions: Edit (if draft), Activate, Cancel, View Results, Analytics.
    - Skeleton loader. Empty state.

15. **Frontend — Student attempt interface** (`/dashboard/online-examinations/attempt/:attemptId`) — Full-screen exam interface:
    - **Header** (sticky): School logo, exam title, timer countdown (red when < 5 min), question counter (X of N), "Submit Exam" button.
    - **Question pane** (center): Question number and text. Image (if any). Answer input based on type (radio for MCQ single, checkboxes for MCQ multi, toggle for T/F, text input for fill/short answer, drag pairs for match). Mark for review button.
    - **Navigator** (right sidebar): Grid of question numbers, colored by status (answered=blue, marked for review=amber, unanswered=grey). Click to jump.
    - Auto-save on every answer with 1-second debounce. Timer auto-submits on expiry.
    - Confirmation modal before final submit.

16. **Frontend — Results page** (`/dashboard/online-examinations/:examId/results`) — Table of all student attempts with filters. Click student → detailed answer review with correct/incorrect indicators and teacher grading panel for short answers.

17. **Seed online exam data** — Update `seed.ts` to:
    - Create 1 question bank for Mathematics, 2025–26 academic year.
    - Add 5 sample MCQ questions (easy/medium, linked to topics "Addition", "Subtraction").
    - Create 1 online exam for Grade 1-A, Mathematics, 15 min duration, status draft.
    - Assign all 5 questions to the exam.

## Relevant files
- `backend/src/modules/online-examinations/`
- `backend/src/modules/online-examinations/entities/question-bank.entity.ts`
- `backend/src/modules/online-examinations/entities/question.entity.ts`
- `backend/src/modules/online-examinations/entities/question-option.entity.ts`
- `backend/src/modules/online-examinations/entities/online-exam.entity.ts`
- `backend/src/modules/online-examinations/entities/online-exam-question.entity.ts`
- `backend/src/modules/online-examinations/entities/exam-attempt.entity.ts`
- `backend/src/modules/online-examinations/entities/attempt-answer.entity.ts`
- `backend/src/database/migrations/018-online-examinations.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `backend/src/modules/examinations/entities/exam-schedule.entity.ts`
- `frontend/src/app/(dashboard)/online-examinations/question-banks/page.tsx`
- `frontend/src/app/(dashboard)/online-examinations/exams/page.tsx`
- `frontend/src/app/(dashboard)/online-examinations/attempt/[attemptId]/page.tsx`
- `frontend/src/components/modules/online-examinations/QuestionBuilder.tsx`
- `frontend/src/components/modules/online-examinations/ExamAttemptInterface.tsx`
- `frontend/src/components/modules/online-examinations/QuestionNavigator.tsx`
- `frontend/src/hooks/use-online-exams.ts`
- `documentation/api-style-guide.md`
- `documentation/coding-guidelines.md`
- `documentation/agent-rules.md`
- `documentation/route-template.md`
