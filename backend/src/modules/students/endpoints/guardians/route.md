# Guardian Endpoints

## GET /v1/students/:id/guardians
List guardians for a student.

**Permission:** `students.guardian.manage` OR `students.profile.read`

---

## POST /v1/students/:id/guardians
Create and link a guardian to this student.

**Permission:** `students.guardian.manage`

**Request Body:**
```json
{
  "relation": "father",
  "first_name": "Rajesh",
  "last_name": "Sharma",
  "phone": "9876543210",
  "email": "rajesh@example.com",
  "occupation": "Engineer",
  "is_primary": true,
  "emergency_contact": true,
  "create_portal_account": false
}
```

---

## PATCH /v1/students/:id/guardians/:guardianId
Update guardian info.

**Permission:** `students.guardian.manage`

---

## DELETE /v1/students/:id/guardians/:guardianId
Unlink guardian from student (guardian record retained).

**Permission:** `students.guardian.manage`
