# Phase 3 — Library Management (Module 11)

## What & Why
Build the Library Management module to digitize school library operations. Every Indian K-12 school maintains a library where tracking book circulation (issue/return), managing inventory (cataloging), and collecting overdue fines are critical daily tasks. This module ensures accountability for school assets, promotes reading habits among students through a searchable catalog, and automates fine calculations, reducing manual record-keeping for librarians.

## Done looks like
- Librarians can manage a multi-level category tree for books (e.g., Fiction > Mystery).
- Comprehensive book cataloging with ISBN, title, author, and shelf location tracking.
- Multiple physical copies can be tracked for a single book title, each with its own condition and availability status.
- Quick issue/return desk workflow for both students and staff.
- Automatic due date calculation and fine computation based on configurable school settings.
- Real-time book availability status visible in a public catalog for students and staff.
- Students can reserve books that are currently issued to others.
- Detailed borrowing history for individual students and staff members.
- Overdue reports to identify and notify borrowers with late returns.
- Fine collection workflow with payment tracking.
- Dashboard for librarians showing total books, issued books, and total fines collected.
- Mobile-responsive catalog search for students to browse library resources.

## Out of scope
- E-book reader integration (PDF/EPUB viewing within the app).
- Integration with external library systems (like WorldCat or Zotero).
- Library access control (biometric/turnstile integration).
- Procurement/Purchase order management for new books (Inventory module handles this).
- Book donation management workflow.

## Tasks

