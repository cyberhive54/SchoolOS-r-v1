# Class-Sections Endpoints — /v1/academics/class-sections
Manage specific class-section instances per academic year (e.g. Grade 6-A for 2025-26).
Permission: `academics.class_section.manage` for write, `academics.class.read` for read.

Also handles subject assignment and teacher assignment as sub-resources:
- POST /v1/academics/class-sections/:id/subjects
- DELETE /v1/academics/class-sections/:id/subjects/:subjectId
- GET /v1/academics/class-sections/:id/subjects
- POST /v1/academics/class-sections/:id/class-teacher
- DELETE /v1/academics/class-sections/:id/class-teacher
- POST /v1/academics/class-sections/:id/subject-teachers
- DELETE /v1/academics/class-sections/:id/subject-teachers/:assignmentId
- GET /v1/academics/class-sections/:id/teachers
