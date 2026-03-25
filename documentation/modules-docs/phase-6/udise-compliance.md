# Phase 6 — UDISE & Government Compliance (Module 35)

## What & Why
Build the UDISE & Government Compliance module — the regulatory gateway of SchoolOS. In India, every K-12 school must submit annual data to the **UDISE+ (Unified District Information System for Education Plus)** portal managed by the Ministry of Education. Submission typically happens Oct–Dec each year. The data covers: student enrollment (by class, gender, social category: SC/ST/OBC/EWS/General/Minority/Disability), teacher counts (by qualification and training), infrastructure (classrooms, toilets, library, playground, computers, internet), and scholarship/grant data. Failure to submit accurate data can affect government grants (SSA/RMSA), school recognition renewal, and CBSE affiliation. This module compiles all UDISE data from across SchoolOS, validates it against UDISE business rules, allows corrections, generates the submission-format export, and tracks the annual submission status. It also handles RTE 25% quota compliance, Aadhaar seeding status, and scholarship disbursement tracking. CRITICAL RULE: strictly read-only from operational modules — never modifies Students/HR/Attendance data.

## Done looks like
- Annual UDISE submission workflow: initiate → compile (async job aggregates data from Students, HR, Academics, Attendance, Examinations) → validate (flags errors and warnings) → export UDISE-format Excel → mark as submitted with reference number.
- Student count breakdown by class, gender, and social category (SC/ST/OBC/EWS/General/Minority/Disability) auto-compiled from Students module.
- Teacher data compilation from HR module (qualification, training, teaching subjects, contractual/regular status).
- Infrastructure data form (entered manually by admin annually — classrooms, toilets, library, computers, internet type, playground, grants).
- Compliance validation: 20+ validation rules flagging missing Aadhaar numbers, missing category data, enrollment inconsistencies, seat count mismatches.
- RTE 25% quota tracker per class (seats required vs filled vs enrolled).
- Aadhaar seeding status report for students and staff — bulk CSV upload to mark seeding.
- Scholarship tracking: student-level scholarship applications, approvals, and disbursements for NSP, state, and other schemes.
- Full submission history per academic year with export downloads.

## Out of scope
- Direct API integration with UDISE+ portal (Ministry of Education only supports manual Excel upload — no public API available).
- Non-educational government compliance (GST, Income Tax — handled by Financial Accounting).
- External accreditation compliance (NABET, NAAC, ISO).
- Legal or court case tracking.
- State-specific variants of UDISE beyond the standard national format (future enhancement).

## Tasks

