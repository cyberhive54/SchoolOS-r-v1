# Phase 6 — UDISE & Government Compliance (Module 35)

## What & Why
Build the UDISE & Government Compliance module — the regulatory gateway of SchoolOS. In India, every K-12 school is mandatory to submit annual data to the **UDISE+ (Unified District Information System for Education)** portal. This data covers every aspect of the school: student profiles, teacher details, infrastructure, facilities, and financial grants. Failure to submit accurate and timely UDISE data can lead to loss of school recognition. This module is a specialized compliance layer that maps SchoolOS internal data (from Students, Academics, HR, Inventory, and Finance) to the specific formats and fields required by the Ministry of Education. It provides a "compliance dashboard" to identify missing data early and an automated export tool to generate the final data files for upload, drastically reducing the manual effort and error rate during the annual UDISE+ submission window (typically Oct–Dec).

## Done looks like
- UDISE Compliance Dashboard: A real-time overview of the school's readiness for government reporting across 11 key sections (Basic, Infrastructure, Staff, Students, etc.).
- Automated Field Mapping: A configuration layer that maps internal SchoolOS data (e.g., student category, RTE status, teacher qualification) to UDISE-specific codes.
- Pre-submission Data Validation: An automated "check" that flags missing or incorrect mandatory fields (e.g., Aadhar number, bank account details, minority status) with one-click navigation to fix.
- Student SDMS (Student Database Management System) Export: Bulk export of student-level data in the exact Excel format required by the UDISE+ SDMS portal.
- Teacher Data Export: Comprehensive teacher profiles and qualification data exported as per government requirements.
- Infrastructure and Facilities Report: Automated data gathering for the DCF (Data Capture Format) Section 2 (Infrastructure) and Section 3 (Facilities).
- Grant and Scholarship Tracking: Reporting on government grants (SSA, RMSA, etc.) and student-level scholarship disbursements.
- Board Exam Results Integration: Automated export of Grade 10 and 12 board results in the UDISE+ format.
- Annual Compliance Calendar: Reminders for mandatory government submissions (UDISE, RTE, Annual Recognition Renewal).

## Out of scope
- Direct API integration with government portals (currently not supported by Ministry of Education — manual upload only).
- Non-educational government compliance (e.g., GST, Income Tax — handled by Finance/Accounting).
- External accreditation compliance (e.g., NABET, ISO — specialized modules).
- Legal / Court case tracking.

## Tasks

