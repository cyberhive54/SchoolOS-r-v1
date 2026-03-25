# Phase 3 — Health & Medical Records (Module 12)

## What & Why
Build the Health & Medical Records module to ensure the physical well-being of students. Indian schools are increasingly required to maintain comprehensive health profiles, including vaccination records and periodic checkups (vision, dental, BMI). This module allows school nurses or administrators to log sick bay visits, track long-term medications, and generate health summaries for parents. It ensures critical information (like allergies) is immediately available to staff during emergencies, fulfilling both safety and regulatory compliance needs.

## Done looks like
- Every student has a comprehensive health profile (blood group, allergies, disabilities).
- BMI is automatically calculated and tracked over time through periodic checkups.
- School nurses can quickly log visits to the sick bay (complaint, treatment, parent notification status).
- Periodic health screenings (annual, vision, dental) can be scheduled and recorded.
- Digital vaccination tracker to ensure students are up-to-date with mandatory immunizations.
- Active medication register for students requiring regular doses during school hours.
- Class-level health summaries for teachers to identify students with specific needs (e.g., "Nut-free classroom").
- BMI trend reports for parents to monitor child's growth.
- Automated alerts for upcoming vaccination due dates.
- Emergency health card view for quick access to critical medical data.

## Out of scope
- Telemedicine or remote doctor consultations.
- Detailed electronic health records (EHR) for hospital-grade use.
- Pharmacy inventory management (handled by Inventory module).
- Integration with external health insurance providers (beyond storing the policy number).
- Mental health/Counselling session logs (Behaviour/Counselling module handles this).

## Tasks

1. **DB migration — health core tables** — Create migration `026-health-records.ts` with:
   - `health_profiles`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students UNIQUE, blood_group ENUM('A+','A-','B+','B-','O+','O-','AB+','AB-','Unknown') DEFAULT 'Unknown', height_cm DECIMAL(5,2) NULL, weight_kg DECIMAL(5,2) NULL, bmi DECIMAL(4,2) NULL, has_disability BOOLEAN DEFAULT false, disability_details TEXT NULL, known_allergies TEXT[] NULL, chronic_conditions TEXT[] NULL, primary_doctor_name VARCHAR(200) NULL, primary_doctor_phone VARCHAR(15) NULL, health_insurance_number VARCHAR(100) NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, student_id)`.
   - `health_checkups`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, checkup_date DATE NOT NULL, checkup_type ENUM('annual','vision','dental','general','specialist') NOT NULL, height_cm DECIMAL(5,2), weight_kg DECIMAL(5,2), bmi DECIMAL(4,2), vision_left VARCHAR(20), vision_right VARCHAR(20), dental_notes TEXT, general_notes TEXT, recommendations TEXT, conducted_by UUID NOT NULL FK users, doctor_name VARCHAR(200), next_checkup_date DATE NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, student_id, checkup_date)`.
   - `health_visits`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, visit_datetime TIMESTAMPTZ NOT NULL DEFAULT now(), complaint TEXT NOT NULL, symptoms TEXT[] NULL, temperature_celsius DECIMAL(4,1) NULL, blood_pressure VARCHAR(20) NULL, pulse_rate INT NULL, diagnosis TEXT NULL, treatment_given TEXT NULL, medication_administered TEXT NULL, rest_given BOOLEAN DEFAULT false, parent_called BOOLEAN DEFAULT false, parent_called_at TIMESTAMPTZ NULL, sent_home BOOLEAN DEFAULT false, seen_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, visit_datetime)`.
   - `health_vaccinations`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, vaccine_name VARCHAR(200) NOT NULL, dose_number INT DEFAULT 1, vaccination_date DATE NULL, next_due_date DATE NULL, batch_number VARCHAR(100) NULL, administered_by VARCHAR(200) NULL, notes TEXT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, student_id)`.
   - `health_medications`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, medication_name VARCHAR(200) NOT NULL, dosage VARCHAR(100) NOT NULL, frequency VARCHAR(100) NOT NULL, start_date DATE NOT NULL, end_date DATE NULL, prescribed_by VARCHAR(200) NULL, instructions TEXT NULL, is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. Index: `(school_id, student_id, is_active)`.
   - All composite indexes start with `school_id`.

