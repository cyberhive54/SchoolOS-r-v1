# Phase 6 — Reports & Analytics (Module 27)

## What & Why
Build the Reports & Analytics module — the business intelligence layer of SchoolOS. In the Indian K-12 context, school leaders (Principals, Managers, Owners) need real-time, data-driven insights to manage operations, track academic progress, and ensure financial health. This module aggregates data from every other module (Attendance, Fees, Examinations, HR, Admissions, Transport, Library, Inventory, Payroll) into high-level dashboards and detailed, filterable canned reports. It provides a "single pane of glass" that reduces time spent on manual data consolidation and helps identify issues like declining attendance or fee defaults before they become critical. CRITICAL RULE: This module is strictly read-only — it never modifies operational data. All queries use composite-indexed SELECTs; non-JSON export formats are processed asynchronously via BullMQ to avoid timeout on large datasets.

## Done looks like
- Executive Dashboard showing real-time KPIs: total students enrolled, today's attendance %, fees collected this month vs target, outstanding fees, active staff, admissions this year, pending complaints, low-attendance students list.
- 15+ canned report types covering Attendance (daily/monthly/low-attendance/annual register), Fees (collection/defaulters/class-wise/concession/fee-head-wise), Examinations (result summary/subject-performance/rank list/grade distribution), Admissions (funnel/source-wise/RTE quota/seat vacancy), HR (staff attendance/leave balance/department count), Payroll (monthly summary/statutory/bank file), Library (circulation/overdue/most borrowed), Transport (route count/vehicle utilization), Inventory (valuation/low-stock).
- Every report supports `?format=json|csv|excel|pdf` — non-JSON triggers async BullMQ export job, returns 202 + job_id; download link is emailed when ready.
- Saved Reports: admin can name and save any filter combination for quick replay.
- Report Schedules: saved reports can be auto-delivered (daily/weekly/monthly) via email to chosen recipients.
- Report run history with download links, row counts, and status.
- Customizable executive dashboard per user (drag-to-reorder widgets, date range selector, auto-refresh every 5 min).

## Out of scope
- Ad-hoc custom query builder for end-users — planned for a later phase.
- AI-powered predictive analytics (dropout risk, fee default prediction) — planned for a later phase.
- Integration with external BI tools (Tableau, PowerBI) — planned for a later phase.
- Real-time streaming analytics (sub-second latency is not required).
- Modifying any operational data — this module is strictly SELECT-only.

## Tasks

1. **DB migration 041** — Create migration `041-reports-analytics.ts` using `queryRunner.query()` raw SQL. Tables:
   - `saved_reports`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, report_name VARCHAR(300) NOT NULL, report_module VARCHAR(100) NOT NULL, report_type VARCHAR(100) NOT NULL, filters JSONB NOT NULL DEFAULT '{}', columns_config JSONB NULL, created_by UUID NOT NULL REFERENCES users(id), is_shared BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Index: `(school_id, report_module)`, `(school_id, created_by)`.
   - `report_schedules`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, saved_report_id UUID NOT NULL REFERENCES saved_reports(id) ON DELETE CASCADE, schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('daily','weekly','monthly')), schedule_config JSONB NOT NULL DEFAULT '{}', recipient_user_ids UUID[] NOT NULL DEFAULT '{}', recipient_emails TEXT[] NOT NULL DEFAULT '{}', delivery_format VARCHAR(10) NOT NULL DEFAULT 'pdf' CHECK (delivery_format IN ('pdf','excel','csv')), last_run_at TIMESTAMPTZ NULL, next_run_at TIMESTAMPTZ NULL, is_active BOOLEAN NOT NULL DEFAULT true, created_by UUID NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Index: `(school_id, is_active, next_run_at)`.
   - `report_run_history`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, saved_report_id UUID NULL REFERENCES saved_reports(id) ON DELETE SET NULL, report_type VARCHAR(200) NOT NULL, filters JSONB NOT NULL DEFAULT '{}', status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')), started_at TIMESTAMPTZ NULL, completed_at TIMESTAMPTZ NULL, file_url TEXT NULL, file_size_kb INT NULL, row_count INT NULL, error_message TEXT NULL, run_by UUID NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Index: `(school_id, status, created_at)`, `(school_id, run_by)`.
   - `executive_dashboard_configs`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, user_id UUID NOT NULL REFERENCES users(id), widgets_config JSONB NOT NULL DEFAULT '[]', layout_config JSONB NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Unique: `(school_id, user_id)`. Index: `(school_id, user_id)`.

