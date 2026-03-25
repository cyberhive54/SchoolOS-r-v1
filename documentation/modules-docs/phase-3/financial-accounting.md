# Phase 3 — Financial Accounting (Module 12)

## What & Why
Build the Financial Accounting module — the backbone of the school's fiscal integrity. While Fees Management handles student-facing revenue, Financial Accounting tracks all school-wide income, expenses, and asset/liability balances. In Indian K-12 schools, this is critical for tracking operational costs (salaries, utilities, maintenance) and providing transparency to the board of directors. This module ensures accurate bookkeeping, budget management, and preparation for annual audits.

## Done looks like
- Chart of Accounts (COA) with standard accounting heads: Assets, Liabilities, Equity, Income, Expenses.
- Multi-level account hierarchy (e.g., Expenses → Operational → Electricity)
- Journal Voucher (JV) entry system for multi-line balanced accounting transactions (Double-entry)
- Bank and Cash book management for all school accounts
- Expense tracking with categorized vouchers (Rent, Salary, Utilities, etc.)
- Income tracking from non-fee sources (Grants, Donations, Canteen rent)
- Trial Balance, Balance Sheet, and Profit & Loss (Income-Expense) statements.
- Budgeting: define annual budgets per account head and track actual vs budget.
- Multi-fiscal year support with period closing (Carry forward balances).
- All pages: skeleton loaders, empty states, toast feedback, and print-ready financial statements.

## Out of scope
- Full audit log (Module 1 - Platform handles this separately).
- Complex taxation (GST/TDS) calculations (Manual entry of tax amounts only).
- Fixed asset depreciation automation (Manual JV entry for depreciation).
- Inventory valuation integration (Module 14 — Inventory handles this).
- Payroll automation (Module 13 — Payroll handles this).

## Tasks

