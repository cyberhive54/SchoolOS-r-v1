# Phase 5 — Content Management System (Module 26)

## What & Why
The Content Management System (CMS) is the school's digital storefront. Every modern school requires a public-facing website for branding, admission announcements, parent communication, and showcasing school achievements. This module allows school administrators to manage their public website content—pages, news, events, galleries, and navigation menus—through a user-friendly interface without needing technical or coding skills. The CMS serves content via an API, which can be consumed by a separate public-facing Next.js site or the SchoolOS hosted website feature. This ensures that the school's public image is always up-to-date and integrated with the school's internal data.

## Done looks like
- Admins can create and manage static and dynamic pages with a rich-text or JSON-based editor.
- A flexible menu management system allows for nested navigation across header, footer, and sidebar locations.
- Media management through an integrated gallery with album support for school events and functions.
- News and announcement system to keep parents and the community informed of latest updates.
- Hero banners and call-to-action (CTA) management for the website's landing pages.
- SEO-friendly content management including slugs, meta descriptions, and sitemap controls.
- Content is API-driven, allowing for high-performance static site generation (SSG) or server-side rendering (SSR).
- Role-based access control ensuring only authorized staff can publish content.

## Out of scope
- Domain registration and DNS management (handled externally).
- Full-blown e-commerce capabilities (handled via Fees module if needed).
- Complex custom CSS/JS injection (standardized themes are used for security).
- External blog platform integration (Wordpress, etc.).
- Intranet-only content (handled by Notice Board in Communication module).

## Tasks