2. **Executive Dashboard Endpoint** — `GET /v1/reports/executive-dashboard` returns composite KPI object: `{ total_students: INT, attendance_today_percent: DECIMAL, fees_collected_this_month: DECIMAL, fees_outstanding: DECIMAL, active_staff: INT, admissions_this_year: INT, pending_complaints: INT, low_attendance_students: [{ student_id, name, attendance_percent }], exam_results_pending: INT }`. Read-only cross-module aggregation. Redis cache key `{school_id}:exec_dashboard`, TTL 5 min. Permission: `reports.executive.view`. `PUT /v1/reports/executive-dashboard/config` — save widget layout per user; body: `{ widgets_config, layout_config }`; upserts `executive_dashboard_configs`.

3. **Attendance Report Endpoints** — all read-only, permission `reports.attendance.view`:
   - `GET /v1/reports/attendance/daily?date&class_section_ids[]` — per-class summary: `{ class_section_id, class_name, total, present, absent, late, excused, percent }[]`.
   - `GET /v1/reports/attendance/monthly?academic_year_id&month&class_section_id` — student-wise monthly matrix: rows=students, cols=dates, cell=P/A/L/E.
   - `GET /v1/reports/attendance/low-attendance?academic_year_id&threshold_percent&class_section_id` — students below threshold: `{ student_id, name, class_section, days_present, days_total, percent }[]`.
   - `GET /v1/reports/attendance/annual-register?academic_year_id&class_section_id` — full-year attendance register (heavy; always async; returns 202 + job_id).
   - All accept `?format=json|csv|excel|pdf`; non-JSON formats return 202 + `{ job_id }`.

4. **Fee Report Endpoints** — all read-only, permission `reports.fees.view`:
   - `GET /v1/reports/fees/collection?from_date&to_date&academic_year_id&payment_mode?` — daily collection grouped by date and payment mode.
   - `GET /v1/reports/fees/monthly-summary?academic_year_id&month` — `{ total_due, total_collected, total_balance, collection_rate_percent }`.
   - `GET /v1/reports/fees/class-wise?academic_year_id&class_section_id?` — per-student fee status (invoice total, paid, balance, overdue).
   - `GET /v1/reports/fees/defaulters?academic_year_id&aging_days=30` — students with balance > 0, grouped by aging bucket (0–30, 31–60, 61–90, 90+ days).
   - `GET /v1/reports/fees/concession-summary?academic_year_id` — concession type, total amount conceded, student count.
   - `GET /v1/reports/fees/fee-head-wise?academic_year_id&fee_head_id?` — collection broken down by fee head (Tuition, Transport, Lab, etc.).

5. **Examination Report Endpoints** — permission `reports.exams.view`:
   - `GET /v1/reports/exams/result-summary?exam_group_id&class_section_id?` — `{ total, passed, failed, distinction, class_average_percent, highest, lowest }` per class.
   - `GET /v1/reports/exams/subject-performance?exam_group_id&class_section_id?` — per-subject: avg marks, highest, lowest, pass rate, grade distribution.
   - `GET /v1/reports/exams/rank-list?exam_group_id&class_section_id` — ranked student list with aggregate marks and percent.
   - `GET /v1/reports/exams/student-progress?student_id&academic_year_id` — student's performance trend across all exam groups in the year.

