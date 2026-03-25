# Phase 1 — Fees & Billing Module

## What & Why
Build the Fees module — school fee structure definition, invoice generation, and offline payment recording. Layer 5 Financial. Depends on Students (Layer 2) being complete. Academic year and class data from Academics (Layer 2) is also required for fee assignment. Phase 2 covers offline payment only (cash, bank transfer, cheque, UPI). Online payment gateway (Razorpay etc.) is Phase 2.2. The system must support complex Indian school fee structures: multiple fee types, group-based billing cycles, partial payments, discounts, carry-forward of arrears, and per-student overrides.

## Done looks like
- School can define fee categories (Tuition, Transport, Hostel, Lab, Library, etc.) and fee types within each
- Fee structures (fee plans) can be created with line items, amounts, and due dates — assignable to specific classes or individual students
- Invoices can be batch-generated for an entire class or academic year at once (async job)
- Individual invoices can be generated manually for a student
- Offline payments can be recorded against an invoice with idempotency (cash, bank transfer, cheque, UPI, other)
- Partial payments are supported; invoice status auto-updates (unpaid → partial → paid)
- Discounts can be defined at school level and assigned to individual students (amount or percentage)
- Arrears (unpaid dues from previous year) can be carried forward and added to current-year invoices
- All pages use skeleton loaders; fee dashboard shows summary KPIs; mutations give toast feedback
- Receipts are generated and downloadable (PDF via async job)
- Full frontend under `/dashboard/fees/` route group

## Out of scope
- Online payment gateway integration (Phase 2.2)
- Financial accounting / income-expense ledger (separate module)
- Transport fee auto-assignment (Transport module)
- Hostel fee auto-assignment (Hostel module)

## Tasks

1. **DB migration — fee structure** — Create migration `011-fees-structure.ts` with:
   - `fee_categories`: `(id, school_id, name [e.g. "Tuition", "Transport"], description [nullable], is_active, created_at, updated_at)`. Index `(school_id)`.
   - `fee_types`: `(id, school_id, category_id [FK fee_categories], name [e.g. "Term 1 Tuition", "Annual Lab Fee"], billing_cycle ['one_time'|'monthly'|'quarterly'|'half_yearly'|'annually'], is_active, created_at, updated_at)`. Index `(school_id, category_id)`.
   - `fee_structures`: `(id, school_id, name, academic_year_id [FK academic_years], description [nullable], is_active, created_at, updated_at)`. Index `(school_id, academic_year_id)`.
   - `fee_structure_items`: `(id, structure_id [FK fee_structures], fee_type_id [FK fee_types], amount [DECIMAL(12,2)], due_date [DATE nullable], late_fee_per_day [DECIMAL nullable], late_fee_applicable_after_days [INT nullable], order_index [INT], created_at, updated_at)`. Index `(structure_id)`.
   - `fee_structure_assignments`: `(id, school_id, structure_id [FK], assignment_type ['class'|'student'], class_section_id [FK class_sections nullable], student_id [FK students nullable], academic_year_id [FK], created_at)`. Unique partial index: one structure per class-section per academic year; one structure per student per academic year (can override class assignment). Index `(school_id, academic_year_id, class_section_id)`.

2. **DB migration — invoices and payments** — Create migration `012-fees-invoices.ts` with:
   - `invoices`: `(id, school_id, student_id [FK students], academic_year_id [FK], structure_id [FK fee_structures nullable], invoice_no [auto-generated, unique per school], issue_date [DATE], due_date [DATE nullable], subtotal [DECIMAL(12,2)], discount_amount [DECIMAL(12,2) DEFAULT 0], tax_amount [DECIMAL(12,2) DEFAULT 0], total_amount [DECIMAL(12,2)], paid_amount [DECIMAL(12,2) DEFAULT 0], balance_amount [COMPUTED], status ['draft'|'unpaid'|'partial'|'paid'|'overdue'|'void'|'waived'], notes [nullable], generated_by [FK users nullable], created_at, updated_at, deleted_at)`. Unique index `(school_id, invoice_no)`. Index `(school_id, student_id, status)`. Index `(school_id, academic_year_id, status)`.
   - `invoice_items`: `(id, invoice_id, fee_type_id [FK nullable], description, amount [DECIMAL(12,2)], created_at)`. Index `(invoice_id)`.
   - `payments`: `(id, school_id, invoice_id [FK invoices], student_id [FK], payment_date [DATE], amount [DECIMAL(12,2)], payment_method ['cash'|'bank_transfer'|'cheque'|'upi'|'other'], reference_no [nullable], notes [nullable], receipt_id [FK receipts nullable], idempotency_key [TEXT unique], recorded_by [FK users], created_at)`. Unique index on `idempotency_key`. Index `(school_id, invoice_id)`. Index `(school_id, student_id)`.
   - `receipts`: `(id, school_id, payment_id [FK], receipt_no [unique per school], pdf_url [nullable — generated async], generated_at [nullable], created_at)`. Index `(school_id, receipt_no)`.
   - `discounts`: `(id, school_id, name, type ['percentage'|'amount'], value [DECIMAL(12,2)], applicable_to ['all_fees'|'specific_fee_types'], description [nullable], is_active, created_at, updated_at)`. Index `(school_id)`.
   - `student_discounts`: `(id, school_id, student_id [FK], discount_id [FK], academic_year_id [FK], approved_by [FK users], notes [nullable], created_at)`. Index `(school_id, student_id, academic_year_id)`.
   - `idempotency_keys`: `(id, school_id, key [TEXT], endpoint [TEXT], response_body [JSONB], created_at, expires_at)`. Unique on `(school_id, key)`. Index expires_at for cleanup job.

