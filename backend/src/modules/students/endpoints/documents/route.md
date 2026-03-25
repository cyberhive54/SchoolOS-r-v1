# Student Documents API

Stores metadata for files attached to a student record (birth certificate, TC, marksheet, etc.).
Actual file uploads are handled by the object-storage service — this API stores URLs + metadata only.

## Endpoints

| Method | Path                                           | Permission                  | Description                          |
|--------|------------------------------------------------|-----------------------------|--------------------------------------|
| GET    | /v1/students/:id/documents                     | students.profile.read       | List all documents for a student     |
| POST   | /v1/students/:id/documents                     | students.profile.update     | Add a document record                |
| GET    | /v1/students/:id/documents/:docId              | students.profile.read       | Get a single document record         |
| PATCH  | /v1/students/:id/documents/:docId              | students.profile.update     | Update title, type or notes          |
| DELETE | /v1/students/:id/documents/:docId              | students.profile.update     | Delete a document record             |

## Document Types
`birth_certificate` | `aadhaar_card` | `transfer_certificate` | `marksheet` |
`caste_certificate` | `income_certificate` | `medical_certificate` | `passport` | `other`

## Notes
- `file_url` must be the final accessible URL (obtained after file upload to object storage).
- `file_size_kb` and `mime_type` are optional but recommended for display.
