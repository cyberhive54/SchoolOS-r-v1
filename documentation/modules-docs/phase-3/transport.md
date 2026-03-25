# Phase 3 — Transport Management (Module 13)

## What & Why
The Transport Management module handles the logistics of student transportation, a critical service for most Indian K-12 schools. With increasing concerns over student safety and the need for operational efficiency, schools require tools to manage their fleet, optimize routes, and provide real-time information to parents. This module ensures that every student using school transport is accounted for, routes are well-defined with clear stops, and vehicle compliance (insurance, fitness) is tracked to prevent legal or safety lapses. It provides parents with peace of mind through route transparency and sets the foundation for live GPS tracking.

## Done looks like
- Transport admins can manage a fleet of vehicles with detailed specifications and compliance tracking (insurance, fitness, service).
- Routes can be defined with assigned drivers, attendants, and a sequence of stops with specific pickup/drop times.
- Students can be assigned to specific routes and stops for an academic year, with support for one-way or two-way transport.
- A route manifest (PDF) can be generated for drivers, listing all students at each stop in the correct order.
- Automated alerts notify admins of upcoming vehicle document expiries (insurance/fitness) within 30 days.
- Real-time GPS coordinates of vehicles can be updated and viewed (API support for hardware/app integration).
- Students and parents can view their assigned transport details (route, vehicle, driver, stops) in their portal.
- Unassigned students can be easily identified to ensure 100% coverage for those requesting transport.
- Transport fee structures can be defined per route/term/month to integrate with the Fees module.
- Map-based visualization of routes and stops using Leaflet.js.

## Out of scope
- Driver payroll (handled by HR/Payroll module).
- Fuel management and inventory for spare parts (Inventory module).
- Integration with external GPS hardware providers (only the API for receiving coordinates is provided).
- Parent mobile app push notifications for "bus arriving" (Phase 4 — Notification Engine).
- Multi-school fleet sharing (fleet is scoped per school).

## Tasks

