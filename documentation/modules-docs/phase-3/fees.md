# Phase 3 — Fees Management (Module 11)

## What & Why
Build the Fees Management module — the financial heartbeat of any Indian K-12 school. Private schools in India rely almost entirely on fee collections, often with complex structures involving admission fees, monthly tuition, term fees, bus fees, and extracurricular charges. This is a Layer 3 Financial Operations module that integrates with Students, Academics, and Transport. It ensures timely collection, automated fine calculation for late payments, and clear financial reporting for the school management while providing parents with easy digital payment tracking.

## Done looks like
- Admins can define fee heads (Tuition, Transport, Admission, Lab, etc.) and group them into fee groups (e.g., "Standard X Annual Fees")
- Fee masters can be created for different classes/student categories for an academic year
- Automated fee allocation to students based on their class, category, and optional services (like Transport)
- Support for multiple payment frequencies: One-time, Monthly, Quarterly, Half-yearly, Annual
- Fee collection interface: accept payments via cash, cheque, bank transfer, or online (Phase 4)
- Partial payments and advance payments are supported with balance tracking
- Automated late fee (fine) calculation based on due dates (fixed amount or percentage)
- Fee waivers and concessions can be applied per student with approval notes
- Digital fee receipts generated as PDF for every transaction
- Parents can view fee status, due dates, and payment history on the Parent Portal
- Reports: Defaulter list (students with pending dues), collection report (daily/monthly), and fee head-wise summary
- All pages: skeleton loaders, empty states, toast feedback, and print-ready receipts

## Out of scope
- Online payment gateway integration (Phase 4 — Payment Gateway module)
- Inventory-linked fees like uniforms/books (Module 14 — Inventory handles this separately)
- Scholarship management (complex rules out of scope; simple concessions included)
- External bank reconciliation (manual marking only)
- Payroll-linked fee deductions (out of scope)

## Tasks