1. **DB migration — library core tables** — Create migration `025-library-management.ts` with:
   - `library_categories`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(100) NOT NULL, parent_category_id UUID NULL FK library_categories, description TEXT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique: `(school_id, name, parent_category_id)`.
   - `library_books`: `(id UUID PK, school_id UUID NOT NULL, isbn VARCHAR(20) NULL, title VARCHAR(400) NOT NULL, authors TEXT[] NOT NULL, publisher VARCHAR(200) NULL, edition VARCHAR(50) NULL, publication_year INT NULL, language VARCHAR(50) DEFAULT 'English', category_id UUID NOT NULL FK library_categories, total_copies INT NOT NULL DEFAULT 1, available_copies INT NOT NULL DEFAULT 1, shelf_location VARCHAR(100) NULL, cover_image_url TEXT NULL, description TEXT NULL, keywords TEXT[] NULL, is_reference_only BOOLEAN DEFAULT false, added_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, title)`, `(school_id, category_id)`.
   - `library_book_copies`: `(id UUID PK, school_id UUID NOT NULL, book_id UUID NOT NULL FK library_books, copy_number VARCHAR(50) NOT NULL, condition ENUM('new','good','fair','poor','damaged','lost') DEFAULT 'new', is_available BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique: `(school_id, copy_number)`. Index: `(school_id, book_id)`.
   - `library_issuances`: `(id UUID PK, school_id UUID NOT NULL, book_copy_id UUID NOT NULL FK library_book_copies, book_id UUID NOT NULL FK library_books, borrower_type ENUM('student','staff') NOT NULL, borrower_student_id UUID NULL FK students, borrower_staff_id UUID NULL FK staff, issued_by UUID NOT NULL FK users, issued_date DATE NOT NULL DEFAULT CURRENT_DATE, due_date DATE NOT NULL, returned_date DATE NULL, status ENUM('issued','returned','overdue','lost') NOT NULL DEFAULT 'issued', fine_amount DECIMAL(8,2) DEFAULT 0.00, fine_paid BOOLEAN DEFAULT false, fine_paid_at TIMESTAMPTZ NULL, return_condition ENUM('good','damaged','lost') NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, borrower_student_id)`, `(school_id, borrower_staff_id)`, `(school_id, status)`.
   - `library_reservations`: `(id UUID PK, school_id UUID NOT NULL, book_id UUID NOT NULL FK library_books, reserved_by_student_id UUID NULL FK students, reserved_by_staff_id UUID NULL FK staff, academic_year_id UUID NOT NULL FK academic_years, reserved_at TIMESTAMPTZ DEFAULT now(), status ENUM('pending','fulfilled','cancelled','expired') DEFAULT 'pending', expires_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, book_id, status)`.
   - `library_settings`: `(id UUID PK, school_id UUID NOT NULL UNIQUE, max_books_per_student INT DEFAULT 2, max_books_per_staff INT DEFAULT 5, loan_period_days_student INT DEFAULT 14, loan_period_days_staff INT DEFAULT 30, fine_per_day DECIMAL(5,2) DEFAULT 1.00, grace_period_days INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - All composite indexes start with `school_id`.

2. **Library categories endpoints** — Full CRUD for hierarchical categories:
   - `GET /v1/library/categories` — returns tree structure or flat list with filters. Permission: `library.catalog.view`.
   - `POST /v1/library/categories`, `PATCH /v1/library/categories/:id`, `DELETE /v1/library/categories/:id`. Permission: `library.book.manage`.

3. **Books & Copies management endpoints** — Catalog management:
   - `GET /v1/library/books` — searchable list (title, author, ISBN, category). Full-text search on `keywords`. Paginated. Permission: `library.catalog.view`.
   - `POST /v1/library/books` — create book and its physical copies. Body: `{ title, authors, category_id, copies: [{ copy_number, condition }] }`. Permission: `library.book.manage`.
   - `GET /v1/library/books/:id`, `PATCH /v1/library/books/:id`, `DELETE /v1/library/books/:id`. Permission: `library.book.manage`.
   - `GET /v1/library/books/:id/copies`, `POST /v1/library/books/:id/copies`, `PATCH /v1/library/copies/:copyId`. Permission: `library.book.manage`.

4. **Issuance & Return workflow endpoints** — Circulation desk:
   - `POST /v1/library/issue` — issue a book copy. Body: `{ book_copy_id, borrower_type, borrower_id }`. Validates: copy availability, borrower loan limits (from settings), student/staff existence. Computes `due_date`. Permission: `library.issuance.manage`. **Requires `Idempotency-Key`**.
   - `POST /v1/library/returns` — return a book copy. Body: `{ book_copy_id, return_condition }`. Computes `fine_amount` if `returned_date > due_date`. Updates copy status to `available`. Permission: `library.issuance.manage`.
   - `GET /v1/library/issuances` — list with filters (status, borrower, date range). Permission: `library.issuance.view`.
   - `POST /v1/library/issuances/:id/pay-fine` — record fine payment. Permission: `library.issuance.manage`.

5. **Reservations & Settings endpoints** —
   - `POST /v1/library/reservations` — reserve a book. Permission: `library.reservation.manage`.
   - `GET /v1/library/reservations`, `PATCH /v1/library/reservations/:id/cancel`. Permission: `library.reservation.view`.
   - `GET /v1/library/settings`, `PUT /v1/library/settings` — update school library rules. Permission: `library.settings.manage`.

6. **Library Reports & Borrower History** —
   - `GET /v1/library/reports/overdue` — list all overdue issuances. Permission: `library.report.view`.
   - `GET /v1/library/borrowers/students/:studentId/history` — full history for a student. Permission: `library.issuance.view`. PBAC: student sees own; parent sees children's.
   - `GET /v1/library/reports/stats` — counts for librarian dashboard. Permission: `library.report.view`.

7. **Library module NestJS wiring** — Create `LibraryModule` in `backend/src/modules/library/`. Register entities. Import `StudentsModule`, `HrModule`. Export `LibraryService`. Register in `AppModule`.

8. **Permissions registration** — Add to `backend/src/config/permissions.ts`:
   - `library.catalog.view`, `library.book.manage`, `library.issuance.view`, `library.issuance.manage`, `library.reservation.view`, `library.reservation.manage`, `library.report.view`, `library.settings.manage`.
   - Default: `super_admin`, `admin`, `principal`, `librarian` — all. `teacher` — catalog.view, issuance.view (own). `student`/`parent` — catalog.view, issuance.view (own/children).

9. **Frontend — Library Catalog** (`/dashboard/library/catalog`) —
   - Searchable grid/list of books with covers, authors, and availability status.
   - Filters: Category (sidebar tree), Author, Availability.
   - Click book → detail modal with copies list and shelf location.

10. **Frontend — Circulation Desk** (`/dashboard/library/circulation`) —
    - Two tabs: **Issue** and **Return**.
    - **Issue**: Quick search student/staff (name/ID) → select book copy (scan barcode/type ID) → Issue button.
    - **Return**: Scan/Type copy ID → show issuance details → Mark Return (with condition select).
    - Overdue alerts highlighted in red.

11. **Frontend — Librarian Dashboard & Reports** —
    - Summary cards: Total Books, Currently Issued, Overdue Today, Fines Pending.
    - Overdue table with "Notify Borrower" action.
    - Fine collection table.

12. **Seed Library Data** —
    - 5 popular school books (e.g., "Malgudi Days", "The Blue Umbrella") with categories.
    - 2 physical copies for each.
    - 1 active issuance to demo student ADM-2025-001.
    - 1 overdue issuance to demo staff.

## Relevant files
- `backend/src/modules/library/`
- `backend/src/modules/library/entities/library-category.entity.ts`
- `backend/src/modules/library/entities/library-book.entity.ts`
- `backend/src/modules/library/entities/library-book-copy.entity.ts`
- `backend/src/modules/library/entities/library-issuance.entity.ts`
- `backend/src/modules/library/entities/library-reservation.entity.ts`
- `backend/src/modules/library/entities/library-settings.entity.ts`
- `backend/src/database/migrations/025-library-management.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/library/catalog/page.tsx`
- `frontend/src/app/(dashboard)/library/circulation/page.tsx`
- `frontend/src/app/(dashboard)/library/settings/page.tsx`
- `frontend/src/components/library/BookCard.tsx`
- `frontend/src/components/library/IssueForm.tsx`
- `frontend/src/hooks/use-library.ts`
