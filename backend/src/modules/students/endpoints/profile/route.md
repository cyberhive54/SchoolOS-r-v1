# Student Profile Sub-resource

## GET /v1/students/:id/profile
Get extended profile for a student.

**Permission:** `students.profile.read`

## PUT /v1/students/:id/profile
Upsert extended profile (creates or replaces the student_profiles row).

**Permission:** `students.profile.update`

**Request Body:**
```json
{
  "address_line1": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "phone": "9876543210",
  "admission_date": "2025-06-01",
  "previous_school": "ABC School"
}
```