3. **Fee categories & types endpoints** —
   - `POST /v1/fees/categories`, `GET /v1/fees/categories`, `PATCH /v1/fees/categories/:id`, `DELETE /v1/fees/categories/:id`
   - `POST /v1/fees/types`, `GET /v1/fees/types` (filter by `filter[category_id]`), `PATCH /v1/fees/types/:id`, `DELETE /v1/fees/types/:id`
   Permission: `fees.settings.manage`. Full endpoint folders.

4. **Fee structure endpoints** —
   - `POST /v1/fees/structures` — create structure with items array in body (nested create)
   - `GET /v1/fees/structures` — list; filter by academic_year_id
   - `GET /v1/fees/structures/:id` — full detail with items
   - `PATCH /v1/fees/structures/:id` — update structure metadata
   - `PUT /v1/fees/structures/:id/items` — replace all items (full update of line items)
   - `DELETE /v1/fees/structures/:id`
   - `POST /v1/fees/structures/:id/assign` — body: `{ assignment_type, class_section_ids?, student_ids?, academic_year_id }` — creates fee_structure_assignments records
   - `GET /v1/fees/structures/:id/assignments`
   - `DELETE /v1/fees/structures/:id/assignments/:assignmentId`
   Permission: `fees.structure.manage`.

5. **Invoice generation endpoints** —
   - `POST /v1/fees/invoices/generate` — body: `{ academic_year_id, class_section_ids?, student_ids?, due_date?, notes? }` — async BullMQ job; returns `202 { job_id }`. Job resolves fee structure per student (student override > class assignment), applies discounts, creates invoice + items. Requires `Idempotency-Key`. Emits `fees.invoice_created` per invoice (notification to parents). Permission: `fees.invoice.generate`.
   - `POST /v1/fees/invoices` — create single manual invoice for a student; body: `{ student_id, academic_year_id, items: [{ description, fee_type_id?, amount }], due_date?, notes? }`. Returns `201`. Permission: `fees.invoice.generate`.

6. **Invoice management endpoints** —
   - `GET /v1/fees/invoices` — paginated list; filters: `filter[student_id]`, `filter[academic_year_id]`, `filter[class_section_id]`, `filter[status]`, `filter[due_date][lte]`, `q` (invoice_no/student name); sort: `-due_date`, `created_at`; returns summary fields (no items)
   - `GET /v1/fees/invoices/:id` — full detail with items, payments, receipt link
   - `PATCH /v1/fees/invoices/:id` — update notes or due_date (restricted; cannot change amounts if payments exist)
   - `POST /v1/fees/invoices/:id/void` — void invoice (only if no payments); body: `{ reason }`; sets status = void. Emits `fees.invoice_voided`.
   - `GET /v1/students/:id/invoices` — all invoices for a student across years (sub-resource convenience endpoint)
   Permission: `fees.invoice.view`, `fees.invoice.manage`.

7. **Payment recording endpoint** — `POST /v1/fees/invoices/:id/record-payment` — idempotency key REQUIRED. Body: `{ amount, payment_date, payment_method, reference_no?, notes? }`. Validates: invoice exists and is not void/paid; amount ≤ balance; idempotency key not already used. Records payment, updates invoice paid_amount and status (partial/paid), creates receipt record, queues PDF generation job. Returns payment + receipt stub (pdf_url may be null until job completes). Emits `fees.payment_received` (notification to parent email/push). Permission: `fees.payment.record`. Mobile access blocked.

8. **Receipt endpoints** — `GET /v1/fees/receipts/:id` — receipt detail with pdf_url (may be null if still generating). `GET /v1/fees/receipts/:id/download` — stream or redirect to signed PDF URL. Receipt PDF generated by BullMQ worker using a school-branded HTML template rendered via headless PDF (e.g. Puppeteer or a PDF library). Permission: `fees.receipt.view`.

