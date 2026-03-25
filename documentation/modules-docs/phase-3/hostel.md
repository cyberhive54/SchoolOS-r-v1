# Phase 3 — Hostel (Boarding) Management (Module 14)

## What & Why
Residential schools in India require specialized tools to manage their boarding facilities. The Hostel Management module provides a structured way to handle student accommodation, from room allocation to warden assignments and security logs. It ensures that administrators have a clear view of room occupancy, student safety through visitor and leave tracking, and overall operational efficiency in the hostel ecosystem. This is critical for schools that provide boarding to ensure 100% student accountability and streamline communication between wardens, parents, and the school admin.

## Done looks like
- Admins can define multiple hostels (Boys, Girls, Co-ed) with specific wardens and addresses.
- Multi-floor management within each hostel, with specific room numbers and types (Single, Double, Triple, Dormitory).
- Room occupancy tracking: green/amber/red indicators for availability, partial occupancy, and full capacity.
- Student room allocation workflow: assign, transfer, and vacate rooms with academic year context.
- Security and visitor logs: track every visitor, their relationship to the student, visit times, and purpose.
- Leave management for hostellers: students or parents submit leave requests; wardens approve; system tracks overdue returns.
- Warden dashboard: real-time summary of total students, occupancy percentage, pending visitors, and overdue leaves.
- Comprehensive reporting on hostel occupancy and student boarding history.
- Fee integration: monthly/termly hostel fees can be defined per room type.

## Out of scope
- Mess/Dining hall meal tracking (part of a future Mess module).
- Laundry services and schedule tracking.
- Detailed maintenance/repair tracking for rooms (Inventory/Maintenance module).
- Inventory of furniture inside rooms (Inventory module).
- Biometric entry/exit for hostel gates (Hardware integration).

## Tasks

