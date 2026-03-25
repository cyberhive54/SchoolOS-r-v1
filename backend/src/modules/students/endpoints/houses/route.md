# Student Houses Endpoints

## POST /v1/students/houses
Create a student house.

**Auth:** Required  
**Permission:** `students.settings.manage`

**Request Body:**
```json
{ "name": "Red House", "color_hex": "#FF0000", "description": "Red House" }
```

**Response 201:** `{ "data": { ... } }`

---

## GET /v1/students/houses
List all houses for the school.

**Permission:** `students.profile.read`

---

## PATCH /v1/students/houses/:id
Update a house.

**Permission:** `students.settings.manage`

---

## DELETE /v1/students/houses/:id
Delete a house.

**Permission:** `students.settings.manage`