9. **Discount endpoints** —
   - `POST /v1/fees/discounts`, `GET /v1/fees/discounts`, `PATCH /v1/fees/discounts/:id`, `DELETE /v1/fees/discounts/:id`
   - `POST /v1/students/:id/discounts` — assign discount to student for academic year; body: `{ discount_id, academic_year_id, notes? }`. `GET /v1/students/:id/discounts`. `DELETE /v1/students/:id/discounts/:id`.
   Permission: `fees.discount.manage`.

10. **Fee collection summary endpoint** — `GET /v1/fees/summary` — query params: `academic_year_id`, `class_section_id?`, `date_from?`, `date_to?`. Returns: total_invoiced, total_collected, total_outstanding, total_overdue, count_paid, count_partial, count_unpaid. Permission: `fees.reports.view`.

11. **Idempotency middleware** — Implement `IdempotencyMiddleware` that intercepts `POST` requests with `Idempotency-Key` header. Checks `idempotency_keys` table; returns cached response if key found and not expired; otherwise stores key and response on completion. Cleanup BullMQ job to purge expired keys daily.

12. **Fees NestJS module** — `FeesModule` with all controllers, services, repositories, BullMQ queues for invoice generation and PDF generation. Register in `AppModule`.

13. **Frontend — Fees dashboard** (`/dashboard/fees`) — KPI summary cards at top (skeleton loaders during fetch):
    - Total Invoiced (current academic year)
    - Total Collected
    - Outstanding Balance
    - Overdue Amount
    Filter: Academic Year selector at top. Below KPIs: Recent payments table (student name, amount, date, method, receipt link). Overdue invoices section (top 5 most overdue). Quick actions: "Generate Invoices", "Record Payment".

14. **Frontend — Fee structures page** (`/dashboard/fees/structures`) — List of fee structures per academic year (year selector at top). Card-style list: structure name, item count, assigned to X classes. "Create Structure" button opens full-page form (not slide-over, due to complexity) with:
    - Structure name, academic year, description
    - Line items table: add/remove rows with fee type selector, amount, due date, late fee config
    - "Assign to Classes" section: multi-select class-sections
    Skeleton loader on list. Toast on mutations.

15. **Frontend — Invoices list page** (`/dashboard/fees/invoices`) — Data table:
    - Columns: Invoice No, Student Name, Class, Total, Paid, Balance, Status badge (color-coded: red=overdue, yellow=partial, green=paid, gray=draft), Due Date, Actions
    - Filters: Status, Academic Year, Class-Section, Date range, Search (invoice no/student name)
    - Bulk generate invoices button → opens dialog with academic year + class-section multi-select + due date
    - Skeleton loader: 10 rows shimmer. Pagination.

16. **Frontend — Invoice detail page** (`/dashboard/fees/invoices/:id`) — Two-column layout:
    - Left: Invoice card (like a real invoice): school header, student info, line items table, subtotal, discount, total, payment status bar (paid X of Y). Download as PDF button.
    - Right: Payments panel — list of recorded payments with method badge and receipt download link. "Record Payment" button opens a slide-over form with: amount (pre-filled with balance), payment date, method (radio), reference no, notes. Submit with loading state. Idempotency key auto-generated client-side (UUID). Toast on success.
    - Void invoice button (only shown if no payments, with confirmation dialog).
    - Breadcrumb navigation.

17. **Frontend — Student fee page** (sub-page within student detail) — Tab "Fees" on student detail page: list of all invoices for that student in selected academic year. Status badges. Total summary row. Discount assignments shown below. "Assign Discount" button.

18. **Frontend — Fee settings page** (`/dashboard/fees/settings`) — Three sections: Fee Categories, Fee Types, Discounts. Card-list with add/edit/delete per section. Skeleton loaders. Toast on mutations.

19. **Frontend — Fees navigation** — Add "Fees" to sidebar with sub-items: "Dashboard", "Fee Structures", "Invoices", "Settings". Permission-guard all routes.

## Relevant files
- `backend/src/modules/platform/audit/audit.service.ts`
- `backend/src/common/guards/`
- `backend/src/common/decorators/`
- `backend/src/database/migrations/001-initial-schema.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `backend/src/app.module.ts`
- `frontend/src/components/ui/`
- `frontend/src/lib/api-client.ts`
- `frontend/src/app/(dashboard)/layout.tsx`
- `documentation/api-style-guide_1773725741508.md`
- `documentation/coding-guidelines_1773725741509.md`
- `documentation/agent-rules_1773725741507.md`
- `documentation/route-template_1773725741508.md`
