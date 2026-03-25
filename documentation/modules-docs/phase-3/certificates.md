# Phase 3 — Certificates & Document Management (Module 10)

## What & Why
Build the Certificates & Document Management module — the official school registrar's engine for Indian K-12 schools. Schools are legal entities required to issue various official documents: Transfer Certificates (TC) for students leaving the school, Bonafide Certificates for passport/bank applications, Character Certificates, Migration Certificates, Study Certificates, and Conduct Certificates. Each document must follow a specific legal format, have a unique serial number, and carry the official school seal. This module automates the entire request-to-generation lifecycle, ensuring that student data is accurately pulled from the core database, reducing clerical errors and speeding up the process for parents.

## Done looks like
- Admins can define certificate types with customizable HTML templates, auto-numbering prefixes, and sequence management.
- Parents and students can request specific certificates through the portal, providing a reason for the request.
- A multi-stage approval workflow: Request → Review (Teacher/Admin) → Approve/Generate (Admin) → Issue.
- Automated PDF generation: Puppeteer renders the HTML template with dynamic student data, school header, and principal signature.
- Unique certificate serial numbers are auto-assigned upon approval to prevent duplicates.
- Digital repository: students can view and download all their issued certificates from the portal.
- Physical issuance log: tracks when a physical copy was handed over and whether a signature was obtained.
- Public Verification Endpoint: a public URL where external institutions can verify a certificate's authenticity using its unique number.
- TC-specific logic: ensures all dues are cleared (Fees Module integration) and academic records are complete before generation.
- All pages feature skeleton loaders, empty states, and PDF preview windows.

## Out of scope
- Physical printing of plastic ID cards (Phase 4 hardware integration).
- Design-only templates (only HTML/PDF generation is supported).
- Digital signatures (Aadhaar-based/e-Sign) — simple signature image overlays only.
- External board certificate verification (CBSE/ICSE/State Board).

## Tasks

