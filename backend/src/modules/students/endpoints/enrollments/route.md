# Enrollment Endpoints

## POST /v1/students/:id/enrollments
Enroll student in a class-section for an academic year.

**Permission:** `students.enrollment.manage`

**Business rules:**
- A student can only have ONE active enrollment per academic year (enforced by DB unique index)
- Emits `student.enrolled` event

**Request Body:**
```json
{ "class_section_id": "uuid", "academic_year_id": "uuid", "roll_number": "01" }
```

## GET /v1/students/:id/enrollments
Full enrollment history for a student.

**Permission:** `students.profile.read`

## PATCH /v1/students/:id/enrollments/:enrollmentId
Update roll number or transfer student (change class-section within same year).

**Permission:** `students.enrollment.manage`
