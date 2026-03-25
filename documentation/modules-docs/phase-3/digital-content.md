# Phase 3 — Digital Content Center (Module 30)

## What & Why
The Digital Content Center is the central digital asset library for the school, providing a structured repository for curriculum-aligned materials, institutional notices, and general educational resources. This is distinct from an LMS (which focus on structured courses/assessments) by being a lightweight, searchable file repository accessible to all stakeholders. In Indian K-12 schools, this is crucial for distributing the Annual Syllabus, Previous Year Question Papers (PYQs), Holiday Homework PDFs, and school-wide circulars. It reduces dependency on physical photocopies and ensures that parents and students have 24/7 access to the latest curriculum materials.

## Done looks like
- Admins and teachers can upload digital content (PDFs, Videos, External Links, Documents) with metadata (title, description, tags).
- Content is organized into a hierarchical category tree (e.g., Curriculum > Grade 10 > Mathematics > NCERT Solutions).
- Access control allows restricting content to specific class-sections, subjects, staff-only, or making it available to the entire school.
- Full-text search on titles, descriptions, and tags allows quick discovery of resources.
- A "Publishing" workflow allows content to be prepared in draft and published at a specific time.
- Engagement tracking records views and downloads per content item, providing analytics to admins.
- Content Announcements allow highlighting new or critical materials (e.g., "Annual Exam Syllabus Published").
- Students and parents receive a "Relevant Content Feed" based on their enrolled class and subjects.
- Mobile-optimized preview for PDFs and inline video player for educational videos.
- Soft-delete (Trash) system to prevent accidental loss of important school records.

## Out of scope
- Real-time collaborative document editing (like Google Docs).
- Complex SCORM/LTI content hosting (LMS module focus).
- Paid content marketplace or subscription management.
- External public hosting of content (protected by school auth).
- Video transcoding/hosting (supports external links like YouTube/Vimeo).

## Tasks

