# Phase 6 — Reports & Analytics (Module 27)

## What & Why
Build the Reports & Analytics module — the business intelligence layer of SchoolOS. In the Indian K-12 context, school leaders (Principals, Managers, Owners) need real-time, data-driven insights to manage operations, track academic progress, and ensure financial health. This module aggregates data from every other module (Academics, Fees, Attendance, HR, Admissions) into high-level dashboards and detailed, filterable reports. It also serves as the engine for government compliance reporting, specifically UDISE (Unified District Information System for Education), which is mandatory for all schools in India. By providing a "single pane of glass," it reduces the time spent on manual data consolidation and helps identify issues like declining attendance or fee defaults before they become critical.

## Done looks like
- Executive Dashboard for School Management showing real-time KPIs: total students, staff count, today's attendance %, monthly fee collection vs. target, and admission conversion rate.
- Academic Analytics: Grade-wise and subject-wise performance trends, pass/fail ratios, and student progress tracking across multiple exam groups.
- Financial MIS: Detailed collection reports, outstanding dues (defaulter list) with aging analysis, and head-wise income summary.
- Operational Reports: Staff attendance summary, leave patterns, and inventory status alerts.
- Data Export: Every report can be exported as Excel (XLSX) or PDF with school branding.
- Scheduled Reports: Admins can schedule key reports (e.g., Daily Collection Summary) to be emailed to management automatically.
- Audit Log Viewer: System-wide activity tracking with filters for user, module, action, and date range.
- UDISE Pre-check: A validation dashboard that flags missing mandatory data required for annual UDISE+ submissions.
- Performance: Complex analytical queries use materialized views or read-replicas where available; results are cached in Redis.

## Out of scope
- Custom Report Builder (Ad-hoc query builder for end-users) — planned for Phase 7.
- AI-powered predictive analytics (e.g., predicting student dropout risk) — planned for Phase 8.
- Integration with external BI tools like Tableau or PowerBI.
- Real-time streaming analytics (sub-second latency is not required).

## Tasks