1. **DB migration — fees core tables** — Create migration `031-fees-management.ts` with:
   - `fee_heads`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(100) NOT NULL, description TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique index: `(school_id, name)`.
   - `fee_groups`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(100) NOT NULL, description TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique index: `(school_id, name)`.
   - `fee_group_items`: `(id UUID PK, school_id UUID NOT NULL, fee_group_id UUID NOT NULL FK fee_groups, fee_head_id UUID NOT NULL FK fee_heads, amount DECIMAL(12,2) NOT NULL, created_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, fee_group_id)`.
   - `fee_masters`: `(id UUID PK, school_id UUID NOT NULL, academic_year_id UUID NOT NULL FK academic_years, fee_group_id UUID NOT NULL FK fee_groups, class_id UUID NULL FK classes, student_category_id UUID NULL FK student_categories, due_date DATE NOT NULL, fine_type ENUM('none', 'fixed', 'percentage') DEFAULT 'none', fine_amount DECIMAL(12,2) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, academic_year_id)`.
   - `fee_allocations`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, fee_master_id UUID NOT NULL FK fee_masters, academic_year_id UUID NOT NULL FK academic_years, waiver_amount DECIMAL(12,2) DEFAULT 0, waiver_reason TEXT, status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid', total_amount DECIMAL(12,2) NOT NULL, paid_amount DECIMAL(12,2) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique index: `(school_id, student_id, fee_master_id)`.
   - `fee_payments`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, receipt_number VARCHAR(50) NOT NULL, payment_date DATE NOT NULL, payment_mode ENUM('cash', 'cheque', 'transfer', 'online', 'other') NOT NULL, reference_number VARCHAR(100), total_amount DECIMAL(12,2) NOT NULL, fine_amount DECIMAL(12,2) DEFAULT 0, remarks TEXT, collected_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now())`. Unique index: `(school_id, receipt_number)`.
   - `fee_payment_items`: `(id UUID PK, school_id UUID NOT NULL, fee_payment_id UUID NOT NULL FK fee_payments, fee_allocation_id UUID NOT NULL FK fee_allocations, amount_paid DECIMAL(12,2) NOT NULL)`. Index: `(school_id, fee_payment_id)`.
   - All composite indexes start with `school_id`.

2. **Fees settings endpoints** — Manage fee heads and groups:
   - `POST /v1/fees/heads` — Create fee head. Permission: `fees.settings.manage`.
   - `GET /v1/fees/heads` — List fee heads. Permission: `fees.settings.view`.
   - `POST /v1/fees/groups` — Create fee group with items. Body: `{ name, description, items: [{ fee_head_id, amount }] }`. Permission: `fees.settings.manage`.
   - `GET /v1/fees/groups` — List fee groups. Permission: `fees.settings.view`.
   - Full CRUD for both.

3. **Fee master and allocation endpoints**:
   - `POST /v1/fees/masters` — Define fees for a class/category. Body: `{ academic_year_id, fee_group_id, class_id?, student_category_id?, due_date, fine_type, fine_amount }`. Permission: `fees.master.manage`.
   - `POST /v1/fees/masters/:id/allocate` — Bulk allocate a fee master to all matching students. BullMQ job for large classes. Permission: `fees.master.manage`.
   - `GET /v1/fees/students/:studentId/dues` — Get all pending and paid fee allocations for a student. Permission: `fees.allocation.view`. PBAC: parent can see own child.

4. **Fee collection and receipt endpoints**:
   - `POST /v1/fees/payments` — Record a fee payment. Body: `{ student_id, payment_date, payment_mode, reference_number?, payments: [{ fee_allocation_id, amount_paid }], fine_paid? }`. Validates amounts, updates `fee_allocations.paid_amount` and `status`. **Requires `Idempotency-Key` header**. Generates `receipt_number`. Returns 201 with payment ID. Permission: `fees.payment.collect`.
   - `GET /v1/fees/payments/:id/receipt` — Generate PDF receipt. Puppeteer job. Permission: `fees.payment.view`.
   - `GET /v1/fees/payments` — List payments with filters: `student_id`, `date_range`, `payment_mode`, `collected_by`. Permission: `fees.payment.view`.

5. **Fees reports endpoints**:
   - `GET /v1/fees/reports/defaulters` — List students with `unpaid` or `partial` allocations past due date. Filters: `class_id`, `academic_year_id`. Permission: `fees.report.view`.
   - `GET /v1/fees/reports/collection-summary` — Daily/Monthly collection totals grouped by fee head or payment mode. Permission: `fees.report.view`.

6. **Fees module NestJS wiring**:
   - Create `FeesModule` in `backend/src/modules/fees/`.
   - Entities: `FeeHeadEntity`, `FeeGroupEntity`, `FeeGroupItemEntity`, `FeeMasterEntity`, `FeeAllocationEntity`, `FeePaymentEntity`, `FeePaymentItemEntity`.
   - Import: `StudentsModule`, `AcademicsModule`.
   - Register in `AppModule`.

7. **Permissions registration**:
   - `fees.settings.view`, `fees.settings.manage`
   - `fees.master.view`, `fees.master.manage`
   - `fees.allocation.view`, `fees.allocation.manage` (for waivers)
   - `fees.payment.view`, `fees.payment.collect`
   - `fees.report.view`
   - Default assignments: `super_admin`, `admin`, `principal` — all. `accountant` — payment.collect, payment.view, report.view. `parent`/`student` — allocation.view (own only).

8. **Frontend — Fees overview page** (`/dashboard/fees`):
   - Summary widgets: Total Expected, Total Collected, Total Pending, Defaulter Count.
   - Quick action: "Collect Fees" button.
   - Recent transactions table.
   - Skeleton loader and empty states.

9. **Frontend — Fee collection page** (`/dashboard/fees/collect`):
   - Student search (by name or admission number).
   - Once student is selected, show: Student profile summary + Table of pending fee allocations.
   - Payment form: Select allocations to pay, enter amounts, select payment mode, add remarks.
   - Fine calculation auto-suggested based on due date.
   - "Collect & Print Receipt" action.

10. **Frontend — Fee masters and settings** (`/dashboard/fees/settings`):
    - Tabs for Fee Heads, Fee Groups, and Fee Masters.
    - Forms to create/edit each.
    - Allocation trigger button for Fee Masters.

11. **Seed fees data**:
    - 3 Fee Heads: Tuition Fee, Transport Fee, Admission Fee.
    - 1 Fee Group: "Grade 1 Annual Fees" with Tuition (15000) and Admission (5000).
    - 1 Fee Master for 2025-26, Grade 1, due 2025-04-10.
    - Allocate this master to demo student ADM-2025-001.
    - 1 Payment record of 10000 for Tuition fee for ADM-2025-001.

## Relevant files
- `backend/src/modules/fees/`
- `backend/src/modules/fees/entities/*.entity.ts`
- `backend/src/database/migrations/031-fees-management.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/fees/page.tsx`
- `frontend/src/app/(dashboard)/fees/collect/page.tsx`
- `frontend/src/app/(dashboard)/fees/settings/page.tsx`
- `frontend/src/components/modules/fees/FeeCollectionForm.tsx`
- `frontend/src/components/modules/fees/ReceiptPreview.tsx`
