# Phase 3 — Payroll Management (Module 17)

## What & Why
Build the Payroll Management module — the engine for calculating and disbursing staff salaries in Indian K-12 schools. Indian school payroll is complex, involving various components like Basic Pay, Dearness Allowance (DA), House Rent Allowance (HRA), Provident Fund (PF) deductions, Employee State Insurance (ESI), and Professional Tax (PT). This module automates the monthly salary generation based on staff attendance, leave records, and predefined salary structures. It ensures timely payments, tax compliance, and transparent salary slips for teachers and support staff.

## Done looks like
- Admins can define salary components (Earnings: Basic, DA, HRA, Special Allowance; Deductions: PF, ESI, Professional Tax, Income Tax)
- Salary structures (pay scales) can be assigned to different staff designations or individual staff members
- Monthly payroll generation process that pulls attendance data to calculate "Loss of Pay" (LOP) days
- Support for bonuses, increments, and one-time deductions/additions
- Generation of detailed, school-branded salary slips (PDF) for every staff member
- Bulk salary disbursement tracking (Cash, Cheque, or Bank Transfer)
- Staff portal view for viewing and downloading monthly salary slips and annual tax summaries
- Payroll reports: Monthly salary register, component-wise summary, and PF/ESI contribution reports
- Integration with Financial Accounting module for automated ledger entries (Salary Expense, PF Payable, etc.)
- All pages: skeleton loaders, empty states, and toast feedback for all actions

## Out of scope
- Automated tax filing (16A/24Q) — manual data export only
- Direct bank API integration for salary transfers (manual bank file generation only)
- Investment declaration and detailed tax planning (future phase)
- Loan and advance management (simple advance deduction only)

## Tasks

