# Students CRUD Endpoints

## POST /v1/students
Create a new student.

**Auth:** Required  
**Permission:** `students.profile.create`

**Request Body:**
```json
{
  "admission_no": "2025001",
  "first_name": "Arjun",
  "last_name": "Sharma",
  "date_of_birth": "2015-04-01",
  "gender": "male",
  "category_id": "uuid|null",
  "house_id": "uuid|null",
  "enrollment": {
    "academic_year_id": "uuid",
    "class_section_id": "uuid",
    "roll_number": "01"
  }
}
```

**Response 201:** `{ "data": { student object } }`  
**Errors:** 409 CONFLICT (admission_no already exists)

---

## GET /v1/students
List students with pagination and filters.

**Auth:** Required  
**Permission:** `students.profile.read`

**Query Params:**
- `page` (default 1), `per_page` (default 25, max 100)
- `sort` (last_name, first_name, admission_no, created_at), `order` (ASC|DESC)
- `q` — search by name or admission number
- `filter[class_section_id]`, `filter[academic_year_id]`, `filter[category_id]`, `filter[gender]`, `filter[status]`

**Response 200:** `{ "data": [...], "meta": { total, page, per_page, total_pages } }`

---

## GET /v1/students/:id
Get a single student with current enrollment and guardian count.

**Auth:** Required  
**Permission:** `students.profile.read`

---

## PATCH /v1/students/:id
Partial update of student record.

**Auth:** Required  
**Permission:** `students.profile.update`

---

## DELETE /v1/students/:id
Soft-delete student (sets deleted_at, status=inactive).

**Auth:** Required  
**Permission:** `students.profile.delete`

**Response 204**