1. **DB migration — certificates tables** — Create migration `028-certificates.ts` with:
   - `certificate_types`: `(id UUID PK, school_id UUID NOT NULL, type_code VARCHAR(30) NOT NULL, type_name VARCHAR(200) NOT NULL, description TEXT NULL, template_html TEXT NULL, requires_approval BOOLEAN DEFAULT true, auto_number_prefix VARCHAR(10) NULL, next_sequence_number INT DEFAULT 1, validity_days INT NULL, fee_amount DECIMAL(8,2) DEFAULT 0.00, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Unique index: `(school_id, type_code)`.
   - `certificate_requests`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, certificate_type_id UUID NOT NULL FK certificate_types, academic_year_id UUID NOT NULL FK academic_years, certificate_number VARCHAR(50) NULL, requested_by UUID NOT NULL FK users, request_reason TEXT NOT NULL, requested_for VARCHAR(200) NULL, status ENUM('pending','approved','generated','rejected','revoked') NOT NULL DEFAULT 'pending', requested_at TIMESTAMPTZ DEFAULT now(), approved_by UUID NULL FK users, approved_at TIMESTAMPTZ NULL, rejected_reason TEXT NULL, generated_at TIMESTAMPTZ NULL, pdf_url TEXT NULL, revoked_at TIMESTAMPTZ NULL, revoke_reason TEXT NULL, fee_paid BOOLEAN DEFAULT false, fee_paid_amount DECIMAL(8,2) NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Unique index: `(school_id, certificate_number)` (where not null).
     - Index: `(school_id, student_id, status)`, `(school_id, certificate_type_id)`.
   - `certificate_issuances`: `(id UUID PK, school_id UUID NOT NULL, certificate_request_id UUID NOT NULL FK certificate_requests, issued_to VARCHAR(300) NOT NULL, issued_date DATE NOT NULL DEFAULT CURRENT_DATE, delivery_mode ENUM('digital','physical','both') NOT NULL DEFAULT 'digital', physical_copy_count INT NOT NULL DEFAULT 0, issued_by UUID NOT NULL FK users, recipient_signature_required BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Index: `(school_id, certificate_request_id)`.
   - All composite indexes MUST start with `school_id`.

2. **Certificate types endpoints** — CRUD for managing types:
   - `GET /v1/certificates/types` — List all available certificate types. Permission: `certificate.type.view`.
   - `POST /v1/certificates/types` — Create new certificate type with HTML template. Permission: `certificate.type.manage`.
   - `PATCH /v1/certificates/types/:id` — Update type or template. Permission: `certificate.type.manage`.
   - `DELETE /v1/certificates/types/:id` — Soft delete. Permission: `certificate.type.manage`.

3. **Certificate requests endpoints** — Workflow management:
   - `POST /v1/certificates/requests` — Submit a request for a certificate. Body: `{ student_id, certificate_type_id, academic_year_id, request_reason, requested_for? }`. Permission: `certificate.request.create`.
   - `GET /v1/certificates/requests` — List requests; filters: `student_id`, `status`, `type_id`, `date_range`. Paginated. Permission: `certificate.request.view`.
   - `GET /v1/certificates/requests/:id` — Single request detail with status history. Permission: `certificate.request.view`.
   - `POST /v1/certificates/requests/:id/approve` — Approve request. Body: `{ }`. Sets `status = 'approved'`, `approved_by`, `approved_at`. Triggers BullMQ job to generate PDF and assigns `certificate_number`. Permission: `certificate.request.approve`.
   - `POST /v1/certificates/requests/:id/reject` — Reject request. Body: `{ reason }`. Sets `status = 'rejected'`, `rejected_reason`. Permission: `certificate.request.approve`.
   - `POST /v1/certificates/requests/:id/revoke` — Revoke issued certificate. Body: `{ reason }`. Sets `status = 'revoked'`. Permission: `certificate.request.approve`.

4. **Certificate issuance & verification endpoints** — Post-generation:
   - `POST /v1/certificates/requests/:id/log-issuance` — Record physical delivery of a certificate. Body: `{ issued_to, delivery_mode, physical_copy_count, recipient_signature_required }`. Permission: `certificate.request.approve`.
   - `GET /v1/certificates/verify/:certificateNumber` — Public endpoint to verify authenticity. Returns: `{ student_name, admission_no, certificate_type, issued_date, status }`. **Public - No Auth Required**.

5. **BullMQ PDF Generation Job** — Async processing:
   - `CertificateGeneratorProcessor`: Fetches `template_html` from `certificate_types`, student data from `students` and `student_profile`, academic records. Renders using Puppeteer with school-specific CSS. Uploads to object storage (e.g., S3). Updates `pdf_url` and `generated_at` in `certificate_requests`. Emits `certificate.generated`.

6. **Certificates module NestJS wiring** — Create `CertificatesModule` in `backend/src/modules/certificates/`. Entities: `CertificateType`, `CertificateRequest`, `CertificateIssuance`. Import `StudentsModule`, `AcademicsModule`. Export `CertificatesService`.

7. **Permissions registration** — Add to `backend/src/config/permissions.ts`:
   - `certificate.type.manage`
   - `certificate.request.view`, `certificate.request.create`, `certificate.request.approve`
   - `certificate.report.view`
   - Default assignments: `super_admin`, `admin`, `principal` — all. `teacher` — request.view, request.approve (for their class). `parent` — request.create, request.view (for their children). `student` — request.create, request.view (own only).

8. **Frontend — Certificate Workflow UI** — Components:
   - **Request Form** (`/dashboard/certificates/new`): Type selector, dynamic fields for reason, and preview of required fee.
   - **Approval Queue** (`/dashboard/certificates/admin/requests`): A table for admins to review, approve (triggering PDF generation), or reject requests.
   - **My Certificates** (`/dashboard/students/:id?tab=certificates`): A list of issued certificates with download PDF buttons.
   - **Template Editor** (`/dashboard/certificates/admin/types/:id`): An HTML/Markdown editor with "merge fields" (e.g., `{{student_name}}`) for defining templates.

9. **Seed certificates data** — Update `seed.ts` to:
   - Insert 5 certificate types: "Transfer Certificate" (TC), "Bonafide Certificate", "Character Certificate", "Study Certificate", "Conduct Certificate".
   - Create one approved "Bonafide Certificate" request for demo student `ADM-2025-001` with a placeholder PDF URL and serial number `BON-2025-001`.

## Relevant files
- `backend/src/modules/certificates/certificates.module.ts`
- `backend/src/modules/certificates/entities/*.entity.ts`
- `backend/src/modules/certificates/endpoints/*`
- `backend/src/modules/certificates/certificate-generation.processor.ts`
- `backend/src/database/migrations/028-certificates.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/certificates/page.tsx`
- `frontend/src/app/(dashboard)/certificates/requests/page.tsx`
- `frontend/src/app/(dashboard)/certificates/admin/page.tsx`
- `frontend/src/components/modules/certificates/CertificateRequestForm.tsx`
- `frontend/src/components/modules/certificates/TemplateEditor.tsx`
- `frontend/src/hooks/use-certificates.ts`
