# Academic Years Endpoints

## Purpose
Manage academic years (sessions) per school. Only one year can be `is_current = true` per school.

## Endpoints

### POST /v1/academics/years
Create a new academic year.
- **Permission**: `academics.year.manage`
- **Auth**: Required

### GET /v1/academics/years
List all academic years for the school.
- **Permission**: `academics.class.read` (read-only users can view)
- **Auth**: Required

### GET /v1/academics/years/:id
Get a single academic year by ID.
- **Permission**: `academics.class.read`
- **Auth**: Required

### PATCH /v1/academics/years/:id
Update an academic year.
- **Permission**: `academics.year.manage`
- **Auth**: Required

### DELETE /v1/academics/years/:id
Delete an academic year (only if no class_sections reference it).
- **Permission**: `academics.year.manage`
- **Auth**: Required

### POST /v1/academics/years/:id/set-current
Mark this academic year as the current one. Unsets any existing current year for the school.
- **Permission**: `academics.year.manage`
- **Auth**: Required

## Errors
| Code | HTTP | Description |
|------|------|-------------|
| `NOT_FOUND` | 404 | Academic year not found or belongs to another school |
| `CONFLICT` | 409 | Name already exists for this school |
| `VALIDATION_ERROR` | 400 | Missing or invalid fields |
| `ACADEMIC_YEAR_IN_USE` | 409 | Cannot delete — class sections reference this year |