1. **DB migration — financial accounting tables** — Create migration `032-financial-accounting.ts` with:
   - `accounting_years`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(100) NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL, status ENUM('open', 'closed') DEFAULT 'open', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique index: `(school_id, name)`.
   - `accounts`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(200) NOT NULL, code VARCHAR(50) NOT NULL, parent_id UUID NULL FK accounts, account_type ENUM('asset', 'liability', 'equity', 'income', 'expense') NOT NULL, is_ledger BOOLEAN DEFAULT true, opening_balance DECIMAL(15,2) DEFAULT 0, current_balance DECIMAL(15,2) DEFAULT 0, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique index: `(school_id, code)`.
   - `journal_vouchers`: `(id UUID PK, school_id UUID NOT NULL, voucher_number VARCHAR(50) NOT NULL, voucher_date DATE NOT NULL, reference_number VARCHAR(100), narration TEXT, voucher_type ENUM('journal', 'payment', 'receipt', 'contra') NOT NULL, status ENUM('draft', 'posted', 'cancelled') DEFAULT 'draft', created_by UUID NOT NULL FK users, posted_by UUID NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique index: `(school_id, voucher_number)`.
   - `journal_entries`: `(id UUID PK, school_id UUID NOT NULL, voucher_id UUID NOT NULL FK journal_vouchers, account_id UUID NOT NULL FK accounts, debit DECIMAL(15,2) DEFAULT 0, credit DECIMAL(15,2) DEFAULT 0, narration TEXT, created_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, voucher_id)`, `(school_id, account_id)`.
   - `budgets`: `(id UUID PK, school_id UUID NOT NULL, accounting_year_id UUID NOT NULL FK accounting_years, account_id UUID NOT NULL FK accounts, budget_amount DECIMAL(15,2) NOT NULL, actual_amount DECIMAL(15,2) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Unique index: `(school_id, accounting_year_id, account_id)`.
   - All composite indexes start with `school_id`.

2. **Chart of Accounts endpoints**:
   - `POST /v1/accounting/accounts` — Create an account head. Permission: `accounting.settings.manage`.
   - `GET /v1/accounting/accounts` — List accounts in a tree structure. Permission: `accounting.accounts.view`.
   - `GET /v1/accounting/accounts/:id/ledger` — List all journal entries for a specific account with running balance. Filters: `from_date`, `to_date`. Permission: `accounting.ledger.view`.
   - Full CRUD for accounts.

3. **Journal Voucher endpoints**:
   - `POST /v1/accounting/vouchers` — Create a voucher with entries. Body: `{ voucher_date, voucher_type, reference_number?, narration, entries: [{ account_id, debit, credit, narration? }] }`. Validates: `total_debit == total_credit`. Sets status to `draft`. **Requires `Idempotency-Key` header**. Permission: `accounting.voucher.manage`.
   - `POST /v1/accounting/vouchers/:id/post` — Post the voucher, updating `accounts.current_balance`. Once posted, voucher is locked. Permission: `accounting.voucher.post`.
   - `GET /v1/accounting/vouchers` — List vouchers with filters: `voucher_date`, `voucher_type`, `status`. Permission: `accounting.voucher.view`.

4. **Financial Statements endpoints**:
   - `GET /v1/accounting/reports/trial-balance` — Returns list of accounts with debit/credit totals and net balance. Permission: `accounting.report.view`.
   - `GET /v1/accounting/reports/balance-sheet` — Returns asset, liability, and equity groups with net balances. Permission: `accounting.report.view`.
   - `GET /v1/accounting/reports/profit-loss` — Returns income and expense groups with net balances and profit/loss. Permission: `accounting.report.view`.

5. **Budgeting endpoints**:
   - `POST /v1/accounting/budgets` — Set budget for an account. Body: `{ accounting_year_id, account_id, budget_amount }`. Permission: `accounting.settings.manage`.
   - `GET /v1/accounting/reports/budget-vs-actual` — List budgets with current actual spend/income. Permission: `accounting.report.view`.

6. **Financial Accounting module NestJS wiring**:
   - Create `AccountingModule` in `backend/src/modules/accounting/`.
   - Entities: `AccountingYearEntity`, `AccountEntity`, `JournalVoucherEntity`, `JournalEntryEntity`, `BudgetEntity`.
   - Register in `AppModule`.

7. **Permissions registration**:
   - `accounting.settings.manage`
   - `accounting.accounts.view`, `accounting.accounts.manage`
   - `accounting.voucher.view`, `accounting.voucher.manage`, `accounting.voucher.post`
   - `accounting.ledger.view`
   - `accounting.report.view`
   - Default assignments: `super_admin`, `admin`, `principal` — all. `accountant` — all.

8. **Frontend — Accounting overview page** (`/dashboard/accounting`):
   - Summary cards: Total Assets, Total Liabilities, Total Income, Total Expense.
   - Quick search: "Search Vouchers".
   - Recent posted vouchers list.
   - Skeleton loader and empty states.

9. **Frontend — Chart of Accounts page** (`/dashboard/accounting/accounts`):
   - Tree view of all accounts.
   - Modal to add/edit account heads.
   - Click account → navigate to Ledger view.

10. **Frontend — Voucher entry page** (`/dashboard/accounting/vouchers/new`):
    - Form to create new journal/payment/receipt voucher.
    - Dynamic rows for journal entries (Account select, Debit, Credit, Line narration).
    - Footer with balance check (Total Debit vs Total Credit).
    - "Save as Draft" and "Post" actions.

11. **Frontend — Financial statements page** (`/dashboard/accounting/reports`):
    - Tabs for Trial Balance, Balance Sheet, P&L, and Budget.
    - Export to PDF and Excel buttons.
    - Date range and accounting year filters.

12. **Seed accounting data**:
    - Standard COA heads: Cash, Bank, Tuition Fees Income, Salary Expense, Rent Expense.
    - Accounting Year: 2025-26 (Open).
    - Opening balance of 100,000 in Cash account.
    - 1 Budget entry for Salary Expense: 12,000,000.

## Relevant files
- `backend/src/modules/accounting/`
- `backend/src/modules/accounting/entities/*.entity.ts`
- `backend/src/database/migrations/032-financial-accounting.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/accounting/page.tsx`
- `frontend/src/app/(dashboard)/accounting/accounts/page.tsx`
- `frontend/src/app/(dashboard)/accounting/vouchers/page.tsx`
- `frontend/src/components/modules/accounting/VoucherForm.tsx`
- `frontend/src/components/modules/accounting/FinancialStatement.tsx`