1. **DB migration — compliance core** — Create migration `042-udise-compliance.ts` with:
   - `udise_config`: `(id UUID PK, school_id UUID NOT NULL, academic_year_id UUID NOT NULL FK academic_years, school_category ENUM('primary','middle','secondary','senior_secondary') NOT NULL, school_type ENUM('boys','girls','co-educational') NOT NULL, school_management ENUM('government','aided','private','other') NOT NULL, udise_code VARCHAR(11) NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - `udise_mapping_rules`: `(id UUID PK, school_id UUID NOT NULL, field_type ENUM('student_category','teacher_designation','qualification','subject_group') NOT NULL, internal_value VARCHAR(100) NOT NULL, udise_code VARCHAR(20) NOT NULL, created_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, field_type, internal_value)`.
   - `compliance_check_results`: `(id UUID PK, school_id UUID NOT NULL, module ENUM('student','staff','infrastructure','finance') NOT NULL, entity_id UUID NOT NULL, issue_type ENUM('missing_data','invalid_format','conflict') NOT NULL, description TEXT NOT NULL, severity ENUM('low','medium','high','critical') NOT NULL, last_checked_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, module, severity)`.
   - `udise_exports`: `(id UUID PK, school_id UUID NOT NULL, export_type ENUM('sdms_student','teacher_profile','school_dcf') NOT NULL, academic_year_id UUID NOT NULL FK academic_years, file_url TEXT NOT NULL, exported_by UUID NOT NULL FK users, exported_at TIMESTAMPTZ DEFAULT now())`.
   - All composite indexes start with `school_id`.

2. **UDISE Config & Mapping Endpoints**:
   - `PUT /v1/compliance/udise/config` — Save school-level UDISE base configuration. Permission: `compliance.udise.manage`.
   - `GET /v1/compliance/udise/config`. Permission: `compliance.udise.view`.
   - `POST /v1/compliance/udise/mappings` — Upsert internal-to-UDISE mappings. Permission: `compliance.udise.manage`.
   - `GET /v1/compliance/udise/mappings?field_type=`. Permission: `compliance.udise.view`.

3. **Compliance Dashboard & Validation Endpoints**:
   - `GET /v1/compliance/dashboard/summary` — Returns % readiness per section (Infrastructure, Students, Staff, Finance). Permission: `compliance.udise.view`.
   - `GET /v1/compliance/checks/results` — Paginated list of `compliance_check_results`. Filters: `module`, `severity`. Permission: `compliance.udise.view`.
   - `POST /v1/compliance/checks/run` — Triggers a BullMQ background job to scan all data against UDISE validation rules. Permission: `compliance.udise.manage`. Returns `job_id`.

4. **Data Export Endpoints**:
   - `POST /v1/compliance/udise/exports/student` — BullMQ job to generate UDISE+ SDMS Bulk Upload Excel. Permission: `compliance.udise.export`.
   - `POST /v1/compliance/udise/exports/teacher` — BullMQ job for Teacher Profile DCF. Permission: `compliance.udise.export`.
   - `POST /v1/compliance/udise/exports/dcf` — BullMQ job for full school infrastructure/facilities DCF. Permission: `compliance.udise.export`.
   - `GET /v1/compliance/udise/exports` — List of previously generated exports with download links. Permission: `compliance.udise.export`.

5. **Infrastructure Compliance Endpoints**:
   - `GET /v1/compliance/infrastructure/dcf-summary` — Aggregates data from `Inventory`, `Hostel`, and `Academics` modules for Section 2 & 3 of UDISE. Permission: `compliance.udise.view`.

6. **NestJS Module**:
   - Create `ComplianceModule` in `backend/src/modules/platform/compliance/`.
   - Entities: `UdiseConfigEntity`, `UdiseMappingRuleEntity`, `ComplianceCheckResultEntity`, `UdiseExportEntity`.
   - Import: `StudentsModule`, `HRModule`, `AcademicsModule`, `InventoryModule`, `FinanceModule`.
   - Create `UdiseValidationService` with logic for all ~300+ UDISE fields.
   - Register in `AppModule`.

7. **Permissions**:
   - `compliance.udise.view`, `compliance.udise.manage`, `compliance.udise.export`.
   - Default: `super_admin`, `admin`, `principal` — All. Others — None.

8. **Frontend — UDISE Compliance Dashboard (`/dashboard/compliance/udise`)**:
    - Readiness summary cards (Infrastructure, Student, Staff, Facilities).
    - Section-wise progress bars.
    - "Run Compliance Check" primary button.
    - List of high-severity missing data (e.g., "120 Students missing Aadhar").
    - Links to fix issues directly.

9. **Frontend — Data Mapping Center (`/dashboard/compliance/udise/mappings`)**:
    - Tabs for Student Category, Staff Qualification, Disability Types, etc.
    - Interface to map SchoolOS internal dropdown values to UDISE numeric codes.
    - Bulk upload mapping capability.

10. **Frontend — Bulk Exports (`/dashboard/compliance/udise/exports`)**:
    - List of export jobs with status (Queued, Processing, Completed, Failed).
    - Download buttons for completed files.
    - "New Export" slide-over with type and academic year selection.

11. **Seed Data**:
    - Default UDISE mapping rules for standard Indian contexts (e.g., General=1, SC=2, ST=3, OBC=4).
    - 1 sample `UdiseConfig` for the demo school.
    - Initial `ComplianceCheckResult` entries for demo students/staff.

## Relevant files
- `backend/src/modules/platform/compliance/`
- `backend/src/database/migrations/042-udise-compliance.ts`
- `frontend/src/app/(dashboard)/compliance/page.tsx`
- `frontend/src/app/(dashboard)/compliance/udise/page.tsx`
- `frontend/src/components/compliance/ComplianceReadinessChart.tsx`
- `backend/src/modules/students/entities/student.entity.ts`
- `backend/src/modules/hr/entities/staff.entity.ts`
