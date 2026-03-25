# Phase 3 — Student Portfolio (Module 29)

## What & Why
NEP 2020 mandates holistic development tracking beyond just marks, and the Student Portfolio module serves as the central repository for this "360-degree" view. It allows students and teachers to document achievements in academics, sports, arts, and social service, creating a permanent digital record of a student's school journey. This matters for Indian K-12 schools because it simplifies the creation of Holistic Progress Cards (HPC), assists in college applications, and provides parents with a tangible view of their child's diverse talents that are often missed by traditional report cards.

## Done looks like
- Teachers and students can create portfolio entries with rich descriptions, achievement levels, and metadata (event name, organizer, level).
- Multi-media artifacts (images, PDFs, video links) can be attached to any portfolio entry to provide evidence of work.
- Portfolio entries are organized into school-defined categories (Creative, Sports, Academic, etc.) with visual icons and colors.
- A "Featured" system allows students to highlight their best work on their main profile page.
- Skills tracking allows for qualitative assessment of proficiency levels (Beginner to Expert) across various non-academic domains.
- Digital badges can be awarded by teachers to recognize specific milestones or character traits.
- The portfolio integrates with the main student profile as a gallery-style showcase.
- A printable "Holistic Portfolio PDF" can be generated for parents or external use.
- Class-level "Achievement Walls" allow teachers to celebrate featured entries from all students in a section.
- Permission-based workflow: students can submit entries, but teachers or admins can "verify" or "feature" them.

## Out of scope
- Professional resume building for career placement (higher-ed focus).
- Social networking features (likes, comments, following other students).
- External public sharing of portfolios (limited to school-authenticated users).
- Integration with external sports or arts certification bodies.
- Automated grading of portfolio artifacts using AI.

## Tasks

