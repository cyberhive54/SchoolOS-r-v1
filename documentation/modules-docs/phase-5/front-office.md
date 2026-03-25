# Phase 5 — Front Office Management (Module 1)

## What & Why
The Front Office Management module is the central hub for all physical school office interactions in a multi-tenant environment. In Indian K-12 schools, the reception or front desk is the first point of contact for visitors, parents, and prospective admissions. This module digitizes the traditionally paper-based logs for visitors, phone calls, postal items, complaints, and general enquiries. By moving these to SchoolOS, schools ensure better security (visitor tracking), improved accountability (complaint resolution timeline), and reduced information loss (call logs and postal tracking). It sits at Layer 7 (Administrative Operations) and provides critical data for school security and parent satisfaction.

## Done looks like
- Receptionists can check-in and check-out visitors with auto-generated pass numbers and mandatory purpose fields.
- System maintains a real-time list of "Active Visitors" currently on campus for security compliance.
- Phone call logs track inbound/outbound calls with follow-up reminders and status tracking.
- Postal dispatch and receive logs manage the flow of physical mail with tracking numbers and delivery status.
- Complaint management system tracks grievances from parents, staff, and students with a priority-based escalation and timeline.
- General enquiries (walk-in or phone) are captured and tracked until responded to, preventing lead leakage.
- Dashboard provides "Today's Stats" for immediate visibility into office workload and pending tasks.
- All interactions are tied to `school_id` and follow the platform's standard audit logging and PBAC rules.

## Out of scope
- Admission-specific CRM workflows (handled by the Admissions module).
- Staff attendance (handled by HR module).
- Security gate hardware integration (biometrics/turnstiles) — manual logs only in this phase.
- Internal staff-to-staff messaging (Communication module).
- Physical storage location management for postal items.

## Tasks