1. **DB migration 042** — Create migration `042-udise-compliance.ts` using `queryRunner.query()` raw SQL. Tables:
   - `udise_submissions`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, academic_year_id UUID NOT NULL REFERENCES academic_years(id), udise_code VARCHAR(11) NOT NULL, submission_year INT NOT NULL, status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','data_compiled','validated','submitted','accepted','rejected')), compiled_at TIMESTAMPTZ NULL, validated_at TIMESTAMPTZ NULL, submitted_at TIMESTAMPTZ NULL, submission_reference VARCHAR(100) NULL, rejection_reason TEXT NULL, compiled_by UUID NULL REFERENCES users(id), submitted_by UUID NULL REFERENCES users(id), data_snapshot JSONB NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Unique: `(school_id, academic_year_id)`. Index: `(school_id, submission_year)`.
   - `udise_infrastructure_data`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, academic_year_id UUID NOT NULL REFERENCES academic_years(id), total_classrooms INT NULL, good_condition_classrooms INT NULL, needs_repair_classrooms INT NULL, has_library BOOLEAN NULL, library_books_count INT NULL, has_playground BOOLEAN NULL, playground_area_sqm DECIMAL(10,2) NULL, has_electricity BOOLEAN NULL, has_drinking_water BOOLEAN NULL, boys_toilets INT NULL, girls_toilets INT NULL, has_ramp BOOLEAN NULL, has_computer_lab BOOLEAN NULL, computers_count INT NULL, has_internet BOOLEAN NULL, internet_type VARCHAR(100) NULL, annual_maintenance_grant DECIMAL(12,2) NULL, school_management_type VARCHAR(30) NULL CHECK (school_management_type IN ('government','private_aided','private_unaided','central_govt','other')), school_type VARCHAR(20) NULL CHECK (school_type IN ('boys','girls','co-educational')), minority_status BOOLEAN NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Unique: `(school_id, academic_year_id)`.
   - `rte_quota_tracking`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, academic_year_id UUID NOT NULL REFERENCES academic_years(id), class_id UUID NOT NULL REFERENCES classes(id), total_seats INT NOT NULL, rte_seats_required INT NOT NULL, rte_applications_received INT NOT NULL DEFAULT 0, rte_seats_selected INT NOT NULL DEFAULT 0, rte_seats_enrolled INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Unique: `(school_id, academic_year_id, class_id)`. Index: `(school_id, academic_year_id)`.
   - `aadhaar_seeding_log`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, entity_type VARCHAR(10) NOT NULL CHECK (entity_type IN ('student','staff')), entity_id UUID NOT NULL, aadhaar_last4 VARCHAR(4) NULL, is_seeded BOOLEAN NOT NULL DEFAULT false, seeded_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Unique: `(school_id, entity_type, entity_id)`. Index: `(school_id, entity_type, is_seeded)`.
   - `scholarship_tracking`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, student_id UUID NOT NULL REFERENCES students(id), academic_year_id UUID NOT NULL REFERENCES academic_years(id), scholarship_name VARCHAR(300) NOT NULL, scholarship_type VARCHAR(30) NOT NULL CHECK (scholarship_type IN ('central_govt','state_govt','nsp','minority','disability','merit','other')), amount_sanctioned DECIMAL(10,2) NULL, amount_received DECIMAL(10,2) NULL, application_number VARCHAR(100) NULL, status VARCHAR(20) NOT NULL DEFAULT 'applied' CHECK (status IN ('applied','approved','disbursed','rejected')), applied_at DATE NULL, disbursed_at DATE NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Index: `(school_id, student_id)`, `(school_id, academic_year_id, scholarship_type)`.
   - `compliance_validation_issues`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, submission_id UUID NOT NULL REFERENCES udise_submissions(id) ON DELETE CASCADE, issue_type VARCHAR(30) NOT NULL CHECK (issue_type IN ('missing_data','invalid_value','threshold_breach','inconsistency')), field_name VARCHAR(200) NOT NULL, issue_description TEXT NOT NULL, severity VARCHAR(10) NOT NULL CHECK (severity IN ('error','warning','info')), is_resolved BOOLEAN NOT NULL DEFAULT false, resolved_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Index: `(school_id, submission_id, severity, is_resolved)`.
   - All composite indexes start with `school_id`.

2. **UDISE Submission Lifecycle Endpoints** (permission `udise.submission.manage`/`udise.submission.view`):
   - `POST /v1/udise/submissions` — create/initiate submission; body: `{ academic_year_id, udise_code }`; validates: no existing submission for academic_year (unique constraint); creates record with status=draft; permission: `udise.submission.manage`; audit logged.
   - `GET /v1/udise/submissions` — list all submissions by school with status badge; permission: `udise.submission.view`.
   - `GET /v1/udise/submissions/:id` — full detail including data_snapshot JSON; permission: `udise.submission.view`.
   - `POST /v1/udise/submissions/:id/compile` — async BullMQ job (queue: `udise-compilation`); job reads across modules: student count by class+gender+category from Students, teacher count + qualification from HR, attendance % from Attendance, exam results from Examinations, enrollment from Admissions; compiles into `data_snapshot` JSONB; sets status=data_compiled, compiled_at=now(); returns 202 + `{ job_id }`; permission: `udise.submission.manage`.
   - `POST /v1/udise/submissions/:id/validate` — runs 20+ validation rules on data_snapshot; creates `compliance_validation_issues` records; if zero errors (warnings ok) → sets status=validated, validated_at=now(); returns `{ errors: INT, warnings: INT, issues: [...] }`; permission: `udise.submission.manage`.
   - `POST /v1/udise/submissions/:id/mark-submitted` — body: `{ submission_reference }`; sets status=submitted, submitted_at=now(), submission_reference; audit logged; permission: `udise.submission.manage`.
   - `GET /v1/udise/submissions/:id/export` — generates UDISE-format Excel (XLSX) from data_snapshot; Content-Type: application/vnd.openxmlformats; triggers async job; returns 202 + job_id; on completion, file downloadable from history; permission: `udise.submission.manage`.