1. **DB migration — payroll tables** — Create migration `033-payroll-management.ts` with:
   - `salary_components`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(100) NOT NULL, type ENUM('earning', 'deduction') NOT NULL, is_fixed BOOLEAN DEFAULT true, description TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - `salary_structures`: `(id UUID PK, school_id UUID NOT NULL, staff_id UUID NOT NULL FK staff, basic_pay DECIMAL(12,2) NOT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique index: `(school_id, staff_id)`.
   - `salary_structure_items`: `(id UUID PK, school_id UUID NOT NULL, salary_structure_id UUID NOT NULL FK salary_structures, salary_component_id UUID NOT NULL FK salary_components, amount DECIMAL(12,2) NOT NULL, created_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, salary_structure_id)`.
   - `payroll_periods`: `(id UUID PK, school_id UUID NOT NULL, academic_year_id UUID NOT NULL FK academic_years, month INT NOT NULL, year INT NOT NULL, status ENUM('draft', 'generated', 'published', 'paid') DEFAULT 'draft', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique index: `(school_id, month, year)`.
   - `payslips`: `(id UUID PK, school_id UUID NOT NULL, payroll_period_id UUID NOT NULL FK payroll_periods, staff_id UUID NOT NULL FK staff, total_earnings DECIMAL(12,2) NOT NULL, total_deductions DECIMAL(12,2) NOT NULL, net_pay DECIMAL(12,2) NOT NULL, lop_days INT DEFAULT 0, worked_days INT NOT NULL, status ENUM('draft', 'published', 'paid') DEFAULT 'draft', generated_at TIMESTAMPTZ DEFAULT now(), pdf_url TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique index: `(school_id, payroll_period_id, staff_id)`.
   - `payslip_items`: `(id UUID PK, school_id UUID NOT NULL, payslip_id UUID NOT NULL FK payslips, salary_component_id UUID NOT NULL FK salary_components, amount DECIMAL(12,2) NOT NULL, type ENUM('earning', 'deduction') NOT NULL, created_at TIMESTAMPTZ DEFAULT now())`.
   - All composite indexes MUST start with `school_id`.

2. **Salary component and structure endpoints** — Manage pay scales:
   - `POST /v1/payroll/components`, `GET /v1/payroll/components`, `PATCH /v1/payroll/components/:id` — Salary components CRUD. Permission: `payroll.settings.manage`.
   - `POST /v1/payroll/structures`, `GET /v1/payroll/structures/:staffId`, `PATCH /v1/payroll/structures/:id` — Manage salary structure for a staff member. Body: `{ staff_id, basic_pay, items: [{ salary_component_id, amount }] }`. Permission: `payroll.structure.manage`.

3. **Payroll generation endpoints** — Monthly processing:
   - `POST /v1/payroll/periods` — Initialize a payroll month. Body: `{ academic_year_id, month, year }`. Permission: `payroll.process.manage`.
   - `POST /v1/payroll/periods/:id/generate` — Bulk generate payslips for all active staff. BullMQ job: (1) Fetch salary structure; (2) Calculate LOP from `staff_attendance`; (3) Calculate component amounts; (4) Save `payslips` and `payslip_items`. Permission: `payroll.process.manage`.
   - `GET /v1/payroll/periods/:id/payslips` — List all payslips for a period. Filters: `staff_id`, `status`. Permission: `payroll.payslip.view`.

4. **Payslip management and export endpoints**:
   - `POST /v1/payroll/payslips/:id/publish` — Make payslip visible to staff. Emits `payroll.payslip_published`. Permission: `payroll.process.manage`.
   - `GET /v1/payroll/payslips/:id/pdf` — Generate and return PDF payslip. Puppeteer job. Permission: `payroll.payslip.view`. PBAC: staff can see own.
   - `POST /v1/payroll/periods/:id/disburse` — Mark all payslips as paid. Body: `{ payment_date, payment_mode }`. Permission: `payroll.process.manage`.

5. **Payroll reports endpoints**:
   - `GET /v1/payroll/reports/salary-register/:periodId` — Monthly salary register with component breakdown. Permission: `payroll.report.view`.
   - `GET /v1/payroll/reports/component-summary/:periodId` — Total cost per salary component. Permission: `payroll.report.view`.

6. **Payroll module NestJS wiring** — Create `PayrollModule` in `backend/src/modules/payroll/`.
   - Entities: `SalaryComponentEntity`, `SalaryStructureEntity`, `SalaryStructureItemEntity`, `PayrollPeriodEntity`, `PayslipEntity`, `PayslipItemEntity`.
   - Import: `HRModule`, `AttendanceModule` (for staff attendance), `UsersModule`.
   - Export: `PayrollService`.
   - Register in `AppModule`.

7. **Permissions registration** — Add to `backend/src/config/permissions.ts`:
   - `payroll.settings.manage`, `payroll.structure.view`, `payroll.structure.manage`, `payroll.process.manage`, `payroll.payslip.view`, `payroll.report.view`.
   - Default assignments: `super_admin`, `admin`, `accountant` — all. `principal` — report.view. `teacher`, `staff` — view own payslips.

8. **Frontend — Salary Components page** (`/dashboard/payroll/settings`) — Admin view:
   - Table of earning and deduction components.
   - Simple modal to add/edit components with name and type.

9. **Frontend — Staff Salary Structures page** (`/dashboard/payroll/structures`) — HR/Admin view:
   - List of staff with their current monthly gross salary.
   - "Define Structure" button → slide-over with basic pay and component-wise amounts.
   - Auto-calculation of total earnings, total deductions, and net pay in the form.

10. **Frontend — Monthly Payroll page** (`/dashboard/payroll/process`) — Accountant view:
    - List of payroll periods (Month/Year) with status (Draft, Generated, Paid).
    - "Process Payroll" button → select Month/Year → shows progress bar of generation.
    - Table of generated payslips for the period with summary counts.
    - "Publish All" and "Mark as Paid" actions.

11. **Frontend — Staff Payslip View** (`/dashboard/profile/payslips`) — Teacher/Staff view:
    - Table of all published payslips by month.
    - Download PDF button for each payslip.
    - Skeleton loader and empty state.

12. **Seed payroll data** — Update `seed.ts` to:
    - Create 4 components: Basic Pay, HRA (Earning), PF (Deduction), Professional Tax (Deduction).
    - Define salary structures for 2 demo staff members.
    - Create a payroll period for the previous month and generate payslips.

## Relevant files
- `backend/src/modules/payroll/`
- `backend/src/modules/payroll/entities/*.entity.ts`
- `backend/src/database/migrations/033-payroll-management.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/payroll/settings/page.tsx`
- `frontend/src/app/(dashboard)/payroll/structures/page.tsx`
- `frontend/src/app/(dashboard)/payroll/process/page.tsx`
- `frontend/src/components/modules/payroll/PayslipPDF.tsx`