6. **Admissions Report Endpoints** — permission `reports.admissions.view`:
   - `GET /v1/reports/admissions/funnel?academic_year_id` — `{ enquiry_count, application_count, approved_count, enrolled_count, conversion_rate_percent }`.
   - `GET /v1/reports/admissions/source-wise?academic_year_id` — enquiry count and conversion by source (walk-in, website, referral, etc.).
   - `GET /v1/reports/admissions/rte-utilization?academic_year_id` — per-class RTE quota required vs filled vs enrolled.
   - `GET /v1/reports/admissions/seat-vacancy?academic_year_id` — per class-section: total capacity, enrolled, vacant seats.

7. **HR & Payroll Report Endpoints**:
   - `GET /v1/reports/hr/staff-attendance?month&year&department_id?` — per-staff summary: days present, absent, on-leave; permission `reports.hr.view`.
   - `GET /v1/reports/hr/leave-balance?academic_year_id` — per-staff remaining leave balance by type; permission `reports.hr.view`.
   - `GET /v1/reports/hr/department-count` — staff count grouped by department and designation; permission `reports.hr.view`.
   - `GET /v1/reports/payroll/monthly?month&year` — monthly payroll summary: gross, deductions (PF/ESI/TDS/PT), net payable, headcount; permission `reports.payroll.view`.
   - `GET /v1/reports/payroll/statutory?month&year` — PF ECR format data, ESI challan data, TDS summary; permission `reports.payroll.view`.
   - `GET /v1/reports/payroll/bank-file?month&year` — NEFT/RTGS format export (Excel); always returns 202 + job_id; permission `reports.payroll.view`.

8. **Library, Transport & Inventory Report Endpoints**:
   - `GET /v1/reports/library/circulation?from_date&to_date` — total issues, returns, overdue count, top 10 borrowed books; permission `reports.library.view`.
   - `GET /v1/reports/library/overdue` — books overdue with borrower name, class, days overdue, fine; permission `reports.library.view`.
   - `GET /v1/reports/transport/route-summary` — per-route: student count, vehicle, capacity utilization%; permission `reports.transport.view`.
   - `GET /v1/reports/inventory/valuation?as_of_date` — per-item: quantity on hand × unit cost = stock value; category totals; permission `reports.inventory.view`.
   - `GET /v1/reports/inventory/low-stock` — items at or below reorder level with last purchase date; permission `reports.inventory.view`.

9. **Saved Reports & Scheduling Endpoints**:
   - `POST /v1/reports/saved` — body: `{ report_name, report_module, report_type, filters, columns_config?, is_shared }`. Permission: `reports.saved.manage`. Returns saved report id.
   - `GET /v1/reports/saved?report_module?` — paginated list. Permission: `reports.saved.manage`.
   - `DELETE /v1/reports/saved/:id` — own report or admin. Permission: `reports.saved.manage`.
   - `POST /v1/reports/schedules` — body: `{ saved_report_id, schedule_type, schedule_config, recipient_user_ids, recipient_emails?, delivery_format }`. Validates saved_report belongs to school. Computes `next_run_at`. Permission: `reports.schedule.manage`.
   - `GET /v1/reports/schedules` — list with last_run_at. Permission: `reports.schedule.manage`.
   - `PATCH /v1/reports/schedules/:id` — update recipients, frequency, format, is_active. Permission: `reports.schedule.manage`.
   - `DELETE /v1/reports/schedules/:id`. Permission: `reports.schedule.manage`.

10. **Export & History Endpoints**:
    - `GET /v1/reports/history?from_date?&status?` — paginated run history; permission `reports.saved.manage`.
    - `GET /v1/reports/history/:id/download` — streams file from object storage; validates school match; permission `reports.saved.manage`.
    - BullMQ queue `report-generation`: `ReportGenerationProcessor` handles PDF/Excel/CSV export jobs; on completion stores file URL in `report_run_history.file_url` and emails recipients (via Notification Engine event `reports.export_completed`).