1. **DB migration — hostel core tables** — Create migration `024-hostel-management.ts` with:
   - `hostels`: `(id UUID PK, school_id UUID NOT NULL, name VARCHAR(200) NOT NULL, hostel_type ENUM('boys','girls','co-ed') NOT NULL, warden_id UUID NULL FK users, capacity INT NOT NULL, address TEXT, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Unique index: `(school_id, name)`.
   - `hostel_floors`: `(id UUID PK, school_id UUID NOT NULL, hostel_id UUID NOT NULL FK hostels, floor_number INT NOT NULL, floor_name VARCHAR(100), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Unique index: `(school_id, hostel_id, floor_number)`.
   - `hostel_rooms`: `(id UUID PK, school_id UUID NOT NULL, hostel_id UUID NOT NULL FK hostels, floor_id UUID NOT NULL FK hostel_floors, room_number VARCHAR(20) NOT NULL, room_type ENUM('single','double','triple','dormitory') NOT NULL, capacity INT NOT NULL, monthly_fee DECIMAL(10,2) DEFAULT 0, amenities TEXT[], is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Unique index: `(school_id, hostel_id, room_number)`.
   - `hostel_allocations`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, room_id UUID NOT NULL FK hostel_rooms, hostel_id UUID NOT NULL FK hostels, academic_year_id UUID NOT NULL FK academic_years, allocated_date DATE NOT NULL, vacated_date DATE NULL, status ENUM('active','vacated','transferred') DEFAULT 'active', allocated_by UUID NOT NULL FK users, vacate_reason TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Unique index: `(school_id, student_id, academic_year_id, status)` (filtered unique for 'active').
   - `hostel_visitor_logs`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, visitor_name VARCHAR(200) NOT NULL, visitor_relation VARCHAR(100), visitor_phone VARCHAR(15), visit_date DATE NOT NULL, visit_in_time TIME NOT NULL, visit_out_time TIME NULL, purpose TEXT, approved_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Index: `(school_id, student_id, visit_date)`.
   - `hostel_leave_records`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, hostel_id UUID NOT NULL FK hostels, from_datetime TIMESTAMPTZ NOT NULL, expected_return TIMESTAMPTZ NOT NULL, actual_return TIMESTAMPTZ NULL, destination TEXT, guardian_name VARCHAR(200), guardian_phone VARCHAR(15), approved_by UUID NOT NULL FK users, status ENUM('approved','returned','overdue') DEFAULT 'approved', created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Index: `(school_id, hostel_id, status)`.
   - All composite indexes MUST start with `school_id`.

2. **Hostel & Room Management Endpoints** — Infrastructure setup:
   - `GET /v1/hostel` — list hostels with occupancy summary. Permission: `hostel.hostel.view`.
   - `POST /v1/hostel` — create hostel. Body: `{ name, type, warden_id, ... }`. Permission: `hostel.hostel.manage`.
   - `GET /v1/hostel/:id/rooms` — get rooms per hostel/floor with current student counts. Permission: `hostel.room.view`.
   - `GET /v1/hostel/:id/occupancy` — detailed report of rooms and students currently in them. Permission: `hostel.report.view`.

3. **Student Allocation Endpoints** — Moving students in/out:
   - `POST /v1/hostel/allocations` — allocate room to student. Body: `{ student_id, room_id, allocated_date, ... }`. Permission: `hostel.allocation.manage`.
   - `PATCH /v1/hostel/allocations/:id/vacate` — mark allocation as vacated. Body: `{ vacated_date, vacate_reason }`. Permission: `hostel.allocation.manage`.
   - `GET /v1/hostel/allocations/unallocated` — query students who aren't assigned to any hostel. Permission: `hostel.allocation.view`.

4. **Security & Leave Endpoints** — Visitor and leave management:
   - `POST /v1/hostel/visitor-logs` — log a visitor. Permission: `hostel.visitor.view/manage`.
   - `GET /v1/hostel/visitor-logs` — list visitor logs per student or date. Permission: `hostel.visitor.view`.
   - `POST /v1/hostel/leave-records` — create leave for student. Permission: `hostel.leave.view/manage/approve`.
   - `PATCH /v1/hostel/leave-records/:id/return` — record return time and update status. Permission: `hostel.leave.manage`.
   - `GET /v1/hostel/warden/dashboard` — summary stats for the warden's assigned hostel. Permission: `hostel.hostel.view`.

5. **Hostel NestJS Module Wiring** — Create `HostelModule` in `backend/src/modules/hostel/`.
   - Entities: `HostelEntity`, `HostelFloorEntity`, `HostelRoomEntity`, `HostelAllocationEntity`, `HostelVisitorLogEntity`, `HostelLeaveRecordEntity`.
   - Register in `AppModule`.
   - Export `HostelService` for Student Profile integration.

6. **Permissions Registration** — Add to `backend/src/config/permissions.ts`:
   - `hostel.hostel.view`, `hostel.hostel.manage`
   - `hostel.room.view`, `hostel.room.manage`
   - `hostel.allocation.view`, `hostel.allocation.manage`
   - `hostel.visitor.view`, `hostel.visitor.manage`
   - `hostel.leave.view`, `hostel.leave.manage`, `hostel.leave.approve`
   - `hostel.report.view`
   - Default: `super_admin`, `admin`, `principal`, `warden` (manage-level), `teacher` (view-level), `student/parent` (leave view/request).

7. **Frontend — Hostel Overview** (`/dashboard/hostel`):
   - **Hostel Cards**: Visual list with occupancy progress bar (e.g., "75% Full").
   - **Floor Plan View**: Grid of rooms. Color-coded: green (available), amber (partially occupied), red (full). Click room to see student list.
   - **Allocation Form**: Slide-over for assigning a student to a room.
   - **Visitor/Leave Lists**: Management tables with overdue return alerts (red text for overdue hostellers).

8. **Seed Data** — Update `seed.ts`:
   - 1 hostel: "Boys Hostel - Block A" with warden user.
   - 3 floors, 2 rooms per floor (various types: Single, Double).
   - Allocate 2 demo students to Room 101 and 102.

## Relevant files
- `backend/src/modules/hostel/`
- `backend/src/modules/hostel/entities/hostel.entity.ts`
- `backend/src/modules/hostel/entities/hostel-room.entity.ts`
- `backend/src/modules/hostel/entities/hostel-allocation.entity.ts`
- `backend/src/modules/hostel/entities/hostel-visitor-log.entity.ts`
- `backend/src/modules/hostel/entities/hostel-leave-record.entity.ts`
- `backend/src/database/migrations/024-hostel-management.ts`
- `frontend/src/app/(dashboard)/hostel/page.tsx`
- `frontend/src/components/modules/hostel/FloorPlan.tsx`
- `backend/src/config/permissions.ts`
- `backend/src/database/seeds/seed.ts`