1. **DB migration — reporting and analytics core** — Create migration `041-reports-analytics.ts` with:
   - `report_definitions`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(200) NOT NULL, category ENUM('academic','finance','attendance','hr','inventory','admissions','system') NOT NULL, description TEXT NULL, slug VARCHAR(100) NOT NULL, config JSONB NOT NULL, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now())`. Unique: `(school_id, slug)`.
   - `saved_reports`: `(id UUID PK, school_id UUID NOT NULL, report_definition_id UUID NOT NULL FK report_definitions, name VARCHAR(300) NOT NULL, filters JSONB NOT NULL, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - `report_schedules`: `(id UUID PK, school_id UUID NOT NULL, saved_report_id UUID NOT NULL FK saved_reports, frequency ENUM('daily','weekly','monthly') NOT NULL, recipients TEXT[] NOT NULL, last_sent_at TIMESTAMPTZ NULL, next_run_at TIMESTAMPTZ NULL, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now())`. Index: `(next_run_at, is_active)`.
   - `analytics_snapshots`: `(id UUID PK, school_id UUID NOT NULL, metric_name VARCHAR(100) NOT NULL, metric_value DECIMAL(18,2) NOT NULL, dimensions JSONB NULL, snapshot_date DATE NOT NULL, created_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, metric_name, snapshot_date)`.
   - All composite indexes start with `school_id`.

2. **Dashboard Analytics Endpoints**:
   - `GET /v1/analytics/dashboard/summary` — Returns top-level KPIs. Data: `{ total_students, attendance_today_pct, fees_collected_month, pending_complaints, staff_on_leave }`. Redis cache 10 min. Permission: `analytics.dashboard.view`.
   - `GET /v1/analytics/dashboard/finance-trends` — Monthly collection vs. target for the last 12 months. Permission: `analytics.dashboard.view`.
   - `GET /v1/analytics/dashboard/academic-performance` — Average percentage per grade for the latest exam group. Permission: `analytics.dashboard.view`.

3. **Academic Reporting Endpoints**:
   - `GET /v1/analytics/reports/academic/subject-performance` — Filters: `class_id`, `subject_id`, `exam_group_id`. Returns distribution of marks (distinction, first class, etc.). Permission: `analytics.report.academic`.
   - `GET /v1/analytics/reports/academic/student-growth` — Filters: `student_id`. Returns performance trend across academic years. Permission: `analytics.report.academic`.

4. **Financial Reporting Endpoints**:
   - `GET /v1/analytics/reports/finance/collection-summary` — Filters: `from_date`, `to_date`, `payment_mode`, `fee_head_id`. Permission: `analytics.report.finance`.
   - `GET /v1/analytics/reports/finance/defaulters-aging` — Returns list of students with pending dues grouped by delay (0-30 days, 31-60 days, etc.). Permission: `analytics.report.finance`.

5. **Operational Reporting Endpoints**:
   - `GET /v1/analytics/reports/attendance/class-summary` — Filters: `month`, `class_id`. Monthly attendance grid for a class. Permission: `analytics.report.attendance`.
   - `GET /v1/analytics/reports/hr/staff-attendance` — Filters: `from_date`, `to_date`, `department_id`. Permission: `analytics.report.hr`.

6. **System & Audit Endpoints**:
   - `GET /v1/analytics/audit-logs` — Paginated list of `AuditLogEntity`. Filters: `user_id`, `module`, `action`, `date_range`. Permission: `system.audit.view`.
   - `GET /v1/analytics/reports/export/:reportSlug` — Triggers a BullMQ job to generate a large XLSX/PDF report. Returns `job_id`. Permission: `analytics.report.export`.

7. **Report Scheduling Endpoints**:
   - `POST /v1/analytics/schedules` — Create a report schedule. Permission: `analytics.schedule.manage`.
   - `GET /v1/analytics/schedules` — List schedules. Permission: `analytics.schedule.view`.
   - `PATCH /v1/analytics/schedules/:id`. Permission: `analytics.schedule.manage`.

8. **NestJS Module**:
   - Create `AnalyticsModule` in `backend/src/modules/platform/analytics/`.
   - Entities: `ReportDefinitionEntity`, `SavedReportEntity`, `ReportScheduleEntity`, `AnalyticsSnapshotEntity`.
   - Import: `FeesModule`, `AcademicsModule`, `AttendanceModule`, `StudentsModule`, `HRModule`.
   - Create `AnalyticsService` that performs cross-module joins and aggregations.
   - Register in `AppModule`.

9. **Permissions**:
   - `analytics.dashboard.view`, `analytics.report.academic`, `analytics.report.finance`, `analytics.report.attendance`, `analytics.report.hr`, `analytics.report.export`, `analytics.schedule.manage`, `system.audit.view`.
   - Default: `super_admin`, `admin`, `principal` — All. `accountant` — `finance` reports. `academic_coordinator` — `academic` reports.

10. **Frontend — Analytics Dashboard (`/dashboard/analytics`)**:
    - High-level KPI grid with trend indicators (up/down from last month).
    - Charts: Line chart for fee collection, Bar chart for class-wise performance, Doughnut for attendance.
    - Date range filter for the entire dashboard.
    - Loading states with shimmer charts.

11. **Frontend — Reports Center (`/dashboard/analytics/reports`)**:
    - Sidebar or tabs by category (Academic, Finance, Attendance, etc.).
    - Filter panel for each report (Date range, Class, Subject, etc.).
    - Data table with sorting and pagination.
    - "Export to Excel" and "Export to PDF" buttons.
    - "Save Report" and "Schedule" buttons.

12. **Frontend — Audit Logs (`/dashboard/settings/audit-logs`)**:
    - Searchable table of system activities.
    - Detailed view for each log entry (shows before/after JSON data).
    - Filter by user and module.

13. **Seed Data**:
    - 5 `ReportDefinition` entries (Collection Summary, Defaulter List, Class Performance, Staff Attendance, Admission Funnel).
    - Sample `AnalyticsSnapshot` data for the last 6 months to populate demo charts.

## Relevant files
- `backend/src/modules/platform/analytics/`
- `backend/src/database/migrations/041-reports-analytics.ts`
- `frontend/src/app/(dashboard)/analytics/page.tsx`
- `frontend/src/app/(dashboard)/analytics/reports/page.tsx`
- `frontend/src/components/analytics/AnalyticsCharts.tsx`
- `backend/src/modules/platform/audit/audit.service.ts`