3. **Validation Issues Endpoints** (permission `udise.submission.view`/`manage`):
   - `GET /v1/udise/submissions/:id/issues` — paginated; filters: `severity` ('error'|'warning'|'info'), `is_resolved` (boolean); returns `{ total_errors, total_warnings, issues: [...] }`; permission: `udise.submission.view`.
   - `PATCH /v1/udise/submissions/:id/issues/:issueId/resolve` — marks issue as resolved after admin manually fixes the underlying data; sets is_resolved=true, resolved_at=now(); permission: `udise.submission.manage`; audit logged.

4. **Infrastructure Data Endpoints**:
   - `GET /v1/udise/infrastructure?academic_year_id` — get infrastructure record (or null if not yet entered); permission: `udise.submission.view`.
   - `PUT /v1/udise/infrastructure` — upsert; body: all infrastructure fields (classrooms, toilets, library, playground, computers, internet, grants, school_type, minority_status, etc.); permission: `udise.submission.manage`; audit logged.

5. **RTE Quota Endpoints**:
   - `GET /v1/udise/rte?academic_year_id` — per-class quota status; returns `{ class_name, total_seats, rte_required, rte_enrolled, compliance_status: 'compliant'|'deficit'|'not_started' }[]`; permission: `udise.rte.view`.
   - `PATCH /v1/udise/rte/:id` — update applications_received, seats_selected, seats_enrolled counts for a class; permission: `udise.submission.manage`; audit logged.

6. **Aadhaar Seeding Endpoints**:
   - `GET /v1/udise/aadhaar-seeding?entity_type=student|staff&is_seeded?&class_section_id?` — paginated list; each row: entity name, class/department, seeding status; summary header: `{ total, seeded, not_seeded, seeding_percent }`; permission: `udise.aadhaar.view`.
   - `PATCH /v1/udise/aadhaar-seeding/:id` — body: `{ is_seeded: true, aadhaar_last4 }`; updates single record; permission: `udise.aadhaar.manage`; audit logged.
   - `POST /v1/udise/aadhaar-seeding/bulk-update` — body: multipart CSV upload; CSV columns: entity_type, entity_id, aadhaar_last4, is_seeded; Idempotency-Key header required; BullMQ async job; returns 202 + job_id; permission: `udise.aadhaar.manage`.

7. **Scholarship Tracking Endpoints**:
   - `POST /v1/udise/scholarships` — body: `{ student_id, academic_year_id, scholarship_name, scholarship_type, amount_sanctioned?, application_number?, applied_at? }`; permission: `udise.scholarship.manage`; audit logged.
   - `GET /v1/udise/scholarships?student_id?&academic_year_id?&scholarship_type?&status?` — paginated; includes student name from join; permission: `udise.scholarship.view`.
   - `PATCH /v1/udise/scholarships/:id` — update status, amount_received, disbursed_at; permission: `udise.scholarship.manage`.
   - `GET /v1/udise/scholarships/summary?academic_year_id` — `{ by_type: [{ scholarship_type, count, total_sanctioned, total_received }] }`; permission: `udise.scholarship.view`.

8. **UDISE Data Reports**:
   - `GET /v1/udise/reports/student-summary?academic_year_id` — student count by class, gender (M/F/T), and social category (SC/ST/OBC/EWS/General/Minority/Disability); read from data_snapshot if compiled, else live query; permission: `udise.submission.view`.
   - `GET /v1/udise/reports/enrollment-trends?from_year&to_year` — year-over-year total enrollment per class group; read from historical snapshots; permission: `udise.submission.view`.

9. **NestJS Module** — Create `UdiseComplianceModule` in `backend/src/modules/udise-compliance/`:
   - Entities: `UdiseSubmissionEntity`, `UdiseInfrastructureDataEntity`, `RteQuotaTrackingEntity`, `AadhaarSeedingLogEntity`, `ScholarshipTrackingEntity`, `ComplianceValidationIssueEntity`.
   - Import: `StudentsModule`, `AcademicsModule`, `HrModule`, `AttendanceModule`, `ExaminationsModule`, `AdmissionsModule`.
   - Register BullMQ queue `udise-compilation` and `UdiseCompilationProcessor`.
   - STRICT READ-ONLY rule: never call INSERT/UPDATE/DELETE on tables owned by other modules.
   - Export nothing (leaf module). Register in `AppModule`.