1. **DB Migration — Front Office Core (Migration 038)** — Create migration with the following tables:
   - `visitor_logs`: `(id UUID PK, school_id UUID NOT NULL, visitor_name VARCHAR(300) NOT NULL, visitor_phone VARCHAR(15) NULL, visitor_id_type ENUM('aadhar','pan','passport','voter_id','driving_license','other') NULL, visitor_id_number VARCHAR(50) NULL, visitor_organization VARCHAR(300) NULL, purpose ENUM('student_meeting','staff_meeting','admission_enquiry','delivery','maintenance','inspection','official_visit','other') NOT NULL, person_to_meet_id UUID NULL FK users, person_to_meet_name VARCHAR(300) NULL, student_id UUID NULL FK students, check_in_time TIMESTAMPTZ NOT NULL DEFAULT now(), check_out_time TIMESTAMPTZ NULL, visitor_pass_number VARCHAR(50) NULL, is_pre_approved BOOLEAN DEFAULT false, notes TEXT NULL, captured_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Index: `(school_id, check_in_time)`, `(school_id, student_id)`, `(school_id, person_to_meet_id)`, `(school_id, check_out_time)`.
   - `phone_call_logs`: `(id UUID PK, school_id UUID NOT NULL, call_type ENUM('inbound','outbound') NOT NULL, caller_name VARCHAR(300) NULL, caller_phone VARCHAR(15) NULL, call_datetime TIMESTAMPTZ NOT NULL DEFAULT now(), duration_minutes INT NULL, purpose TEXT NOT NULL, action_taken TEXT NULL, follow_up_required BOOLEAN DEFAULT false, follow_up_date DATE NULL, follow_up_assigned_to UUID NULL FK users, status ENUM('open','resolved','follow_up_pending') DEFAULT 'open', logged_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Index: `(school_id, call_datetime)`, `(school_id, status)`, `(school_id, follow_up_assigned_to)`.
   - `postal_items`: `(id UUID PK, school_id UUID NOT NULL, item_type ENUM('dispatch','receive') NOT NULL, tracking_number VARCHAR(100) NULL, sender_name VARCHAR(300) NULL, recipient_name VARCHAR(300) NULL, courier_company VARCHAR(200) NULL, item_date DATE NOT NULL DEFAULT CURRENT_DATE, subject TEXT NULL, remarks TEXT NULL, destination VARCHAR(400) NULL, source VARCHAR(400) NULL, is_delivered BOOLEAN DEFAULT false, delivered_at TIMESTAMPTZ NULL, received_by_name VARCHAR(300) NULL, logged_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Index: `(school_id, item_type, item_date)`, `(school_id, tracking_number)`.
   - `complaints`: `(id UUID PK, school_id UUID NOT NULL, complaint_number VARCHAR(50) NOT NULL, complainant_name VARCHAR(300) NOT NULL, complainant_phone VARCHAR(15) NULL, complainant_email VARCHAR(255) NULL, complainant_type ENUM('parent','student','staff','vendor','anonymous','other') NOT NULL, complaint_category ENUM('academic','infrastructure','staff','transport','fees','cleanliness','safety','other') NOT NULL, subject VARCHAR(400) NOT NULL, description TEXT NOT NULL, complaint_date DATE NOT NULL DEFAULT CURRENT_DATE, priority ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium', status ENUM('open','acknowledged','in_progress','resolved','closed','escalated') NOT NULL DEFAULT 'open', assigned_to UUID NULL FK users, acknowledged_at TIMESTAMPTZ NULL, resolved_at TIMESTAMPTZ NULL, resolution_notes TEXT NULL, student_id UUID NULL FK students, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Unique Index: `(school_id, complaint_number)`. Index: `(school_id, status, priority)`, `(school_id, assigned_to)`, `(school_id, complaint_date)`.
   - `complaint_timeline`: `(id UUID PK, school_id UUID NOT NULL, complaint_id UUID NOT NULL FK complaints, action VARCHAR(400) NOT NULL, action_by UUID NOT NULL FK users, notes TEXT NULL, created_at TIMESTAMPTZ DEFAULT now())`.
     - Index: `(school_id, complaint_id, created_at)`.
   - `office_enquiries`: `(id UUID PK, school_id UUID NOT NULL, enquiry_type ENUM('general','admission','transport','hostel','fees','other') NOT NULL, person_name VARCHAR(300) NOT NULL, person_phone VARCHAR(15) NULL, person_email VARCHAR(255) NULL, subject TEXT NOT NULL, details TEXT NULL, status ENUM('open','responded','closed') DEFAULT 'open', response TEXT NULL, responded_by UUID NULL FK users, responded_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Index: `(school_id, enquiry_type, status)`, `(school_id, created_at)`.
   - All composite indexes MUST start with `school_id`.

2. **Visitor Logs Endpoints** — Manage campus visitors:
   - `POST /v1/front-office/visitors/check-in`: Register a visitor. Auto-generates `visitor_pass_number` (VP-YYYYMMDD-XXXX). Validates `student_id` belongs to school if provided. Emits `front_office.visitor_checked_in`. Permission: `front_office.visitor.manage`.
   - `PATCH /v1/front-office/visitors/:id/check-out`: Sets `check_out_time = now()`. Permission: `front_office.visitor.manage`.
   - `GET /v1/front-office/visitors`: List visitors with filters (`date`, `active_only` (check_out_time IS NULL), `purpose`, `person_to_meet_id`). Paginated. Permission: `front_office.visitor.view`.
   - `GET /v1/front-office/visitors/active`: Shortcut for currently checked-in visitors. Redis cache 1 min. Permission: `front_office.visitor.view`.
   - `GET /v1/front-office/visitors/:id`: Get detailed visitor log. Permission: `front_office.visitor.view`.
   - `GET /v1/front-office/visitors/report`: Analytical report. Returns counts by purpose and peak hours. Permission: `front_office.report.view`.

3. **Phone Call Logs Endpoints** — Track office calls:
   - `POST /v1/front-office/calls`: Log a new call. Permission: `front_office.call.manage`.
   - `GET /v1/front-office/calls`: List calls with filters (`call_type`, `status`, `from_datetime`, `to_datetime`, `follow_up_assigned_to`). Paginated. Permission: `front_office.call.view`.
   - `PATCH /v1/front-office/calls/:id`: Update status or add action taken. Permission: `front_office.call.manage`.
   - `GET /v1/front-office/calls/follow-ups`: List calls requiring follow-up. Filter by `due_date`. Permission: `front_office.call.view`.

4. **Postal Register Endpoints** — Dispatch and Receive:
   - `POST /v1/front-office/postal`: Log an item. Permission: `front_office.postal.manage`.
   - `GET /v1/front-office/postal`: List items with filters (`item_type`, `is_delivered`, `date_range`). Paginated. Permission: `front_office.postal.view`.
   - `PATCH /v1/front-office/postal/:id/mark-delivered`: Update status. Body: `{ received_by_name }`. Permission: `front_office.postal.manage`.

5. **Complaints Management Endpoints** — Track and resolve grievances:
   - `POST /v1/front-office/complaints`: Create complaint. Auto-assigns `complaint_number` (COMP-XXXX). Emits `front_office.complaint_created`. Permission: `front_office.complaint.create`. Audit logged.
   - `GET /v1/front-office/complaints`: List complaints. Filters: `status`, `priority`, `category`, `assigned_to`, `date_range`. Paginated. Permission: `front_office.complaint.view`.
   - `GET /v1/front-office/complaints/:id`: Get full complaint details including timeline. Permission: `front_office.complaint.view`.
   - `PATCH /v1/front-office/complaints/:id/assign`: Assign to staff. Body: `{ user_id }`. Sets status to `acknowledged`. Permission: `front_office.complaint.manage`.
   - `PATCH /v1/front-office/complaints/:id/status`: Update status. Body: `{ status, notes }`. Adds timeline entry. Emits `front_office.complaint_updated`. Permission: `front_office.complaint.manage`.
   - `POST /v1/front-office/complaints/:id/resolve`: Mark as resolved. Body: `{ resolution_notes }`. Emits `front_office.complaint_resolved`. Permission: `front_office.complaint.manage`.

6. **General Enquiry Endpoints** — Manage front desk enquiries:
   - `POST /v1/front-office/enquiries`: Log new enquiry.
   - `GET /v1/front-office/enquiries`: List enquiries with filters (`type`, `status`). Paginated. Permission: `front_office.enquiry.view`.
   - `PATCH /v1/front-office/enquiries/:id/respond`: Record response. Body: `{ response }`. Permission: `front_office.enquiry.manage`.

7. **Dashboard & Module Wiring**:
   - `GET /v1/front-office/dashboard`: Summary stats for today ({ active_visitors, calls_today, pending_complaints, pending_postal, follow_ups_due, open_enquiries }). Redis cache 2 min.
   - Create `FrontOfficeModule` in `backend/src/modules/front-office/`.
   - Entities: `VisitorLogEntity`, `PhoneCallLogEntity`, `PostalItemEntity`, `ComplaintEntity`, `ComplaintTimelineEntity`, `OfficeEnquiryEntity`.
   - Import: `StudentsModule`, `UsersModule`. Register in `AppModule`.

8. **Permissions Registration**:
   - Keys: `front_office.visitor.view`, `front_office.visitor.manage`, `front_office.call.view`, `front_office.call.manage`, `front_office.postal.view`, `front_office.postal.manage`, `front_office.complaint.view`, `front_office.complaint.create`, `front_office.complaint.manage`, `front_office.enquiry.view`, `front_office.enquiry.manage`, `front_office.report.view`.
   - Default Assignments: `super_admin`, `admin`, `principal` (All); `receptionist` (All front_office.*); `teacher` (visitor.view, complaint.view, enquiry.view). `student`/`parent` (None).

9. **Frontend — Front Office Dashboard (`/dashboard/front-office`)**:
   - Stats cards: Active Visitors, Calls Today, Open Complaints, Follow-ups Due.
   - Quick Action Buttons: Check In Visitor, Log Call, Log Postal, New Complaint.
   - Recent Visitors table (last 10) with "Active" badges and "Check Out" shortcut.
   - Open Complaints widget (priority color-coded).
   - Skeleton loaders and empty states.

10. **Frontend — Visitor Register (`/dashboard/front-office/visitors`)**:
    - Tabs: "Active Visitors" (real-time list) and "All Logs" (historical with filters).
    - Check-In form slide-over: Visitor info, purpose, person to meet (searchable user list), student link.
    - Success state: Show printable "Visitor Pass" with pass number and QR code (UI only).
    - Export to CSV functionality.

11. **Frontend — Complaint Center (`/dashboard/front-office/complaints`)**:
    - View toggle: Kanban Board (Open/Acknowledged/In Progress/Resolved) or Table View.
    - Color coding: Red (Critical), Orange (High), Yellow (Medium), Gray (Low).
    - Complaint Detail Page: Vertical timeline showing all actions and notes. Action buttons for Assign, Update Status, and Resolve.

12. **Seed Data**:
    - 1 active visitor (Parent visiting for student ADM-2025-001, purpose: official_visit).
    - 1 phone call (Inbound, admission enquiry, status: follow_up_pending).
    - 1 complaint (Category: transport, Priority: medium, Status: open, Complainant: Parent).
    - 2 received postal items (One delivered, one pending).
    - 1 outbound dispatch item.

## Relevant files
- `backend/src/modules/front-office/`
- `backend/src/modules/front-office/entities/*.entity.ts`
- `backend/src/modules/front-office/endpoints/`
- `backend/src/database/migrations/038-front-office.ts`
- `frontend/src/app/(dashboard)/front-office/page.tsx`
- `frontend/src/app/(dashboard)/front-office/visitors/page.tsx`
- `frontend/src/app/(dashboard)/front-office/complaints/page.tsx`
- `frontend/src/app/(dashboard)/front-office/calls/page.tsx`
- `frontend/src/app/(dashboard)/front-office/postal/page.tsx`
- `frontend/src/app/(dashboard)/front-office/enquiries/page.tsx`
- `backend/src/config/permissions.ts`
- `backend/src/database/seeds/seed.ts`
