# route-template.md

> **`route.md` template used inside each endpoint folder.**
> This file is required for every API endpoint and serves as the authoritative spec.
> CI enforces presence and basic completeness checks on every PR.
> See `api-style-guide.md` Section 12 for folder structure requirements.

---

## How to Use This Template

1. Copy this file to your endpoint folder as `route.md`.
2. Fill in every section — do not leave placeholder text.
3. Delete sections that genuinely do not apply (e.g., no events emitted) but leave a note explaining why.
4. CI will reject the PR if required sections are missing or empty.

**Required sections (CI-enforced):**
- Purpose
- Roles & Permissions
- Request Schema
- Response Schema
- Errors

---

## route.md Template

````markdown
# {HTTP Method} {Path}

Example: `POST /v1/students`

---

## Purpose

One to three sentences describing:
- What this endpoint does.
- Which business workflow it supports.
- When it should be called (and when it should NOT be called).

Example:
> Creates a new student record in the school. This endpoint is used at the end of the
> admissions workflow after an application has been approved. It must not be called
> directly without a linked approved application unless the school has enabled
> "direct enrollment" mode.

---

## Roles & Permissions

List all roles and permission codes required to call this endpoint.

Format:
- **Permission(s) required:** `{module}.{resource}.{action}` (AND/OR logic if multiple)
- **Roles with this permission by default:** list default roles

Example:
- **Permissions required:** `students.profile.create`
- **Default roles:** `super_admin`, `admin`, `receptionist`
- **Notes:** Teachers do not have this permission by default. Super Admin may grant it.

---

## PBAC / Data Policy

Describe data scoping rules. Who can call this endpoint, and what data can they see/modify?

Example:
> - Admins can create students in any class.
> - Receptionists can create students only in classes where they have been granted access
>   (policy: `class_id IN (SELECT class_id FROM receptionist_class_access WHERE user_id = $user_id)`).
> - No PBAC restriction if user is `super_admin`.

If no PBAC restriction applies beyond the school_id tenant boundary, state:
> No PBAC restriction. Any user with the required permission can access all records within their school.

---

## Mobile Access

State whether this endpoint is accessible from the mobile app.

- **Mobile Access:** Allowed | Blocked
- **Block reason (if blocked):** e.g., "Data entry for bulk operations is restricted to desktop only."
- **Error code if blocked:** `MOBILE_ACCESS_RESTRICTED` (403)

---

## Rate Limit

State the rate limit for this endpoint, or confirm it uses the global role-based limit.

Example:
- **Rate limit:** Global role-based limit applies (1,000/hr for teacher role).
- **Custom limit (if any):** 100 requests/hr per school (bulk import endpoints).

---

## Idempotency

State whether this endpoint requires or supports an idempotency key.

- **Idempotency Key Required:** Yes | No
- **If yes:** Client must send `Idempotency-Key: {uuid}` header. Requests without this header return `400 BAD_REQUEST`.
- **Key expiry:** 24 hours

---

## Request Schema

Provide all request parameters (path, query, body). Include type, required/optional, and validation rules.

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Student ID |

### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `include_deleted` | boolean | No | false | Include soft-deleted records |

### Request Body

```json
{
  "first_name": "string (2–100 chars, required)",
  "last_name": "string (2–100 chars, required)",
  "date_of_birth": "ISO date string YYYY-MM-DD (required)",
  "gender": "enum: 'male' | 'female' | 'other' (required)",
  "class_id": "UUID (required)",
  "admission_no": "string (2–50 chars, required, unique per school)",
  "phone": "string (optional, E.164 format)",
  "parent_email": "string (optional, valid email)"
}
```

---

## Response Schema

Describe the success response body. Include HTTP status code.

**HTTP Status:** `201 Created`

```json
{
  "data": {
    "id": "uuid",
    "admission_no": "STU-2025-001",
    "first_name": "Riya",
    "last_name": "Sharma",
    "gender": "female",
    "date_of_birth": "2012-05-20",
    "class_id": "class-uuid",
    "created_at": "2025-03-12T08:30:00Z",
    "updated_at": "2025-03-12T08:30:00Z"
  }
}
```

---

## Errors

List all possible error responses with error code, HTTP status, and cause.