1.  **DB Migration — CMS Core** — Create migration `040-cms-management.ts` with:
    - `cms_pages`: `(id UUID PK, school_id UUID NOT NULL, slug VARCHAR(200) NOT NULL, title VARCHAR(400) NOT NULL, meta_description VARCHAR(500) NULL, meta_keywords VARCHAR(500) NULL, body_html TEXT NULL, body_json JSONB NULL, page_type ENUM('static','home','about','contact','admission','gallery','news','events','custom') NOT NULL DEFAULT 'custom', is_published BOOLEAN DEFAULT false, published_at TIMESTAMPTZ NULL, is_in_sitemap BOOLEAN DEFAULT true, og_image_url TEXT NULL, order_index INT DEFAULT 0, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Unique: `(school_id, slug)`. Index: `(school_id, is_published, page_type)`.
    - `cms_menus`: `(id UUID PK, school_id UUID NOT NULL, menu_name VARCHAR(100) NOT NULL, label VARCHAR(200) NOT NULL, url VARCHAR(500) NULL, page_id UUID NULL FK cms_pages, parent_menu_id UUID NULL FK cms_menus, menu_location ENUM('header','footer','sidebar') NOT NULL DEFAULT 'header', target ENUM('_self','_blank') DEFAULT '_self', icon VARCHAR(50) NULL, sequence_order INT NOT NULL DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Index: `(school_id, menu_location, sequence_order)`, `(school_id, parent_menu_id)`.
    - `cms_gallery_albums`: `(id UUID PK, school_id UUID NOT NULL, title VARCHAR(300) NOT NULL, description TEXT NULL, cover_image_url TEXT NULL, is_published BOOLEAN DEFAULT false, published_at TIMESTAMPTZ NULL, event_date DATE NULL, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Index: `(school_id, is_published, event_date)`.
    - `cms_gallery_photos`: `(id UUID PK, school_id UUID NOT NULL, album_id UUID NOT NULL FK cms_gallery_albums, image_url TEXT NOT NULL, thumbnail_url TEXT NOT NULL, caption TEXT NULL, sequence_order INT DEFAULT 0, created_at TIMESTAMPTZ)`. Index: `(school_id, album_id, sequence_order)`.
    - `cms_news_articles`: `(id UUID PK, school_id UUID NOT NULL, title VARCHAR(400) NOT NULL, slug VARCHAR(200) NOT NULL, excerpt TEXT NULL, body_html TEXT NOT NULL, cover_image_url TEXT NULL, author_name VARCHAR(200) NULL, category VARCHAR(100) NULL, tags TEXT[] NULL, is_published BOOLEAN DEFAULT false, published_at TIMESTAMPTZ NULL, is_featured BOOLEAN DEFAULT false, view_count INT DEFAULT 0, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Unique: `(school_id, slug)`. Index: `(school_id, is_published, published_at)`, `(school_id, is_featured)`.
    - `cms_banners`: `(id UUID PK, school_id UUID NOT NULL, title VARCHAR(300) NOT NULL, subtitle TEXT NULL, image_url TEXT NOT NULL, mobile_image_url TEXT NULL, cta_text VARCHAR(100) NULL, cta_url TEXT NULL, sequence_order INT DEFAULT 0, is_active BOOLEAN DEFAULT true, start_date DATE NULL, end_date DATE NULL, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)`. Index: `(school_id, is_active, sequence_order)`.
    - All composite indexes MUST start with `school_id`.

2.  **Pages Management Endpoints**:
    - `POST /v1/cms/pages` — Create a new page. Body: `{ title, slug, body_json, meta_description?, page_type? }`. Validates slug uniqueness within school. Permission: `cms.page.manage`.
    - `GET /v1/cms/pages` — List all pages. Filters: `page_type`, `is_published`. Paginated. Permission: `cms.page.view`.
    - `GET /v1/cms/pages/:id` — Get page details for editing. Permission: `cms.page.view`.
    - `PATCH /v1/cms/pages/:id` — Update page content and SEO. Permission: `cms.page.manage`.
    - `POST /v1/cms/pages/:id/publish` — Sets `is_published=true` and `published_at=now()`. Permission: `cms.page.manage`.
    - `DELETE /v1/cms/pages/:id` — Soft delete page. Permission: `cms.page.manage`.
    - `GET /v1/cms/public/pages/:slug` — **Public endpoint** (no auth) to fetch page for website rendering. Redis cache: 10 mins.

3.  **Menu Management Endpoints**:
    - `GET /v1/cms/menus` — List all menus grouped by location. Permission: `cms.menu.view`.
    - `POST /v1/cms/menus` — Add a menu item. Body: `{ label, url?, page_id?, parent_menu_id?, menu_location, sequence_order }`. Permission: `cms.menu.manage`.
    - `PATCH /v1/cms/menus/:id` — Update menu details or reorder. Permission: `cms.menu.manage`.
    - `DELETE /v1/cms/menus/:id` — Remove menu item. Permission: `cms.menu.manage`.
    - `GET /v1/cms/public/menus` — **Public endpoint** to fetch navigation structure.

4.  **Gallery Management Endpoints**:
    - `POST /v1/cms/gallery/albums` — Create album. Permission: `cms.gallery.manage`.
    - `GET /v1/cms/gallery/albums` — List albums. Permission: `cms.gallery.view`.
    - `POST /v1/cms/gallery/albums/:id/photos` — Bulk upload photos to album. Body: `{ photos: [{ image_url, thumbnail_url, caption? }] }`. Permission: `cms.gallery.manage`.
    - `GET /v1/cms/gallery/albums/:id/photos` — List photos in album. Permission: `cms.gallery.view`.
    - `DELETE /v1/cms/gallery/photos/:id` — Remove photo. Permission: `cms.gallery.manage`.

5.  **News & Banners Endpoints**:
    - `POST /v1/cms/news` — Create news article. Permission: `cms.news.manage`.
    - `GET /v1/cms/news` — List articles. Filters: `is_featured`, `is_published`. Permission: `cms.news.view`.
    - `POST /v1/cms/banners` — Create hero banner. Permission: `cms.banner.manage`.
    - `GET /v1/cms/banners` — List active banners. Permission: `cms.banner.view`.

6.  **NestJS Module Wiring**:
    - Create `CmsModule` in `backend/src/modules/cms/`.
    - Entities: `CmsPageEntity`, `CmsMenuEntity`, `CmsGalleryAlbumEntity`, `CmsGalleryPhotoEntity`, `CmsNewsArticleEntity`, `CmsBannerEntity`.
    - Register in `AppModule`.
    - Export nothing (internal API for school admin + public consumption).

7.  **Permissions Registration**:
    - `cms.page.view`, `cms.page.manage`
    - `cms.menu.view`, `cms.menu.manage`
    - `cms.gallery.view`, `cms.gallery.manage`
    - `cms.news.view`, `cms.news.manage`
    - `cms.banner.view`, `cms.banner.manage`
    - Default assignments: `super_admin`, `admin`, `principal` — all. `marketing_officer` (custom role) — all. `teacher` — gallery.view, news.view.

8.  **Frontend — CMS Dashboard (`/dashboard/cms`)**:
    - Summary tiles: Published Pages, Total Media, Featured News, Active Banners.
    - Quick access to "Page Builder", "Menu Editor", and "Media Upload".
    - Recent activity log of content updates.

9.  **Frontend — Page Builder (`/dashboard/cms/pages`)**:
    - Table of pages with status (Draft/Published) and type.
    - "New Page" slide-over with template selection (Static, Admission, News, etc.).
    - Content editor with preview toggle.
    - SEO sidebar for meta tags and OG image upload.

10. **Frontend — Menu & Gallery Editor (`/dashboard/cms/menus`, `/dashboard/cms/gallery`)**:
    - Drag-and-drop interface for menu reordering and nesting.
    - Masonry grid for gallery albums.
    - "Upload Media" modal with bulk progress tracking.

11. **Seed CMS Data**:
    - 1 Home page (slug: 'home', type: 'home', is_published: true).
    - 1 About Us page (slug: 'about', type: 'about', is_published: true).
    - 1 Header menu structure linking to Home and About.
    - 1 Gallery album "Annual Sports Day 2025" with 2 sample photos.
    - 1 Featured news article "Admissions Open for 2026-27".

## Relevant files
- `backend/src/modules/cms/`
- `backend/src/modules/cms/entities/cms-page.entity.ts`
- `backend/src/modules/cms/entities/cms-menu.entity.ts`
- `backend/src/modules/cms/entities/cms-gallery-album.entity.ts`
- `backend/src/modules/cms/entities/cms-gallery-photo.entity.ts`
- `backend/src/modules/cms/entities/cms-news-article.entity.ts`
- `backend/src/modules/cms/entities/cms-banner.entity.ts`
- `backend/src/database/migrations/040-cms-management.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/cms/page.tsx`
- `frontend/src/app/(dashboard)/cms/pages/page.tsx`
- `frontend/src/app/(dashboard)/cms/menus/page.tsx`
- `frontend/src/app/(dashboard)/cms/gallery/page.tsx`