1. **DB migration — transport core tables** — Create migration `023-transport-management.ts` with:
   - `transport_vehicles`: `(id UUID PK, school_id UUID NOT NULL, vehicle_number VARCHAR(20) NOT NULL, vehicle_type ENUM('bus','van','auto','car') NOT NULL, make VARCHAR(100), model VARCHAR(100), capacity INT NOT NULL, fuel_type ENUM('diesel','petrol','cng','electric'), registration_number VARCHAR(20), insurance_expiry DATE, fitness_expiry DATE, last_service_date DATE, current_gps_lat DECIMAL(10,7), current_gps_lng DECIMAL(10,7), is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Unique index: `(school_id, vehicle_number)`.
   - `transport_routes`: `(id UUID PK, school_id UUID NOT NULL, route_name VARCHAR(200) NOT NULL, route_code VARCHAR(20) NOT NULL, vehicle_id UUID NULL FK transport_vehicles, driver_name VARCHAR(200), driver_phone VARCHAR(15), attendant_name VARCHAR(200), attendant_phone VARCHAR(15), is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Unique index: `(school_id, route_code)`.
   - `transport_stops`: `(id UUID PK, school_id UUID NOT NULL, route_id UUID NOT NULL FK transport_routes, stop_name VARCHAR(200) NOT NULL, stop_order INT NOT NULL, latitude DECIMAL(10,7), longitude DECIMAL(10,7), morning_pickup_time TIME, afternoon_drop_time TIME, landmark TEXT, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Index: `(school_id, route_id, stop_order)`.
   - `transport_student_assignments`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, route_id UUID NOT NULL FK transport_routes, stop_id UUID NOT NULL FK transport_stops, academic_year_id UUID NOT NULL FK academic_years, direction ENUM('both','pickup_only','drop_only') DEFAULT 'both', is_active BOOLEAN DEFAULT true, assigned_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Unique index: `(school_id, student_id, academic_year_id)`.
   - `transport_fee_structures`: `(id UUID PK, school_id UUID NOT NULL, route_id UUID NOT NULL FK transport_routes, academic_year_id UUID NOT NULL FK academic_years, fee_per_term DECIMAL(10,2) DEFAULT 0, fee_per_month DECIMAL(10,2) DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Unique index: `(school_id, route_id, academic_year_id)`.
   - All composite indexes MUST start with `school_id`.

2. **Vehicle Management Endpoints** — CRUD for fleet:
   - `GET /v1/transport/vehicles` — list all vehicles; filters: `is_active`, `vehicle_type`. Permission: `transport.vehicle.view`.
   - `POST /v1/transport/vehicles` — add new vehicle. Body: `{ vehicle_number, vehicle_type, capacity, ... }`. Permission: `transport.vehicle.manage`.
   - `PATCH /v1/transport/vehicles/:id` — update vehicle details or status. Permission: `transport.vehicle.manage`.
   - `GET /v1/transport/vehicles/expiry-alerts` — returns vehicles with insurance/fitness/service due within 30 days. Permission: `transport.vehicle.view`.
   - `PATCH /v1/transport/vehicles/:id/location` — update GPS coordinates. Body: `{ lat, lng }`. Permission: `transport.vehicle.manage`. (Public-facing for tracking devices, but scoped by school/ID).

3. **Route & Stop Endpoints** — Manage paths and pickup points:
   - `POST /v1/transport/routes` — create route. Body: `{ route_name, route_code, vehicle_id, ... }`. Permission: `transport.route.manage`.
   - `GET /v1/transport/routes` — list routes with associated vehicle and stop count. Permission: `transport.route.view`.
   - `POST /v1/transport/routes/:routeId/stops` — add/reorder stops. Body: `[{ stop_name, stop_order, ... }]`. Permission: `transport.route.manage`.
   - `GET /v1/transport/routes/:routeId/manifest` — returns PDF stream of all students assigned to the route, sorted by `stop_order`. Permission: `transport.report.view`.

4. **Student Assignment Endpoints** — Link students to transport:
   - `POST /v1/transport/assignments` — assign student to route/stop. Body: `{ student_id, route_id, stop_id, direction, academic_year_id }`. Permission: `transport.assignment.manage`.
   - `GET /v1/transport/assignments/unassigned` — query students who requested transport but aren't assigned. Permission: `transport.assignment.view`.
   - `GET /v1/transport/students/:studentId/card` — returns transport details for a student. Permission: `transport.assignment.view`.

5. **Transport NestJS Module Wiring** — Create `TransportModule` in `backend/src/modules/transport/`.
   - Entities: `TransportVehicleEntity`, `TransportRouteEntity`, `TransportStopEntity`, `TransportAssignmentEntity`, `TransportFeeEntity`.
   - Register in `AppModule`.
   - Export `TransportService` for Fees module integration.

6. **Permissions Registration** — Add to `backend/src/config/permissions.ts`:
   - `transport.vehicle.view`, `transport.vehicle.manage`
   - `transport.route.view`, `transport.route.manage`
   - `transport.assignment.view`, `transport.assignment.manage`
   - `transport.report.view`
   - Default assignments: `super_admin`, `admin`, `principal` (all), `teacher` (view routes/assignments), `student/parent` (view own assignment).

7. **Frontend — Transport Dashboard** (`/dashboard/transport`):
   - **Vehicles Tab**: Table of vehicles with status badges and expiry warnings (red/amber).
   - **Routes Tab**: Cards showing route summary, click to view stop list on a map.
   - **Assignments Page**: Interface to bulk assign students to routes. Search by student name/ID.
   - **Reports**: Button to download Route Manifest PDF.

8. **Seed Data** — Update `seed.ts`:
   - 2 vehicles: "Bus-01" (capacity 40, diesel), "Van-01" (capacity 12, petrol).
   - 1 route: "North Route" (assigned to Bus-01) with 5 stops (Station, Park, Square, Library, School) with times.
   - Assign 2 demo students to "North Route" at "Square" stop.

## Relevant files
- `backend/src/modules/transport/`
- `backend/src/modules/transport/entities/transport-vehicle.entity.ts`
- `backend/src/modules/transport/entities/transport-route.entity.ts`
- `backend/src/modules/transport/entities/transport-stop.entity.ts`
- `backend/src/modules/transport/entities/transport-assignment.entity.ts`
- `backend/src/modules/transport/entities/transport-fee.entity.ts`
- `backend/src/database/migrations/023-transport-management.ts`
- `frontend/src/app/(dashboard)/transport/page.tsx`
- `frontend/src/components/modules/transport/RouteMap.tsx`
- `backend/src/config/permissions.ts`
- `backend/src/database/seeds/seed.ts`
