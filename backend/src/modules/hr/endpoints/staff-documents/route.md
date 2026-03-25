# Staff Documents API

HR document store for staff members (offer letter, appointment letter, educational certificates,
ID proofs, etc.). Stores metadata and file URLs only — actual files live in object storage.

## Endpoints

| Method | Path                                          | Permission        | Description                          |
|--------|-----------------------------------------------|-------------------|--------------------------------------|
| GET    | /v1/hr/staff/:id/documents                    | hr.staff.view     | List all documents for a staff member |
| POST   | /v1/hr/staff/:id/documents                    | hr.staff.update   | Add a document record                |
| GET    | /v1/hr/staff/:id/documents/:docId             | hr.staff.view     | Get a single document record         |
| PATCH  | /v1/hr/staff/:id/documents/:docId             | hr.staff.update   | Update title, type, or notes         |
| DELETE | /v1/hr/staff/:id/documents/:docId             | hr.staff.update   | Delete a document record             |

## Document Types
`offer_letter` | `appointment_letter` | `id_proof` | `address_proof` |
`educational_certificate` | `experience_letter` | `aadhaar_card` | `pan_card` | `passport` | `other`

## Notes
- `file_url` must be the final accessible URL after upload to object storage.
- Audit-logged for compliance.
