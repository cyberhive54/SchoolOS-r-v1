# SchoolOS — API Reference
> **Base URL (dev):** `http://localhost:3001/v1`  
> **Base URL (Docker):** `http://localhost:4000/v1`  
> **All routes require JWT** unless marked `🔓 Public`.  
> **All scoped routes** enforce `school_id` from the JWT — cross-tenant access is impossible.  
> `super_admin` bypasses all permission checks.

---

## Table of Contents
1. [Auth](#1-auth)
2. [School (Tenant)](#2-school-tenant)
3. [Students](#3-students)
4. [Academics](#4-academics)
5. [Human Resources (HR)](#5-human-resources-hr)
6. [Permission Reference](#6-permission-reference)
7. [Role Default Grants](#7-role-default-grants)
8. [Request / Response Conventions](#8-request--response-conventions)

---

## 1. Auth

All auth endpoints live under `/v1/auth`. The login flow is OTP-based (2-factor).

| # | Method | Path | Auth | Permission | Description |
|---|--------|------|------|------------|-------------|
| 1 | POST | `/auth/login` | 🔓 Public | — | Step 1 — validates credentials and sends OTP |
| 2 | POST | `/auth/verify-otp` | 🔓 Public | — | Step 2 — verifies OTP, returns access + refresh tokens |
| 3 | POST | `/auth/refresh` | 🔓 Public | — | Rotates access token using HttpOnly refresh-token cookie |
| 4 | POST | `/auth/logout` | 🔒 JWT | — | Revokes refresh token, clears cookie |

### POST `/auth/login`
```json
// Request
{ "identifier": "admin@demo.schoolos.com", "identifier_type": "email", "password": "Admin@123" }

// Response 200
{ "data": { "message": "OTP sent", "expires_in": 600 } }
// In dev: OTP is printed to server console log
```

### POST `/auth/verify-otp`
```json
// Request
{ "identifier": "admin@demo.schoolos.com", "identifier_type": "email", "otp": "123456" }

// Response 200
// Sets HttpOnly cookie: schoolos_refresh_token (bcrypt-hashed, 30d TTL)
{ "data": { "access_token": "<jwt>", "user": { "id": "...", "email": "...", "role": "admin", "first_name": "...", "last_name": "..." } } }
```

### POST `/auth/refresh`
```
// No body — reads schoolos_refresh_token cookie
// Response 200: new access_token
```

### POST `/auth/logout`
```
// No body — reads schoolos_refresh_token cookie
// Response 200: { "data": { "message": "Logged out" } }
```

---

## 2. School (Tenant)

| # | Method | Path | Auth | Permission | Description |
|---|--------|------|------|------------|-------------|
| 1 | GET | `/school/theme` | 🔓 Public | — | Returns school branding (colors, fonts, name) for CSS injection |

### GET `/school/theme`
```json
// Response 200
{
  "data": {
    "school_id": "uuid",
    "school_name": "Demo School",
    "theme": {
      "color_primary": "#3B82F6",
      "color_secondary": "#6366F1",
      "color_accent": "#8B5CF6",
      "font_heading": "Inter",
      "radius_md": "8px"
    }
  }
}
```

---

## 3. Students

All routes under `/v1/students`. Scoped by `school_id` from JWT.

### 3.1 Students (core)

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 1 | POST | `/students` | `students.profile.create` | admin | Create a new student record |
| 2 | GET | `/students` | `students.profile.read` | admin, teacher, receptionist, accountant | List all students (paginated) |
| 3 | GET | `/students/:id` | `students.profile.read` | admin, teacher, receptionist, accountant | Get single student detail |
| 4 | PATCH | `/students/:id` | `students.profile.update` | admin | Update student fields |
| 5 | DELETE | `/students/:id` | `students.profile.delete` | admin | Soft-delete a student |

**Query params for `GET /students`:**  
`page`, `per_page`, `q` (search name/admission_no), `filter[gender]`, `filter[status]`

**`POST /students` body:**
```json
{
  "admission_no": "2024-001",
  "first_name": "Arjun",
  "last_name": "Kumar",
  "date_of_birth": "2010-05-15",
  "gender": "male",
  "middle_name": "Raj",       // optional
  "blood_group": "B+",        // optional
  "religion": "Hindu",        // optional
  "nationality": "Indian",    // optional
  "category_id": "uuid"       // optional — links to student category
}
```

### 3.2 Bulk Import

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 6 | POST | `/students/bulk-import` | `students.profile.bulk_import` | admin | Upload CSV to import students in bulk |
| 7 | GET | `/students/bulk-import/template` | `students.profile.bulk_import` | admin | Download blank CSV template |

**`POST /students/bulk-import`:** multipart/form-data with `file` field (CSV).  
Returns `{ data: { created, skipped, errors[] } }`.

### 3.3 Student Profile (extended)

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 8 | GET | `/students/:studentId/profile` | `students.profile.read` | admin, teacher | Get full profile (address, health, etc.) |
| 9 | PUT | `/students/:studentId/profile` | `students.profile.update` | admin | Upsert profile — creates if not exists |

### 3.4 Guardians

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 10 | GET | `/students/:studentId/guardians` | `students.profile.read` | admin, teacher | List guardians |
| 11 | POST | `/students/:studentId/guardians` | `students.guardian.manage` | admin | Add a guardian |
| 12 | PATCH | `/students/:studentId/guardians/:guardianId` | `students.guardian.manage` | admin | Update a guardian |
| 13 | DELETE | `/students/:studentId/guardians/:guardianId` | `students.guardian.manage` | admin | Remove a guardian |

### 3.5 Enrollments

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 14 | POST | `/students/:studentId/enrollments` | `students.enrollment.manage` | admin | Enroll student in a class-section for an academic year |
| 15 | GET | `/students/:studentId/enrollments` | `students.profile.read` | admin, teacher | List enrollment history |
| 16 | PATCH | `/students/:studentId/enrollments/:enrollmentId` | `students.enrollment.manage` | admin | Update enrollment (e.g. section transfer) |

### 3.6 Categories & Houses (Settings)

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 17 | POST | `/students/categories` | `students.settings.manage` | admin | Create student category (OBC, SC/ST, etc.) |
| 18 | GET | `/students/categories` | `students.profile.read` | admin, teacher | List all categories |
| 19 | PATCH | `/students/categories/:id` | `students.settings.manage` | admin | Update category |
| 20 | DELETE | `/students/categories/:id` | `students.settings.manage` | admin | Delete category |
| 21 | POST | `/students/houses` | `students.settings.manage` | admin | Create house (Red, Blue, etc.) |
| 22 | GET | `/students/houses` | `students.profile.read` | admin, teacher | List all houses |
| 23 | PATCH | `/students/houses/:id` | `students.settings.manage` | admin | Update house |
| 24 | DELETE | `/students/houses/:id` | `students.settings.manage` | admin | Delete house |

---

## 4. Academics

All routes under `/v1/academics`. Scoped by `school_id` from JWT.

### 4.1 Academic Years

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 1 | POST | `/academics/years` | `academics.year.manage` | admin | Create academic year |
| 2 | GET | `/academics/years` | `academics.class.read` | admin, teacher | List all academic years |
| 3 | GET | `/academics/years/:id` | `academics.class.read` | admin, teacher | Get single academic year |
| 4 | PATCH | `/academics/years/:id` | `academics.year.manage` | admin | Update academic year |
| 5 | DELETE | `/academics/years/:id` | `academics.year.manage` | admin | Delete academic year |
| 6 | POST | `/academics/years/:id/set-current` | `academics.year.manage` | admin | Set a year as the active/current one |

### 4.2 Classes

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 7 | POST | `/academics/classes` | `academics.class.manage` | admin | Create a class (Class 1, Class 2, etc.) |
| 8 | GET | `/academics/classes` | `academics.class.manage` | admin | List all classes |
| 9 | GET | `/academics/classes/:id` | `academics.class.manage` | admin | Get single class |
| 10 | PATCH | `/academics/classes/:id` | `academics.class.manage` | admin | Update class |
| 11 | DELETE | `/academics/classes/:id` | `academics.class.manage` | admin | Delete class |

### 4.3 Sections

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 12 | POST | `/academics/sections` | `academics.section.manage` | admin | Create section (A, B, C) |
| 13 | GET | `/academics/sections` | `academics.class.read` | admin, teacher | List all sections |
| 14 | PATCH | `/academics/sections/:id` | `academics.section.manage` | admin | Update section |
| 15 | DELETE | `/academics/sections/:id` | `academics.section.manage` | admin | Delete section |

### 4.4 Class-Sections (combined rooms)

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 16 | POST | `/academics/class-sections` | `academics.class_section.manage` | admin | Create a class-section pair (e.g. Class 5-A) |
| 17 | GET | `/academics/class-sections` | `academics.class.read` | admin, teacher | List all class-sections (filterable by year, class) |
| 18 | GET | `/academics/class-sections/subject-teachers` | `academics.class.read` | admin, teacher | List all subject-teacher assignments across all sections |
| 19 | GET | `/academics/class-sections/:id` | `academics.class.read` | admin, teacher | Get single class-section detail |
| 20 | PATCH | `/academics/class-sections/:id` | `academics.class_section.manage` | admin | Update class-section |
| 21 | DELETE | `/academics/class-sections/:id` | `academics.class_section.manage` | admin | Delete class-section |
| 22 | POST | `/academics/class-sections/:id/subjects` | `academics.class_section.manage` | admin | Assign subject to class-section |
| 23 | DELETE | `/academics/class-sections/:id/subjects/:subjectId` | `academics.class_section.manage` | admin | Remove subject from class-section |
| 24 | GET | `/academics/class-sections/:id/subjects` | `academics.class.read` | admin, teacher | List subjects of a class-section |
| 25 | POST | `/academics/class-sections/:id/class-teacher` | `academics.teacher_assignment.manage` | admin | Assign class teacher |
| 26 | DELETE | `/academics/class-sections/:id/class-teacher` | `academics.teacher_assignment.manage` | admin | Remove class teacher |
| 27 | POST | `/academics/class-sections/:id/subject-teachers` | `academics.teacher_assignment.manage` | admin | Assign subject teacher |
| 28 | DELETE | `/academics/class-sections/:id/subject-teachers/:assignmentId` | `academics.teacher_assignment.manage` | admin | Remove subject teacher assignment |
| 29 | GET | `/academics/class-sections/:id/teachers` | `academics.class.read` | admin, teacher | List all teachers in a class-section |

### 4.5 Subjects

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 30 | POST | `/academics/subjects` | `academics.subject.manage` | admin | Create a subject |
| 31 | GET | `/academics/subjects` | `academics.subject.manage` | admin | List all subjects |
| 32 | GET | `/academics/subjects/:id` | `academics.subject.manage` | admin | Get subject detail |
| 33 | PATCH | `/academics/subjects/:id` | `academics.subject.manage` | admin | Update subject |
| 34 | DELETE | `/academics/subjects/:id` | `academics.subject.manage` | admin | Delete subject |

### 4.6 Subject Groups

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 35 | POST | `/academics/subject-groups` | `academics.subject_group.manage` | admin | Create subject group (Science, Commerce, etc.) |
| 36 | GET | `/academics/subject-groups` | `academics.subject_group.manage` | admin | List all subject groups |
| 37 | PATCH | `/academics/subject-groups/:id` | `academics.subject_group.manage` | admin | Update subject group |
| 38 | DELETE | `/academics/subject-groups/:id` | `academics.subject_group.manage` | admin | Delete subject group |
| 39 | POST | `/academics/subject-groups/:id/subjects` | `academics.subject_group.manage` | admin | Add subject to group |
| 40 | DELETE | `/academics/subject-groups/:id/subjects/:subjectId` | `academics.subject_group.manage` | admin | Remove subject from group |

### 4.7 Promotions (bulk year promotion)

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 41 | POST | `/academics/promotions` | `academics.promotion.manage` | admin | Trigger bulk student promotion to next academic year |
| 42 | GET | `/academics/promotions/jobs/:jobId` | `academics.promotion.manage` | admin | Poll promotion job status (async operation) |

**`POST /academics/promotions` body:**
```json
{
  "from_academic_year_id": "uuid",
  "to_academic_year_id": "uuid",
  "class_section_mappings": [
    { "from_class_section_id": "uuid", "to_class_section_id": "uuid" }
  ],
  "exclude_student_ids": []   // optional
}
```
Returns `{ data: { job_id: "uuid", status: "queued" } }` — poll with GET `.../jobs/:jobId`.

---

## 5. Human Resources (HR)

All routes under `/v1/hr`. Scoped by `school_id` from JWT.

### 5.1 Departments

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 1 | POST | `/hr/departments` | `hr.settings.manage` | admin | Create department (Teaching, Admin, etc.) |
| 2 | GET | `/hr/departments` | `hr.staff.view` | admin, teacher | List all departments |
| 3 | PATCH | `/hr/departments/:id` | `hr.settings.manage` | admin | Update department |
| 4 | DELETE | `/hr/departments/:id` | `hr.settings.manage` | admin | Deactivate department |

### 5.2 Designations

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 5 | POST | `/hr/designations` | `hr.settings.manage` | admin | Create designation (Principal, Teacher, Clerk, etc.) |
| 6 | GET | `/hr/designations` | `hr.staff.view` | admin, teacher | List all designations (filter by `?department_id=`) |
| 7 | PATCH | `/hr/designations/:id` | `hr.settings.manage` | admin | Update designation |
| 8 | DELETE | `/hr/designations/:id` | `hr.settings.manage` | admin | Deactivate designation |

### 5.3 Staff

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 9 | POST | `/hr/staff` | `hr.staff.create` | admin | Create staff member (optionally creates login account) |
| 10 | GET | `/hr/staff` | `hr.staff.view` | admin, teacher | List staff (paginated, filterable) |
| 11 | GET | `/hr/staff/:id` | `hr.staff.view` | admin, teacher | Get single staff member detail |
| 12 | PATCH | `/hr/staff/:id` | `hr.staff.update` | admin | Update staff fields |
| 13 | DELETE | `/hr/staff/:id` | `hr.staff.delete` | admin | Deactivate / remove staff member |

**Query params for `GET /hr/staff`:**  
`page`, `per_page`, `q` (name/employee ID), `filter[status]` (active | inactive | resigned | terminated), `filter[department_id]`, `filter[designation_id]`

**`POST /hr/staff` body:**
```json
{
  "first_name": "Rajesh",
  "last_name": "Sharma",
  "employee_id": "EMP-001",
  "phone": "9876543210",
  "join_date": "2024-06-01",
  "employment_type": "permanent",  // permanent | contractual | part_time | probation
  "gender": "male",                // male | female | other
  "department_id": "uuid",         // optional
  "designation_id": "uuid",        // optional
  "login_email": "rajesh@school.com"  // optional — creates a user account for this staff
}
```

### 5.4 Staff Profile (extended)

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 14 | GET | `/hr/staff/:staffId/profile` | `hr.staff.view` | admin, teacher | Get extended profile (address, emergency contact, qualifications) |
| 15 | PUT | `/hr/staff/:staffId/profile` | `hr.staff.update` | admin | Upsert extended profile |

**`PUT /hr/staff/:staffId/profile` body (all optional):**
```json
{
  "address_line1": "12 MG Road",
  "city": "Pune",
  "state": "Maharashtra",
  "pincode": "411001",
  "emergency_contact_name": "Meena Sharma",
  "emergency_contact_phone": "9988776655",
  "qualification": "B.Ed, M.Sc Mathematics",
  "experience_years": 8
}
```

### 5.5 Leave Types

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 16 | POST | `/hr/leave-types` | `hr.leave.manage_types` | admin | Create leave type (CL, SL, EL, etc.) |
| 17 | GET | `/hr/leave-types` | `hr.leave.view` | admin, teacher | List all leave types |
| 18 | PATCH | `/hr/leave-types/:id` | `hr.leave.manage_types` | admin | Update leave type |
| 19 | DELETE | `/hr/leave-types/:id` | `hr.leave.manage_types` | admin | Deactivate leave type |

**`POST /hr/leave-types` body:**
```json
{
  "name": "Casual Leave",
  "code": "CL",
  "max_days_per_year": 12,
  "is_paid": true,             // default true
  "carry_forward": false,      // default false
  "applicable_to": "all_staff" // all_staff | teaching_staff | non_teaching_staff
}
```

### 5.6 Leave Allocations

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 20 | POST | `/hr/leave-allocations/bulk` | `hr.leave.manage_allocations` | admin | Bulk-allocate leave days to all staff for an academic year |
| 21 | GET | `/hr/staff/:staffId/leave-allocations` | `hr.leave.view` | admin, teacher | Get leave balance for a specific staff member |
| 22 | PATCH | `/hr/leave-allocations/:id` | `hr.leave.manage_allocations` | admin | Adjust individual allocation (add/deduct days) |

**`POST /hr/leave-allocations/bulk` body:**
```json
{
  "academic_year_id": "uuid",
  "leave_type_id": "uuid",
  "allocated_days": 12,
  "staff_ids": ["uuid1", "uuid2"]  // optional — omit to apply to all active staff
}
```

### 5.7 Leave Requests

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 23 | POST | `/hr/leave-requests` | `hr.leave.request` | admin, teacher | Submit a leave request |
| 24 | GET | `/hr/leave-requests` | `hr.leave.view` | admin, teacher | List leave requests (paginated, filterable) |
| 25 | GET | `/hr/leave-requests/:id` | `hr.leave.view` | admin, teacher | Get single leave request |
| 26 | POST | `/hr/leave-requests/:id/approve` | `hr.leave.approve` | admin | Approve a pending leave request |
| 27 | POST | `/hr/leave-requests/:id/reject` | `hr.leave.approve` | admin | Reject a pending leave request |
| 28 | POST | `/hr/leave-requests/:id/cancel` | `hr.leave.request` | admin, teacher | Cancel own pending/approved leave request |

**`POST /hr/leave-requests` body:**
```json
{
  "staff_id": "uuid",
  "leave_type_id": "uuid",
  "start_date": "2026-04-01",
  "end_date": "2026-04-03",
  "reason": "Family function"
}
```
Automatically calculates `total_days` and validates against remaining allocation balance.

**`POST /hr/leave-requests/:id/approve` body:**
```json
{ "note": "Approved. Have a good time." }  // optional
```

**Leave request status flow:**  
`pending` → `approved` (by admin) → _(cannot revert)_  
`pending` → `rejected` (by admin)  
`pending` | `approved` → `cancelled` (by requester)

**Query params for `GET /hr/leave-requests`:**  
`page`, `per_page`, `filter[status]` (pending | approved | rejected | cancelled), `filter[staff_id]`, `filter[leave_type_id]`

### 5.8 Attendance

| # | Method | Path | Permission | Roles | Description |
|---|--------|------|------------|-------|-------------|
| 29 | POST | `/hr/attendance/bulk-mark` | `hr.attendance.mark` | admin | Bulk-mark attendance for all staff on a given date |
| 30 | GET | `/hr/attendance` | `hr.attendance.view` | admin, teacher | List attendance records (paginated, filterable) |
| 31 | GET | `/hr/attendance/summary` | `hr.attendance.view` | admin, teacher | Aggregated attendance summary (by date range and/or staff) |

**`POST /hr/attendance/bulk-mark` body:**
```json
{
  "date": "2026-03-20",
  "records": [
    { "staff_id": "uuid", "status": "present" },
    { "staff_id": "uuid", "status": "absent" },
    { "staff_id": "uuid", "status": "half_day" }
  ]
}
```
Status values: `present` | `absent` | `half_day` | `on_leave` | `holiday`

**Query params for `GET /hr/attendance`:**  
`page`, `per_page`, `filter[date]`, `filter[staff_id]`, `filter[status]`

**Query params for `GET /hr/attendance/summary`:**  
`date_from`, `date_to`, `staff_id` (optional — omit for all staff)

---

## 6. Permission Reference

| Permission Key | Permission Code | What it allows |
|---------------|-----------------|----------------|
| `STUDENTS_PROFILE_READ` | `students.profile.read` | View student list and individual records |
| `STUDENTS_PROFILE_CREATE` | `students.profile.create` | Add new students |
| `STUDENTS_PROFILE_UPDATE` | `students.profile.update` | Edit student records |
| `STUDENTS_PROFILE_DELETE` | `students.profile.delete` | Soft-delete students |
| `STUDENTS_BULK_IMPORT` | `students.profile.bulk_import` | Upload CSV bulk import |
| `STUDENTS_PROMOTE` | `students.profile.promote` | Promote students to next year |
| `STUDENTS_SETTINGS_MANAGE` | `students.settings.manage` | Manage categories and houses |
| `STUDENTS_GUARDIAN_MANAGE` | `students.guardian.manage` | Add/edit/remove guardians |
| `STUDENTS_ENROLLMENT_MANAGE` | `students.enrollment.manage` | Manage class-section enrollments |
| `ACADEMICS_CLASS_READ` | `academics.class.read` | View classes, sections, years |
| `ACADEMICS_CLASS_MANAGE` | `academics.class.manage` | Full CRUD on classes |
| `ACADEMICS_YEAR_MANAGE` | `academics.year.manage` | Create/manage academic years |
| `ACADEMICS_SECTION_MANAGE` | `academics.section.manage` | Create/manage sections |
| `ACADEMICS_CLASS_SECTION_MANAGE` | `academics.class_section.manage` | Create class-section pairs, assign subjects |
| `ACADEMICS_SUBJECT_MANAGE` | `academics.subject.manage` | Create/manage subjects |
| `ACADEMICS_SUBJECT_GROUP_MANAGE` | `academics.subject_group.manage` | Create/manage subject groups |
| `ACADEMICS_TEACHER_ASSIGNMENT_MANAGE` | `academics.teacher_assignment.manage` | Assign class teachers and subject teachers |
| `ACADEMICS_PROMOTION_MANAGE` | `academics.promotion.manage` | Trigger student promotion jobs |
| `HR_SETTINGS_MANAGE` | `hr.settings.manage` | Manage departments, designations, leave types |
| `HR_STAFF_VIEW` | `hr.staff.view` | View staff directory and profiles |
| `HR_STAFF_CREATE` | `hr.staff.create` | Add new staff members |
| `HR_STAFF_UPDATE` | `hr.staff.update` | Edit staff records and profiles |
| `HR_STAFF_DELETE` | `hr.staff.delete` | Deactivate staff |
| `HR_LEAVE_VIEW` | `hr.leave.view` | View leave types, requests, allocations |
| `HR_LEAVE_MANAGE_TYPES` | `hr.leave.manage_types` | Create/edit/delete leave types |
| `HR_LEAVE_MANAGE_ALLOCATIONS` | `hr.leave.manage_allocations` | Bulk-allocate and adjust leave balances |
| `HR_LEAVE_REQUEST` | `hr.leave.request` | Submit and cancel own leave requests |
| `HR_LEAVE_APPROVE` | `hr.leave.approve` | Approve or reject pending leave requests |
| `HR_ATTENDANCE_MARK` | `hr.attendance.mark` | Bulk-mark daily staff attendance |
| `HR_ATTENDANCE_VIEW` | `hr.attendance.view` | View and query attendance records |

---

## 7. Role Default Grants

> `super_admin` bypasses all checks — not listed here.

| Permission | admin | teacher | accountant | receptionist | student | parent |
|------------|:-----:|:-------:|:----------:|:------------:|:-------:|:------:|
| `students.profile.read` | ✅ | ✅ | ✅ | ✅ | — | — |
| `students.profile.create` | ✅ | — | — | — | — | — |
| `students.profile.update` | ✅ | — | — | — | — | — |
| `students.profile.delete` | ✅ | — | — | — | — | — |
| `students.profile.bulk_import` | ✅ | — | — | — | — | — |
| `students.settings.manage` | ✅ | — | — | — | — | — |
| `students.guardian.manage` | ✅ | — | — | — | — | — |
| `students.enrollment.manage` | ✅ | — | — | — | — | — |
| `academics.class.read` | ✅ | ✅ | — | — | ✅ | ✅ |
| `academics.class.manage` | ✅ | — | — | — | — | — |
| `academics.year.manage` | ✅ | — | — | — | — | — |
| `academics.section.manage` | ✅ | — | — | — | — | — |
| `academics.class_section.manage` | ✅ | — | — | — | — | — |
| `academics.subject.manage` | ✅ | — | — | — | — | — |
| `academics.subject_group.manage` | ✅ | — | — | — | — | — |
| `academics.teacher_assignment.manage` | ✅ | — | — | — | — | — |
| `academics.promotion.manage` | ✅ | — | — | — | — | — |
| `hr.settings.manage` | ✅ | — | — | — | — | — |
| `hr.staff.view` | ✅ | ✅ | — | — | — | — |
| `hr.staff.create` | ✅ | — | — | — | — | — |
| `hr.staff.update` | ✅ | — | — | — | — | — |
| `hr.staff.delete` | ✅ | — | — | — | — | — |
| `hr.leave.view` | ✅ | ✅ | — | — | — | — |
| `hr.leave.manage_types` | ✅ | — | — | — | — | — |
| `hr.leave.manage_allocations` | ✅ | — | — | — | — | — |
| `hr.leave.request` | ✅ | ✅ | — | — | — | — |
| `hr.leave.approve` | ✅ | — | — | — | — | — |
| `hr.attendance.mark` | ✅ | — | — | — | — | — |
| `hr.attendance.view` | ✅ | ✅ | — | — | — | — |

---

## 8. Request / Response Conventions

### Authentication
All protected endpoints require:
```
Authorization: Bearer <access_token>
X-School-ID: <school_uuid>    ← required in dev; in prod, resolved from subdomain
```

### Envelope format

**Single item:**
```json
{ "data": { ...object } }
```

**Paginated list:**
```json
{
  "data": [ ...items ],
  "meta": {
    "total": 120,
    "page": 1,
    "per_page": 25,
    "total_pages": 5,
    "has_next": true,
    "has_prev": false
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": { "field": ["error message"] }
  }
}
```

### Common error codes
| HTTP | Code | When |
|------|------|------|
| 400 | `VALIDATION_ERROR` | DTO validation failed |
| 401 | `INVALID_TOKEN` | Missing or expired JWT |
| 403 | `FORBIDDEN` | Valid JWT but insufficient permissions |
| 404 | `NOT_FOUND` | Record does not exist in this school |
| 409 | `CONFLICT` | Duplicate (employee_id, admission_no, etc.) |
| 422 | `BUSINESS_RULE_VIOLATION` | e.g. approving already-cancelled leave |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### Pagination defaults
- Default page size: **25**
- Max page size: **100**
- Use `?page=1&per_page=25` query params

### Soft deletes
Students and staff are **soft-deleted** — they are not removed from the database but marked with `deleted_at` and `status: inactive/terminated`. Queries automatically exclude soft-deleted records.

### Audit trail
Every write operation (create/update/delete) records the acting user's `id` in an `updated_by` / `created_by` field for full audit traceability.