2. **Student health profile endpoints** — Basic profile management:
   - `GET /v1/health/profiles/:studentId` — returns full medical history. Permission: `health.profile.view`. PBAC: teacher sees assigned students; parent sees children.
   - `POST /v1/health/profiles`, `PATCH /v1/health/profiles/:studentId`. Permission: `health.profile.manage`.

3. **Checkup & Sick Bay visit endpoints** — Nurse workflows:
   - `POST /v1/health/checkups` — log a screening. Body: `{ student_id, checkup_type, height_cm, weight_kg, ... }`. Validates: BMI auto-calculated on backend. Permission: `health.checkup.manage`.
   - `POST /v1/health/visits` — log a sick bay visit. Body: `{ student_id, complaint, treatment_given, parent_called }`. Permission: `health.visit.manage`.
   - `GET /v1/health/visits` — list with filters (student, date, seen_by). Permission: `health.visit.view`.

4. **Vaccination & Medication endpoints** — Long-term tracking:
   - `GET /v1/health/vaccinations/:studentId`, `POST /v1/health/vaccinations`. Permission: `health.vaccination.view/manage`.
   - `GET /v1/health/medications/:studentId`, `POST /v1/health/medications`. Permission: `health.medication.view/manage`.

5. **Health Analytics & Reports** — Population health views:
   - `GET /v1/health/students/:id/bmi-trend` — array of checkups with dates and BMI values. Permission: `health.report.view`.
   - `GET /v1/health/reports/class-summary?class_section_id` — aggregate data (blood groups, allergy counts, avg BMI). Permission: `health.report.view`.
   - `GET /v1/health/reports/vaccination-due?days=30`. Permission: `health.report.view`.

6. **Health module NestJS wiring** — Create `HealthModule` in `backend/src/modules/health/`. Register entities. Import `StudentsModule`. Export `HealthService`. Register in `AppModule`.

7. **Permissions registration** — Add to `backend/src/config/permissions.ts`:
   - `health.profile.view`, `health.profile.manage`, `health.checkup.view`, `health.checkup.manage`, `health.visit.view`, `health.visit.manage`, `health.vaccination.view`, `health.vaccination.manage`, `health.medication.view`, `health.medication.manage`, `health.report.view`.
   - Default: `super_admin`, `admin`, `principal`, `school_nurse` — all. `teacher` — profile.view (assigned class), report.view. `parent`/`student` — profile.view, report.view (own).

8. **Frontend — Student Health Card** (`/dashboard/students/:id/health`) —
   - A tab within the student detail page.
   - Profile summary: Blood group, Allergies (red badge), BMI gauge.
   - Sections for: Visit History, Vaccination Tracker, Medication List, Checkup Timeline.
   - BMI trend chart (Line chart using Recharts).

9. **Frontend — Sick Bay Log** (`/dashboard/health/visits`) —
   - Quick entry form for the nurse: Student search (Admission No/Name) → Complaint → Treatment → "Call Parent" toggle.
   - Real-time log of today's visits.

10. **Frontend — Health Analytics Dashboard** (`/dashboard/health/reports`) —
    - Class-wise health summary (e.g., list students with allergies for a teacher).
    - Upcoming vaccination list.
    - BMI distribution chart (Histogram).

11. **Seed Health Data** —
    - Health profiles for all 5 demo students with varying blood groups.
    - One annual checkup for student ADM-2025-001 with BMI 18.5.
    - One sick bay visit for "Fever" with "Rest given" treatment.
    - Basic vaccination records (Polio, MMR) for 2 students.

## Relevant files
- `backend/src/modules/health/`
- `backend/src/modules/health/entities/health-profile.entity.ts`
- `backend/src/modules/health/entities/health-checkup.entity.ts`
- `backend/src/modules/health/entities/health-visit.entity.ts`
- `backend/src/modules/health/entities/health-vaccination.entity.ts`
- `backend/src/modules/health/entities/health-medication.entity.ts`
- `backend/src/database/migrations/026-health-records.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/health/visits/page.tsx`
- `frontend/src/app/(dashboard)/health/reports/page.tsx`
- `frontend/src/components/health/HealthProfileCard.tsx`
- `frontend/src/components/health/VisitLogForm.tsx`
- `frontend/src/hooks/use-health.ts`