1. **DB migration — digital content tables** — Create migration `030-digital-content.ts` with:
   - `content_categories`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(100) NOT NULL, parent_category_id UUID NULL FK self, description TEXT NULL, icon VARCHAR(50) NULL, color_hex VARCHAR(7) DEFAULT '#3B82F6', is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Index: `(school_id, parent_category_id)`.
   - `digital_content`: `(id UUID PK, school_id UUID NOT NULL, category_id UUID NOT NULL FK content_categories, title VARCHAR(400) NOT NULL, description TEXT NULL, content_type ENUM('pdf','video','image','link','document','spreadsheet','presentation','other') NOT NULL, file_url TEXT NULL, external_url TEXT NULL, file_name VARCHAR(300) NULL, file_size_kb INT NULL, thumbnail_url TEXT NULL, academic_year_id UUID NULL FK academic_years, class_section_ids UUID[] NULL, subject_id UUID NULL FK subjects, access_type ENUM('all_school','class_specific','subject_specific','staff_only','admin_only') DEFAULT 'all_school', tags TEXT[] NULL, view_count INT DEFAULT 0, download_count INT DEFAULT 0, is_published BOOLEAN DEFAULT false, published_at TIMESTAMPTZ NULL, uploaded_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), deleted_at TIMESTAMPTZ NULL)`.
   - Indexes: `(school_id, category_id)`, `(school_id, is_published)`, `(school_id, access_type)`. Full-text index on `title`, `description`, `tags`.
   - `content_access_logs`: `(id UUID PK, school_id UUID NOT NULL, content_id UUID NOT NULL FK digital_content, user_id UUID NOT NULL FK users, access_type ENUM('view','download') NOT NULL, accessed_at TIMESTAMPTZ DEFAULT now())`.
   - Index: `(school_id, content_id, user_id)`.
   - `content_announcements`: `(id UUID PK, school_id UUID NOT NULL, title VARCHAR(300) NOT NULL, body TEXT NOT NULL, content_ids UUID[] NULL, target_class_section_ids UUID[] NULL, is_published BOOLEAN DEFAULT false, published_at TIMESTAMPTZ NULL, expires_at TIMESTAMPTZ NULL, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Index: `(school_id, is_published)`.
   - All composite indexes start with `school_id`.

2. **Content Category Endpoints** — Manage the content hierarchy:
   - `POST /v1/content/categories`, `GET /v1/content/categories` (returns tree), `PATCH /v1/content/categories/:id`, `DELETE /v1/content/categories/:id`.
   - Permission: `content.category.manage`.

3. **Digital Content CRUD Endpoints** — Asset management:
   - `POST /v1/content` — Create content with file metadata. Permission: `content.upload`.
   - `GET /v1/content` — List content with search/filters. Query params: `q`, `category_id`, `subject_id`, `access_type`, `academic_year_id`. Permission: `content.view`.
   - `GET /v1/content/:id` — Detail view. Permission: `content.view`.
   - `PATCH /v1/content/:id` — Update or publish/unpublish. Permission: `content.manage`.
   - `DELETE /v1/content/:id` — Soft delete. Permission: `content.manage`.
   - `POST /v1/content/:id/access` — Log a view or download. Permission: `content.view`.

4. **Content Analytics & Reporting** — Monitoring engagement:
   - `GET /v1/content/popular` — Most viewed/downloaded items.
   - `GET /v1/content/:id/analytics` — Time-series view counts and unique user stats.
   - Permission: `content.report.view`.

5. **Content Announcement Endpoints** — Highlight important assets:
   - `POST /v1/content/announcements`, `GET /v1/content/announcements`, `PATCH /v1/content/announcements/:id`.
   - Permission: `content.manage`.

6. **Student/Parent Feed Endpoint** — Personalized content:
   - `GET /v1/content/my-feed?student_id=uuid` — Returns content relevant to the student's enrollment (class, section, subject) and school-wide content.
   - Permission: `content.view`.

7. **Digital Content NestJS Module Wiring** — Create `DigitalContentModule` in `backend/src/modules/digital-content/`. Entities: `ContentCategoryEntity`, `DigitalContentEntity`, `ContentAccessLogEntity`, `ContentAnnouncementEntity`. Register in `AppModule`.

8. **Permissions Registration** — Add to `backend/src/config/permissions.ts`:
   - `content.category.manage`
   - `content.upload`
   - `content.view`
   - `content.manage`
   - `content.publish`
   - `content.report.view`
   - Default assignments: `super_admin`, `admin`, `principal` — all. `teacher` — content.upload, content.view, content.manage (own), content.publish (own). `student` — content.view. `parent` — content.view.

9. **Frontend — Content Library Browser** (`/dashboard/digital-content`):
   - **Sidebar**: Categorical tree navigation with search bar.
   - **Main Panel**: Grid/List toggle for content items. Each item shows: type icon (PDF/Video/Link), title, publish date, view count badge.
   - **Filters**: Content type (Video, PDF, etc.), Subject, Academic Year.
   - **Details Page**: Preview (PDF embed / Video player), description, download button, related content suggestions.
   - Skeleton loader: 8-item grid shimmer. Empty state: "No resources found in this category."

10. **Frontend — Upload & Management**:
    - Full-page upload form with drag-and-drop.
    - Fields for access control (Select classes, Subjects).
    - Metadata entry (Tags, Description).
    - Analytics dashboard showing top-performing content.

11. **Seed Content Data** — Update `seed.ts`:
    - 3 categories: "Syllabus & Curriculum", "Reference Materials", "Notices & Circulars".
    - 3 content items:
        - "Annual Mathematics Syllabus 2025-26", PDF, category: Syllabus, access: Grade 1.
        - "Khan Academy - Addition Basics", Video link, category: Reference, access: Grade 1.
        - "Summer Vacation Circular", PDF, category: Notices, access: All School.

## Relevant files
- `backend/src/modules/digital-content/`
- `backend/src/modules/digital-content/entities/content-category.entity.ts`
- `backend/src/modules/digital-content/entities/digital-content.entity.ts`
- `backend/src/modules/digital-content/entities/content-access-log.entity.ts`
- `backend/src/modules/digital-content/entities/content-announcement.entity.ts`
- `backend/src/database/migrations/030-digital-content.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/digital-content/page.tsx`
- `frontend/src/components/modules/digital-content/ContentBrowser.tsx`
- `frontend/src/components/modules/digital-content/ContentCard.tsx`
- `frontend/src/hooks/use-digital-content.ts`
