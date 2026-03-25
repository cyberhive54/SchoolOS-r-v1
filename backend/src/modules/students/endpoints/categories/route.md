# Student Categories Endpoints

## POST /v1/students/categories
Create a new student category.

**Auth:** Required  
**Permission:** `students.settings.manage`

**Request Body:**
```json
{ "name": "General", "code": "GEN", "description": "General category students" }
```

**Response 201:**
```json
{ "data": { "id": "uuid", "name": "General", "code": "GEN", "description": null, "is_active": true, "created_at": "...", "updated_at": "..." } }
```

**Errors:** 409 CONFLICT (code already exists)

---

## GET /v1/students/categories
List all student categories for the school.

**Auth:** Required  
**Permission:** `students.settings.manage` OR `students.profile.read`

**Response 200:**
```json
{ "data": [...] }
```

---

## PATCH /v1/students/categories/:id
Update a student category.

**Permission:** `students.settings.manage`

---

## DELETE /v1/students/categories/:id
Delete a student category (hard delete if no students assigned, else 409).

**Permission:** `students.settings.manage`