| Code | HTTP | Description |
|---|---|---|
| `BAD_REQUEST` | 400 | DTO validation failed. `details.fields` contains field-level errors. |
| `UNAUTHORIZED` | 401 | Missing or invalid access token. |
| `FORBIDDEN` | 403 | User lacks `students.profile.create` permission. |
| `MOBILE_ACCESS_RESTRICTED` | 403 | Request from mobile app; endpoint is desktop-only. |
| `ADMISSION_NO_CONFLICT` | 409 | Admission number is already in use for this school. |
| `CLASS_CAPACITY_EXCEEDED` | 422 | Target class has reached maximum enrollment capacity. |
| `MODULE_NOT_ACTIVE` | 403 | `admissions` module is not active for this school. |
| `INTERNAL_ERROR` | 500 | Unexpected server error. |

---

## Audit Logging

Describe what gets written to `audit_logs` on success or on notable failures.

**On success:**
```
action:        CREATE
resource_type: student
resource_id:   {new student id}
actor_id:      {requesting user id}
new_value:     {full student record (PII included, access-controlled)}
```

**On permission denied (403):**
```
action:               PERMISSION_DENIED
resource_type:        student
attempted_permission: students.profile.create
actor_id:             {requesting user id}
```

---

## Events Emitted

List domain events this endpoint emits to the notification engine and/or WebSocket server.

| Event | Payload | Consumers |
|---|---|---|
| `student.created` | `{ student_id, school_id, class_id, admission_no }` | Notification engine, WebSocket |

If no events are emitted, state: "No domain events emitted."

---

## Example Request

```http
POST /v1/students HTTP/1.1
Host: api.springfield.schoolos.com
Authorization: Bearer eyJhbGci...
Content-Type: application/json
Idempotency-Key: 7f8e3a2b-1c4d-5e6f-7a8b-9c0d1e2f3a4b

{
  "first_name": "Riya",
  "last_name": "Sharma",
  "date_of_birth": "2012-05-20",
  "gender": "female",
  "class_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "admission_no": "STU-2025-001"
}
```

---

## Example Response

```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "admission_no": "STU-2025-001",
    "first_name": "Riya",
    "last_name": "Sharma",
    "gender": "female",
    "date_of_birth": "2012-05-20",
    "class_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "created_at": "2025-03-12T08:30:00Z",
    "updated_at": "2025-03-12T08:30:00Z"
  }
}
```

---

## Notes

Any additional implementation notes, performance considerations, or migration concerns.

Example:
> - Admission number uniqueness is enforced at the DB level via a unique index on `(school_id, admission_no)`.
>   The service checks first and throws before the DB constraint fires, to provide a better error message.
> - If `parent_email` is provided, a parent invitation email is sent asynchronously after student creation.
>   The student record is created regardless of whether the email send succeeds.
> - This endpoint does not create an `enrollment` record automatically. The enrollment lifecycle is managed
>   by the `admissions` module.
````

---

## Completed Example — `POST /v1/fees/invoices/{id}/record-payment`

The following is a fully filled-in `route.md` for reference.

````markdown
# POST /v1/fees/invoices/{id}/record-payment

---

## Purpose

Records an offline or manual payment against a fee invoice. Used when a parent pays in cash
or via bank transfer directly at the school. This is distinct from online payment (handled
by the payment gateway flow). Calling this endpoint marks the invoice as partially or fully
paid and generates a receipt.

---

## Roles & Permissions

- **Permissions required:** `fees.payment.record`
- **Default roles:** `super_admin`, `admin`, `accountant`
- **Notes:** Teachers and receptionists do not have this permission by default.

---

## PBAC / Data Policy

No additional PBAC restriction beyond `school_id` tenant boundary. Any user with
`fees.payment.record` permission can record payments for any invoice in their school.

---

## Mobile Access

- **Mobile Access:** Blocked
- **Block reason:** Financial recording operations are restricted to desktop for accountability.
- **Error code:** `MOBILE_ACCESS_RESTRICTED` (403)

---

## Rate Limit

- **Rate limit:** 200 requests/hr per user (tighter than default to prevent accidental duplicates).

---

## Idempotency

- **Idempotency Key Required:** Yes
- Requests without `Idempotency-Key` header return `400 BAD_REQUEST` with code `IDEMPOTENCY_KEY_REQUIRED`.
- Key expiry: 24 hours.

---

## Request Schema

### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | UUID | Yes | Invoice ID |

### Request Body

```json
{
  "amount": "number (positive, max 2 decimal places, required)",
  "payment_date": "ISO date YYYY-MM-DD (required)",
  "payment_method": "enum: 'cash' | 'bank_transfer' | 'cheque' | 'upi' | 'other' (required)",
  "reference_no": "string (optional, up to 100 chars — cheque number, UTR, etc.)",
  "notes": "string (optional, up to 500 chars)"
}
```

---

## Response Schema

**HTTP Status:** `200 OK`

