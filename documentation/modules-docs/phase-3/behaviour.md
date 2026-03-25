# Phase 3 — Behaviour Management (Module 9)

## What & Why
Build the Behaviour Management module — a critical tool for maintaining school discipline and encouraging positive reinforcement in Indian K-12 schools. Beyond just tracking "incidents," this module allows schools to implement a "house points" or "merit/demerit" system that fosters healthy competition and character building. Teachers can quickly log incidents (negative) or rewards (positive), ensuring that a student's non-academic profile is as well-documented as their grades. This data feeds into the holistic progress cards required by NEP 2020 and provides parents with timely updates on their child's conduct, moving beyond once-a-term surprises during parent-teacher meetings.

## Done looks like
- Admins can define behavior categories with associated point values (positive for rewards, negative for incidents) and severity levels.
- Teachers and staff can quickly log disciplinary incidents with details like location, witnesses, and description.
- Teachers can award merit points/rewards to students for academic achievement, helpfulness, or sportsmanship.
- A status workflow for incidents: Open → Under Review → Resolved or Escalated to Principal.
- Action tracking for incidents: record verbal warnings, parent meetings, suspensions, or counseling sessions.
- Student Behavior Summary: a 360-degree view for each student showing net points, incident history, and rewards timeline.
- Class Leaderboard: shows top students by merit points to encourage positive behavior.
- Automated parent notifications: parents are alerted via the portal/app when an incident is logged or a reward is given.
- Behavior trends report: school-wide analytics showing incident hotspots (location) and frequent categories (e.g., "Late to school").
- All pages feature skeleton loaders, empty states, and responsive design for quick entry on mobile devices.

## Out of scope
- Automated AI-based sentiment analysis of incident descriptions.
- Integration with external juvenile justice or legal systems.
- CCTV footage integration or automated face-recognition incident logging.
- Detailed psychological counseling notes (handled in a separate sensitive health/counseling sub-module if needed).

## Tasks

1. **DB migration — behaviour management tables** — Create migration `027-behaviour-management.ts` with:
   - `behaviour_categories`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(100) NOT NULL, category_type ENUM('positive','negative') NOT NULL, points INT NOT NULL, severity ENUM('low','medium','high') NOT NULL DEFAULT 'low', is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. 
     - Unique index: `(school_id, name, category_type)`.
   - `behaviour_incidents`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, academic_year_id UUID NOT NULL FK academic_years, incident_date DATE NOT NULL, category_id UUID NOT NULL FK behaviour_categories, title VARCHAR(300) NOT NULL, description TEXT NULL, location VARCHAR(200) NULL, witnesses TEXT NULL, reported_by UUID NOT NULL FK users, assigned_to UUID NULL FK users, status ENUM('open','under_review','resolved','escalated') NOT NULL DEFAULT 'open', resolution TEXT NULL, resolved_at TIMESTAMPTZ NULL, parent_notified BOOLEAN DEFAULT false, parent_notified_at TIMESTAMPTZ NULL, follow_up_required BOOLEAN DEFAULT false, follow_up_date DATE NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Index: `(school_id, student_id, academic_year_id)`, `(school_id, status)`, `(school_id, incident_date)`.
   - `behaviour_actions`: `(id UUID PK, school_id UUID NOT NULL, incident_id UUID NOT NULL FK behaviour_incidents, action_type ENUM('verbal_warning','written_warning','detention','suspension','expulsion','counselling','parent_meeting','community_service','other') NOT NULL, action_date DATE NOT NULL, action_details TEXT NULL, taken_by UUID NOT NULL FK users, acknowledged_by_parent BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Index: `(school_id, incident_id)`.
   - `behaviour_rewards`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, academic_year_id UUID NOT NULL FK academic_years, reward_date DATE NOT NULL, category_id UUID NOT NULL FK behaviour_categories, title VARCHAR(300) NOT NULL, description TEXT NULL, points INT NOT NULL, awarded_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Index: `(school_id, student_id, academic_year_id)`, `(school_id, reward_date)`.
   - `behaviour_student_summary`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, academic_year_id UUID NOT NULL FK academic_years, total_positive_points INT DEFAULT 0, total_negative_points INT DEFAULT 0, net_points INT GENERATED ALWAYS AS (total_positive_points - total_negative_points) STORED, total_incidents INT DEFAULT 0, total_rewards INT DEFAULT 0, last_updated TIMESTAMPTZ DEFAULT now())`.
     - Unique index: `(school_id, student_id, academic_year_id)`.
   - All composite indexes MUST start with `school_id`.

2. **Behaviour categories endpoints** — CRUD for managing behaviour types:
   - `GET /v1/behaviour/categories` — List all categories; filters: `category_type`, `is_active`. Permission: `behaviour.category.view`.
   - `POST /v1/behaviour/categories` — Create category. Body: `{ name, category_type, points, severity, is_active }`. Permission: `behaviour.category.manage`.
   - `PATCH /v1/behaviour/categories/:id` — Update category. Permission: `behaviour.category.manage`.
   - `DELETE /v1/behaviour/categories/:id` — Soft delete; only if no incidents/rewards linked. Permission: `behaviour.category.manage`.