10. **Permissions** — Register in `backend/src/config/permissions.ts`:
    - `udise.submission.view`, `udise.submission.manage`, `udise.rte.view`, `udise.aadhaar.view`, `udise.aadhaar.manage`, `udise.scholarship.view`, `udise.scholarship.manage`.
    - Default: super_admin/admin — all. principal — submission.view, rte.view, aadhaar.view, scholarship.view.

11. **Frontend Pages**:
    - UDISE Compliance Center (`/dashboard/udise`): Current academic year submission card with status badge (Draft/Compiled/Validated/Submitted/Accepted/Rejected). 6-step progress bar: Infrastructure Data → Compile Data → Validate → Export → Upload on UDISE Portal → Mark Submitted. Each step has action button; completed steps greyed out with tick. Previous submissions accordion below.
    - Infrastructure Form (`/dashboard/udise/infrastructure`): Form grouped by section: Classrooms (count, condition breakdown), Sanitation (boys/girls toilets, drinking water), Facilities (library books, playground, ramp), Technology (computer lab, computers count, internet type), Grants (annual maintenance grant amount), School Profile (management type, school type, minority status). Save button. Pre-fills from previous year's data on first open.
    - Submission Detail (`/dashboard/udise/submissions/:id`): Tabs: Students (count matrix by class × category × gender), Teachers (qualification distribution), Infrastructure (summary of entered data), Enrollment (class-wise total). Re-compile button (re-triggers async job). Validate button. Validation issues panel appears after validation: severity-filtered list, Mark Resolved per issue. Export button. Mark as Submitted form (enter reference number).
    - RTE Quota (`/dashboard/udise/rte`): Table per class — required seats, enrolled, compliance badge (green/red). Inline edit for enrolled count. Summary banner: school-wide RTE compliance %.
    - Aadhaar Seeding (`/dashboard/udise/aadhaar`): Tab: Students / Staff. Table with seeding status chip. Summary: X of Y seeded (%). Bulk upload CSV button (template download). Manual mark-as-seeded per row.
    - Scholarships (`/dashboard/udise/scholarships`): Filter by academic year, scholarship type, status. Table: student, type, amount, status badge. Add button opens slide-over form. Update status inline.

12. **Seed Data**:
    - 1 `udise_submission` for 2025–26 (status: draft, udise_code: '09060400201').
    - 1 `udise_infrastructure_data` for 2025–26 (has_library: true, has_playground: true, has_electricity: true, total_classrooms: 10, computers_count: 15, has_internet: true, internet_type: 'broadband', school_management_type: 'private_unaided', school_type: 'co-educational').
    - RTE quota for Grade 1 (total_seats: 40, rte_seats_required: 10, rte_seats_enrolled: 6 — shows deficit).
    - 1 scholarship (student: ADM-2025-001, scholarship_name: 'PM YASASVI Scholarship', type: 'central_govt', status: 'applied').

## Relevant files
- `backend/src/modules/udise-compliance/udise-compliance.module.ts`
- `backend/src/modules/udise-compliance/services/udise-submission.service.ts`
- `backend/src/modules/udise-compliance/services/udise-validation.service.ts`
- `backend/src/modules/udise-compliance/processors/udise-compilation.processor.ts`
- `backend/src/modules/udise-compliance/entities/udise-submission.entity.ts`
- `backend/src/modules/udise-compliance/entities/udise-infrastructure-data.entity.ts`
- `backend/src/modules/udise-compliance/entities/rte-quota-tracking.entity.ts`
- `backend/src/modules/udise-compliance/entities/aadhaar-seeding-log.entity.ts`
- `backend/src/modules/udise-compliance/entities/scholarship-tracking.entity.ts`
- `backend/src/modules/udise-compliance/entities/compliance-validation-issue.entity.ts`
- `backend/src/database/migrations/042-udise-compliance.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/udise/page.tsx`
- `frontend/src/app/(dashboard)/udise/submissions/[id]/page.tsx`
- `frontend/src/app/(dashboard)/udise/infrastructure/page.tsx`
- `frontend/src/app/(dashboard)/udise/rte/page.tsx`
- `frontend/src/app/(dashboard)/udise/aadhaar/page.tsx`
- `frontend/src/app/(dashboard)/udise/scholarships/page.tsx`