```json
{
  "data": {
    "payment_id": "uuid",
    "invoice_id": "uuid",
    "amount_paid": 5000.00,
    "payment_date": "2025-03-12",
    "payment_method": "cash",
    "reference_no": null,
    "invoice_status": "partial",
    "balance_remaining": 3500.00,
    "receipt_url": "https://api.schoolos.com/v1/fees/receipts/receipt-uuid"
  }
}
```

---

## Errors

| Code | HTTP | Description |
|---|---|---|
| `BAD_REQUEST` | 400 | Validation failed (invalid amount, missing fields). |
| `IDEMPOTENCY_KEY_REQUIRED` | 400 | `Idempotency-Key` header missing. |
| `UNAUTHORIZED` | 401 | Missing or invalid access token. |
| `FORBIDDEN` | 403 | User lacks `fees.payment.record` permission. |
| `MOBILE_ACCESS_RESTRICTED` | 403 | Request from mobile app. |
| `INVOICE_NOT_FOUND` | 404 | No invoice with given ID in this school. |
| `INVOICE_ALREADY_PAID` | 409 | Invoice is already fully paid. |
| `INVOICE_VOID` | 422 | Invoice has been voided and cannot accept payments. |
| `PAYMENT_AMOUNT_MISMATCH` | 422 | Amount exceeds invoice balance. |
| `IDEMPOTENCY_KEY_IN_USE` | 409 | Same idempotency key is currently being processed. |
| `INTERNAL_ERROR` | 500 | Unexpected server error. |

---

## Audit Logging

**On success:**
```
action:        CREATE
resource_type: fee_payment
resource_id:   {payment_id}
actor_id:      {requesting user}
new_value:     { amount, payment_method, payment_date, invoice_id, invoice_status_after }
```

**On INVOICE_ALREADY_PAID (409):**
```
action:        PERMISSION_DENIED (business rule violation)
resource_type: fee_payment
resource_id:   {invoice_id}
metadata:      { attempted_amount, invoice_status: 'paid' }
```

---

## Events Emitted

| Event | Payload | Consumers |
|---|---|---|
| `fees.payment_received` | `{ payment_id, invoice_id, student_id, school_id, amount, invoice_status }` | Notification engine (triggers email+push to parent), WebSocket |

---

## Example Request

```http
POST /v1/fees/invoices/abc-invoice-uuid/record-payment HTTP/1.1
Host: api.springfield.schoolos.com
Authorization: Bearer eyJhbGci...
Content-Type: application/json
Idempotency-Key: 7f8e3a2b-1c4d-5e6f-7a8b-9c0d1e2f3a4b

{
  "amount": 5000.00,
  "payment_date": "2025-03-12",
  "payment_method": "cash",
  "reference_no": null,
  "notes": "Term 1 partial payment received at front desk."
}
```

---

## Example Response

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": {
    "payment_id": "pay-uuid-here",
    "invoice_id": "abc-invoice-uuid",
    "amount_paid": 5000.00,
    "payment_date": "2025-03-12",
    "payment_method": "cash",
    "reference_no": null,
    "invoice_status": "partial",
    "balance_remaining": 3500.00,
    "receipt_url": "https://api.springfield.schoolos.com/v1/fees/receipts/receipt-uuid"
  }
}
```

---

## Notes

- Receipt PDF is generated asynchronously. The `receipt_url` will return `404` for up to 30 seconds
  while generation is in progress. Client should poll with backoff or listen for `fees.receipt_ready` WebSocket event.
- Idempotency key ensures that network retries do not create duplicate payment records. If the same key is
  submitted after a successful payment, the original response is returned with `X-Idempotent-Replay: true`.
- `payment_date` is the date the payment was received (may be in the past), not the recording date.
  Recording date is set automatically to `now()` by the server.
````

---

## CI Enforcement Rules

The CI route-md linter validates the following on every PR that adds or modifies an endpoint folder:

| Check | Rule |
|---|---|
| File presence | `route.md` must exist in every folder under `endpoints/` |
| Required sections | `Purpose`, `Roles & Permissions`, `Request Schema`, `Response Schema`, `Errors` must be present and non-empty |
| Error codes | All `code` values in the Errors table must be in UPPER_SNAKE_CASE |
| Example files | `examples/request.json` and `examples/response.json` must be valid JSON |
| DTO presence | `dto/request.dto.ts` and `dto/response.dto.ts` must exist |
| Test presence | At least one `.spec.ts` file must exist in `tests/` |
| Idempotency declaration | If endpoint uses `POST` method, `Idempotency` section must be present |

The linter runs as a required check. PRs cannot be merged if the linter fails.