3. **Behaviour incidents endpoints** — Disciplinary workflow:
   - `POST /v1/behaviour/incidents` — Log an incident. Body: `{ student_id, academic_year_id, incident_date, category_id, title, description?, location?, witnesses? }`. Sets `reported_by = req.user.id`. Updates `behaviour_student_summary`. Emits `behaviour.incident_logged`. Permission: `behaviour.incident.create`. **Requires `Idempotency-Key`**.
   - `GET /v1/behaviour/incidents` — List incidents; filters: `student_id`, `status`, `category_id`, `date_range`. Paginated. Permission: `behaviour.incident.view`.
   - `GET /v1/behaviour/incidents/:id` — Detailed view with actions. Permission: `behaviour.incident.view`.
   - `PATCH /v1/behaviour/incidents/:id` — Update status, resolution, or assign to staff. Permission: `behaviour.incident.manage`.
   - `POST /v1/behaviour/incidents/:id/actions` — Add an action taken (e.g., warning). Body: `{ action_type, action_date, action_details }`. Permission: `behaviour.incident.manage`.
   - `POST /v1/behaviour/incidents/:id/notify-parent` — Manual trigger to notify parents. Emits `behaviour.parent_notified`. Permission: `behaviour.incident.manage`.

4. **Behaviour rewards endpoints** — Positive reinforcement:
   - `POST /v1/behaviour/rewards` — Award merit points. Body: `{ student_id, academic_year_id, reward_date, category_id, title, description?, points }`. Updates `behaviour_student_summary`. Emits `behaviour.reward_awarded`. Permission: `behaviour.reward.create`. **Requires `Idempotency-Key`**.
   - `GET /v1/behaviour/rewards` — List rewards; filters: `student_id`, `academic_year_id`. Permission: `behaviour.reward.view`.

5. **Behaviour reports & summary endpoints** — Analytics:
   - `GET /v1/behaviour/students/:id/summary` — aggregate behavior data for a student. Response: `{ net_points, total_incidents, total_rewards, incident_history: [], reward_history: [] }`. Permission: `behaviour.incident.view`.
   - `GET /v1/behaviour/reports/leaderboard` — Get top students by merit points. Query params: `class_section_id`, `academic_year_id`, `limit`. Permission: `behaviour.report.view`.
   - `GET /v1/behaviour/reports/trends` — Aggregate stats for school dashboard (incidents by category, month-wise trend). Permission: `behaviour.report.view`.

6. **Behaviour module NestJS wiring** — Create `BehaviourModule` in `backend/src/modules/behaviour/`. Entities: `BehaviourCategory`, `BehaviourIncident`, `BehaviourAction`, `BehaviourReward`, `BehaviourStudentSummary`. Import `StudentsModule`, `AcademicsModule`. Export `BehaviourService` (for report card integration). Register in `AppModule`.

7. **Permissions registration** — Add to `backend/src/config/permissions.ts`:
   - `behaviour.category.view`, `behaviour.category.manage`
   - `behaviour.incident.view`, `behaviour.incident.create`, `behaviour.incident.manage`
   - `behaviour.reward.view`, `behaviour.reward.create`
   - `behaviour.report.view`
   - Default assignments: `super_admin`, `admin`, `principal` — all. `teacher` — incident.view/create, reward.view/create, report.view. `parent` — incident.view (own children), reward.view (own children). `student` — reward.view (own).

8. **Frontend — Incident Logging & Timeline** — UI components:
   - **Incident Form** (`/dashboard/behaviour/incidents/new`): Quick-entry form with searchable student dropdown, category selector (negative types), and rich text for description.
   - **Student Behaviour Tab** (`/dashboard/students/:id?tab=behaviour`): A chronological timeline showing both incidents (red cards) and rewards (green cards) with net points summary at the top.
   - **Leaderboard Widget** (`/dashboard/behaviour/leaderboard`): A visual podium or list showing top students in a class or school.
   - **Behaviour Dashboard** (`/dashboard/behaviour/reports`): Charts showing incident frequency by month and category-wise distribution.

9. **Seed behaviour data** — Update `seed.ts` to:
   - Insert 5 behavior categories (3 negative: "Late to school" -5, "Disruptive behaviour" -10, "Bullying" -25; 2 positive: "Helped classmate" +5, "Academic achievement" +15).
   - Create one reward (+15) for demo student `ADM-2025-001` for "Excellent Science Project".
   - Create one incident (-5) for demo student `ADM-2025-001` for "Late to school" with "Open" status.

## Relevant files
- `backend/src/modules/behaviour/behaviour.module.ts`
- `backend/src/modules/behaviour/entities/*.entity.ts`
- `backend/src/modules/behaviour/endpoints/*`
- `backend/src/database/migrations/027-behaviour-management.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/behaviour/page.tsx`
- `frontend/src/app/(dashboard)/behaviour/incidents/new/page.tsx`
- `frontend/src/app/(dashboard)/behaviour/reports/page.tsx`
- `frontend/src/components/modules/behaviour/IncidentForm.tsx`
- `frontend/src/components/modules/behaviour/BehaviourTimeline.tsx`
- `frontend/src/hooks/use-behaviour.ts`