11. **NestJS Module** — Create `ReportsModule` in `backend/src/modules/reports/`:
    - Entities: `SavedReportEntity`, `ReportScheduleEntity`, `ReportRunHistoryEntity`, `ExecutiveDashboardConfigEntity`.
    - Import: `StudentsModule`, `AcademicsModule`, `AttendanceModule`, `ExaminationsModule`, `FeesModule`, `FinancialAccountingModule`, `HrModule`, `PayrollModule`, `AdmissionsModule`, `LibraryModule`, `TransportModule`, `InventoryModule`, `FrontOfficeModule`.
    - Register `ReportGenerationProcessor` (BullMQ worker). Register `ReportSchedulerService` (cron: runs every 5 min to check `next_run_at`).
    - STRICT READ-ONLY: ReportsService may only SELECT from other modules' repositories — never INSERT/UPDATE/DELETE on operational tables.
    - Export nothing (leaf module).
    - Register in `AppModule`.

12. **Permissions** — Register in `backend/src/config/permissions.ts`:
    - `reports.executive.view`, `reports.attendance.view`, `reports.fees.view`, `reports.exams.view`, `reports.admissions.view`, `reports.hr.view`, `reports.payroll.view`, `reports.library.view`, `reports.transport.view`, `reports.inventory.view`, `reports.saved.manage`, `reports.schedule.manage`.
    - Default assignments: super_admin/admin/principal — all. teacher — `reports.attendance.view`, `reports.exams.view` (PBAC: own class-section only). accountant role — `reports.fees.view`, `reports.payroll.view`.

13. **Frontend Pages**:
    - Executive Dashboard (`/dashboard/reports/executive`): Customizable KPI widget grid. Widgets: Total Students card, Today Attendance % donut, Fees Collected vs Target bar, Outstanding Fees amount card, Active Staff count, Pending Complaints, Low Attendance Students list (top 10 with links), Exam Results Pending. Drag-to-reorder (react-beautiful-dnd). Date range selector. Auto-refresh every 5 min toggle. Full-screen mode. Shimmer loading state.
    - Reports Center (`/dashboard/reports`): Left sidebar categories (Attendance, Fees, Examinations, Admissions, HR, Payroll, Library, Transport, Inventory). Click report → filter panel + data table in main area. Chart view toggle (bar/line/pie based on report type). Action bar: Export PDF / Export Excel / Export CSV (shows async progress badge → download button when ready). Save Report button (modal: enter name, sharing). Schedule button (opens schedule form). Pagination with page size selector.
    - Saved Reports (`/dashboard/reports/saved`): Table with report name, module, creator, sharing status, last run. Run Now / Schedule / Edit / Delete actions.
    - Report History (`/dashboard/reports/history`): Table with status badge (pending/running/completed/failed in color), report type, row count, file size, run time, Download button (completed only). Retry button (failed).

14. **Seed Data**:
    - 1 `saved_report` (name: "Monthly Fee Collection 2025–26", module: "fees", type: "collection", filters: `{ academic_year_id: <2025-26 UUID>, format: "excel" }`).
    - 1 `executive_dashboard_config` for demo admin user with default widget order: `["total_students","attendance_today","fees_collected","fees_outstanding","active_staff","pending_complaints","low_attendance","exam_pending"]`.

## Relevant files
- `backend/src/modules/reports/reports.module.ts`
- `backend/src/modules/reports/reports.service.ts`
- `backend/src/modules/reports/processors/report-generation.processor.ts`
- `backend/src/modules/reports/services/report-scheduler.service.ts`
- `backend/src/modules/reports/entities/saved-report.entity.ts`
- `backend/src/modules/reports/entities/report-schedule.entity.ts`
- `backend/src/modules/reports/entities/report-run-history.entity.ts`
- `backend/src/modules/reports/entities/executive-dashboard-config.entity.ts`
- `backend/src/database/migrations/041-reports-analytics.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/reports/executive/page.tsx`
- `frontend/src/app/(dashboard)/reports/page.tsx`
- `frontend/src/app/(dashboard)/reports/saved/page.tsx`
- `frontend/src/app/(dashboard)/reports/history/page.tsx`
- `frontend/src/components/reports/ReportViewer.tsx`
- `frontend/src/components/reports/ExportButton.tsx`
- `frontend/src/components/reports/ExecutiveDashboard.tsx`