1. **DB migration — portfolio core tables** — Create migration `029-student-portfolio.ts` with:
   - `portfolio_categories`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(100) NOT NULL, category_type ENUM('academic','creative','sports','cultural','social','character','other') NOT NULL, icon VARCHAR(50) NULL, color_hex VARCHAR(7) DEFAULT '#3B82F6', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Unique index: `(school_id, name)`.
   - `portfolio_entries`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, academic_year_id UUID NOT NULL FK academic_years, category_id UUID NOT NULL FK portfolio_categories, title VARCHAR(300) NOT NULL, description TEXT NULL, entry_date DATE NOT NULL, achievement_level ENUM('participation','merit','distinction','excellence') NULL, score_or_grade VARCHAR(50) NULL, event_name VARCHAR(300) NULL, organizer VARCHAR(300) NULL, level ENUM('class','school','inter_school','district','state','national','international') NULL, awarded_by VARCHAR(200) NULL, is_featured BOOLEAN DEFAULT false, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Indexes: `(school_id, student_id, category_id)`, `(school_id, is_featured)`.
   - `portfolio_artifacts`: `(id UUID PK, school_id UUID NOT NULL, entry_id UUID NOT NULL FK portfolio_entries, artifact_type ENUM('image','pdf','video_url','document','link') NOT NULL, file_url TEXT NOT NULL, file_name VARCHAR(300) NOT NULL, file_size_kb INT NULL, thumbnail_url TEXT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Index: `(school_id, entry_id)`.
   - `portfolio_skills`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, academic_year_id UUID NOT NULL FK academic_years, skill_name VARCHAR(200) NOT NULL, skill_category VARCHAR(100) NULL, proficiency_level ENUM('beginner','developing','proficient','advanced','expert') NOT NULL, evidenced_by_entry_id UUID NULL FK portfolio_entries, assessed_by UUID NOT NULL FK users, assessed_at DATE DEFAULT CURRENT_DATE, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Index: `(school_id, student_id, skill_name)`.
   - `portfolio_badges`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, badge_name VARCHAR(200) NOT NULL, badge_image_url TEXT NOT NULL, badge_description TEXT NULL, awarded_date DATE DEFAULT CURRENT_DATE, awarded_by UUID NOT NULL FK users, criteria_met TEXT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Index: `(school_id, student_id)`.
   - All composite indexes start with `school_id`.

2. **Portfolio Category Endpoints** — Manage the organizational structure:
   - `POST /v1/portfolio/categories`, `GET /v1/portfolio/categories`, `PATCH /v1/portfolio/categories/:id`, `DELETE /v1/portfolio/categories/:id`.
   - Permission: `portfolio.category.manage`.
   - Roles: `super_admin`, `admin`.

3. **Portfolio Entry Endpoints** — Core content management:
   - `POST /v1/portfolio/entries` — Create entry with optional artifacts. Body: `{ student_id, academic_year_id, category_id, title, description, entry_date, achievement_level?, score_or_grade?, event_name?, organizer?, level?, awarded_by?, artifacts: [{ type, url, name, size }] }`. Permission: `portfolio.entry.create`.
   - `GET /v1/portfolio/students/:studentId` — Full portfolio for a student. Filters: `category_id`, `academic_year_id`, `is_featured`. Permission: `portfolio.entry.view`.
   - `PATCH /v1/portfolio/entries/:id` — Update details or toggle `is_featured`. Permission: `portfolio.entry.manage`.
   - `DELETE /v1/portfolio/entries/:id`. Permission: `portfolio.entry.manage`.
   - `GET /v1/portfolio/class-sections/:id/featured` — Get featured entries for a class section (for the achievement wall). Permission: `portfolio.entry.view`.

4. **Skill & Badge Endpoints** — Recognition and assessment:
   - `POST /v1/portfolio/skills` — Assess a student's skill. Permission: `portfolio.skill.manage`.
   - `GET /v1/portfolio/students/:studentId/skills` — Get skill history/radar data. Permission: `portfolio.skill.view`.
   - `POST /v1/portfolio/badges/award` — Award badge to student. Body: `{ student_id, badge_name, badge_image_url, criteria_met }`. Permission: `portfolio.badge.award`.
   - `GET /v1/portfolio/students/:studentId/badges`. Permission: `portfolio.entry.view`.

5. **Portfolio PDF Generation** — Exporting the holistic record:
   - `POST /v1/portfolio/students/:studentId/export-pdf` — Async BullMQ job using Puppeteer to generate a formatted portfolio. Returns `job_id`.
   - Permission: `portfolio.report.view`.

6. **Portfolio NestJS Module Wiring** — Create `PortfolioModule` in `backend/src/modules/portfolio/`. Entities: `PortfolioCategoryEntity`, `PortfolioEntryEntity`, `PortfolioArtifactEntity`, `PortfolioSkillEntity`, `PortfolioBadgeEntity`. Import `StudentsModule`, `AcademicsModule`. Register in `AppModule`.

7. **Permissions Registration** — Add to `backend/src/config/permissions.ts`:
   - `portfolio.category.manage`
   - `portfolio.entry.view`, `portfolio.entry.create`, `portfolio.entry.manage`
   - `portfolio.skill.view`, `portfolio.skill.manage`
   - `portfolio.badge.award`
   - `portfolio.report.view`
   - Default assignments: `super_admin`, `admin`, `principal` — all. `teacher` — entry.view/create/manage (own students), skill.manage, badge.award, report.view. `student` — entry.view (own), entry.create (own), skill.view (own). `parent` — entry.view (own children), skill.view (own children).

8. **Frontend — Student Portfolio Page** (`/dashboard/students/:id/portfolio`):
   - **Header**: Student summary, "Export PDF" button, "Add Entry" button.
   - **Filters**: Academic year dropdown, Category tabs (All, Creative, Sports, etc.).
   - **Main Content**: A responsive grid of cards. Each card shows: category icon/color, title, date, achievement level badge, and a thumbnail of the primary artifact.
   - **Entry Detail Modal**: Shows full description, all artifacts (image gallery / PDF viewer / video player), and metadata.
   - **Skills & Badges Sidebar**: Radar chart for skills proficiency and a "Trophy Case" for badges.
   - Empty state: "No portfolio entries yet. Start documenting achievements!"

9. **Frontend — Entry Creation Form**:
   - Slide-over or Modal.
   - Fields: Category (select), Title (input), Date (picker), Description (textarea), Level (dropdown), Achievement (dropdown).
   - Artifact Upload: Multi-file drag-and-drop area. Preview thumbnails for images.
   - Validation: Title and Category required.

10. **Frontend — Achievement Wall** (`/dashboard/academics/sections/:id/achievements`):
    - A masonry grid layout showing featured portfolio entries from all students in the class.
    - Designed for classroom display or parent orientations to celebrate success.

11. **Seed Portfolio Data** — Update `seed.ts`:
    - 3 categories: Academic, Sports, Creative Arts.
    - 2 entries for `ADM-2025-001`:
        - Academic: "Math Olympiad Participation", Merit level, District level, Image artifact of certificate.
        - Sports: "Annual Sports Day 100m Sprint", Excellence level, School level, Image artifact of medal.
    - 1 Skill Assessment: "Public Speaking", Proficient level for `ADM-2025-001`.
    - 1 Badge: "Star Student", awarded for "Helping classmates with Math".

## Relevant files
- `backend/src/modules/portfolio/`
- `backend/src/modules/portfolio/entities/portfolio-category.entity.ts`
- `backend/src/modules/portfolio/entities/portfolio-entry.entity.ts`
- `backend/src/modules/portfolio/entities/portfolio-artifact.entity.ts`
- `backend/src/modules/portfolio/entities/portfolio-skill.entity.ts`
- `backend/src/modules/portfolio/entities/portfolio-badge.entity.ts`
- `backend/src/database/migrations/029-student-portfolio.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/students/[id]/portfolio/page.tsx`
- `frontend/src/components/modules/portfolio/PortfolioCard.tsx`
- `frontend/src/components/modules/portfolio/AchievementWall.tsx`
- `frontend/src/hooks/use-portfolio.ts`
