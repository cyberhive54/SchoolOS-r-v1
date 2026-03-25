# Bulk Import Endpoints

## POST /v1/students/bulk-import
Bulk import students from a CSV file.

**Auth:** Required  
**Permission:** `students.profile.bulk_import`  
**Headers:** `Idempotency-Key: <uuid>` (REQUIRED), `Content-Type: multipart/form-data`

**Body:** `file` — CSV file (max 2MB, max 500 rows)

**Response 202 Accepted:**
```json
{ "data": { "job_id": "uuid", "message": "Bulk import job queued. Poll GET /v1/jobs/:job_id for status." } }
```

**CSV Columns:**
Required: admission_no, first_name, last_name, date_of_birth (YYYY-MM-DD), gender (male/female/other)  
Optional: middle_name, blood_group, religion, category_code, house_name, class_section_id, academic_year_id, roll_number

**Errors:**
- 400 VALIDATION_ERROR — file missing or wrong format
- 409 CONFLICT — idempotency key already used

---

## GET /v1/students/bulk-import/template
Download a CSV template for bulk import.

**Auth:** Required  
**Permission:** `students.profile.bulk_import`  
**Response:** CSV file download
