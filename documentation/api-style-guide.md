# api-style-guide.md

> **API design rules, best practices, and structural conventions for SchoolOS.**
> This is the authoritative guide for API authors and for any AI generation of endpoints.
> Deviations require explicit approval and must be documented in `route.md`.

---

## Table of Contents

1. [Principles](#1--principles)
2. [Versioning & Base URL](#2--versioning--base-url)
3. [Naming & Route Conventions](#3--naming--route-conventions)
4. [HTTP Methods & Semantics](#4--http-methods--semantics)
5. [Request / Response Format](#5--request--response-format)
6. [Pagination, Filtering & Sorting](#6--pagination-filtering--sorting)
7. [Authentication Headers & Cookies](#7--authentication-headers--cookies)
8. [Error Structure & Canonical Codes](#8--error-structure--canonical-codes)
9. [Rate Limit Headers & Behavior](#9--rate-limit-headers--behavior)
10. [Idempotency](#10--idempotency)
11. [WebSocket / Real-Time Conventions](#11--websocket--real-time-conventions)
12. [Per-Endpoint Folder Structure](#12--per-endpoint-folder-structure)
13. [OpenAPI Generation Guidance](#13--openapi-generation-guidance)

---

## 1 — Principles

- **Predictable:** Every endpoint follows the same structure, response envelope, and error format. No surprises.
- **Consistent:** Naming, casing, and behavior are uniform across all modules.
- **Machine-readable:** Responses are structured for easy client parsing; errors always carry a `code`.
- **Self-documenting:** `route.md` is the single source of truth for business rules. OpenAPI is derived from code.
- **Secure by default:** Every endpoint is secured. Anonymous access requires explicit declaration in `route.md`.
- **RLS-compliant:** All data access respects multi-tenant isolation enforced via middleware + RLS.

---

## 2 — Versioning & Base URL

### Base URL

```
https://api.{school-domain}/v1
```

**Examples:**
```
https://api.springfield.schoolos.com/v1
https://api.erp.springfieldhs.com/v1
```

### Version Policy

| Scenario | Version Change |
|---|---|
| New optional field added to response | No change (same version) |
| New optional query parameter added | No change |
| New endpoint added | No change |
| Required field added to request | **Breaking → new major version** |
| Field removed from response | **Breaking → new major version** |
| Field renamed | **Breaking → new major version** |
| HTTP status code changed | **Breaking → new major version** |
| Endpoint removed | **Breaking → new major version** |

### Deprecation Process

1. Announce deprecation in API changelog and via `Deprecation: true` response header.
2. Old endpoint remains active for minimum 6 months after deprecation.
3. Include `Sunset: {date}` response header on deprecated endpoints.
4. Email notice to all registered API key holders.

---

## 3 — Naming & Route Conventions

### 3.1 Resource Naming Rules

| Rule | Correct | Wrong |
|---|---|---|
| Plural nouns for collections | `/students` | `/student` |
| Lowercase, hyphenated paths | `/report-cards` | `/reportCards`, `/ReportCards` |
| No verbs in collection names | `/students/{id}/promote` (action sub-resource) | `/promoteStudent` |
| Sub-resources for relationships | `/students/{id}/parents` | `/parentsByStudent/{id}` |
| Actions as sub-resources | `/invoices/{id}/void` | `/voidInvoice/{id}` |

### 3.2 Route Examples

```
# Collections
GET    /v1/students                         List students
POST   /v1/students                         Create student
GET    /v1/students/{id}                    Get student
PATCH  /v1/students/{id}                    Update student
DELETE /v1/students/{id}                    Soft delete student

# Sub-resources (relationships)
GET    /v1/students/{id}/parents            List parents of a student
POST   /v1/students/{id}/parents            Link a parent to a student
DELETE /v1/students/{id}/parents/{parentId} Unlink parent

# Actions (non-CRUD operations)
POST   /v1/students/{id}/promote            Promote student to next grade
POST   /v1/enquiries/{id}/convert           Convert enquiry to admission
POST   /v1/invoices/{id}/void               Void an invoice
POST   /v1/invoices/{id}/record-payment     Record offline payment

# Nested resources
GET    /v1/classes/{id}/attendance          Get attendance for class
POST   /v1/classes/{id}/attendance          Mark attendance for class

# Bulk operations
POST   /v1/students/bulk-import             Import students from CSV
POST   /v1/attendance/bulk-mark             Mark attendance for multiple students
```

### 3.3 Parameter Conventions

- Path parameters: `snake_case` (`{student_id}`, `{class_id}`).
- Query parameters: `snake_case` (`per_page`, `sort`, `filter[class_id]`).
- Body fields: `snake_case`.
- Response fields: `snake_case`.

---

## 4 — HTTP Methods & Semantics

| Method | Semantics | Idempotent | Safe | Body |
|---|---|---|---|---|
| `GET` | Read resource(s) | ✓ | ✓ | None |
| `POST` | Create resource or trigger action | ✗ | ✗ | Yes |
| `PUT` | Replace entire resource | ✓ | ✗ | Yes |
| `PATCH` | Partial update | ✗ | ✗ | Yes |
| `DELETE` | Soft delete (default) or hard delete (explicit) | ✓ | ✗ | Optional |

### Method Selection Guide

- Use `POST` for: creating resources, triggering actions (`/promote`, `/convert`, `/void`), login, OTP requests, sync.
- Use `PATCH` for: updating any subset of fields (most update operations).
- Avoid `PUT` — it implies replacing the entire resource. Use only when the full resource must be provided (e.g., theme configuration).
- `DELETE` defaults to soft delete (sets `deleted_at`). Hard delete endpoints must state this explicitly in `route.md`.

---

## 5 — Request / Response Format

### 5.1 Content Type

- JSON APIs: `Content-Type: application/json`.
- File uploads: `multipart/form-data` for small files, or presigned URL flow (preferred).
- All response timestamps: ISO 8601 in UTC (`2025-03-12T08:30:00Z`).

### 5.2 Success Response Envelopes

**Single resource:**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "admission_no": "STU-2025-001",
    "first_name": "Riya",
    "last_name": "Sharma",
    "gender": "female",
    "class_id": "class-uuid",
    "created_at": "2025-03-12T08:30:00Z",
    "updated_at": "2025-03-12T08:30:00Z"
  }
}
```

**List resource:**
```json
{
  "data": [
    {
      "id": "uuid-1",
      "first_name": "Riya",
      "last_name": "Sharma"
    },
    {
      "id": "uuid-2",
      "first_name": "Arjun",
      "last_name": "Mehta"
    }
  ],
  "meta": {
    "total": 342,
    "page": 1,
    "per_page": 25,
    "total_pages": 14
  }
}
```

**Created resource (201):**
```json
{
  "data": {
    "id": "new-uuid",
    "admission_no": "STU-2025-002"
  }
}
```

**Action response (no resource returned):**
```json
{
  "data": {
    "status": "success",
    "message": "Student promoted to Grade 6."
  }
}
```

**Async job response (202 Accepted):**
```json
{
  "data": {
    "job_id": "job-uuid",
    "status": "queued",
    "estimated_completion": "2025-03-12T08:35:00Z",
    "poll_url": "/v1/jobs/job-uuid"
  }
}
```

### 5.3 Error Response Envelope

```json
{
  "error": {
    "code": "STUDENT_NOT_FOUND",
    "message": "No student found with the given ID.",
    "details": {
      "field": "student_id",
      "provided_value": "bad-uuid"
    }
  }
}
```

**Validation error (400) — multiple fields:**
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed. Check the 'details' field for specifics.",
    "details": {
      "fields": [
        { "field": "first_name", "message": "Must be at least 2 characters." },
        { "field": "date_of_birth", "message": "Must be a valid ISO date." },
        { "field": "class_id", "message": "Must be a valid UUID." }
      ]
    }
  }
}
```

---

## 6 — Pagination, Filtering & Sorting

### 6.1 Query Parameters

| Parameter | Type | Default | Max | Description |
|---|---|---|---|---|
| `page` | integer | 1 | — | 1-based page number |
| `per_page` | integer | 25 | 100 | Items per page |
| `sort` | string | `created_at` | — | Field name; prefix with `-` for descending |
| `q` | string | — | — | Full-text search query |
| `filter[field]` | string | — | — | Exact match filter |
| `filter[field][gte]` | string | — | — | Greater than or equal |
| `filter[field][lte]` | string | — | — | Less than or equal |

### 6.2 Sorting Examples

```
GET /v1/students?sort=last_name           → sort by last_name ASC
GET /v1/students?sort=-created_at         → sort by created_at DESC
GET /v1/fees/invoices?sort=-due_date      → latest due dates first
```

### 6.3 Filtering Examples

```
GET /v1/students?filter[class_id]=uuid-123
GET /v1/students?filter[gender]=female
GET /v1/fees/invoices?filter[status]=overdue
GET /v1/fees/invoices?filter[due_date][lte]=2025-03-31
GET /v1/fees/invoices?filter[amount][gte]=1000
GET /v1/students?q=sharma
```

### 6.4 Response Meta

```json
"meta": {
  "total": 342,
  "page": 2,
  "per_page": 25,
  "total_pages": 14,
  "has_next": true,
  "has_prev": true
}
```

### 6.5 Cursor-Based Pagination (for High-Volume Endpoints)

For audit logs, notification logs, and other high-volume append-only tables, use cursor pagination:

```
GET /v1/audit-logs?cursor=eyJpZCI6InV1aWQiLCJjcmVhdGVkX2F0IjoiLi4uIn0&limit=50
```

Response:
```json
{
  "data": [...],
  "meta": {
    "limit": 50,
    "next_cursor": "eyJpZCI6InV1aWQyIn0",
    "has_more": true
  }
}
```

---

## 7 — Authentication Headers & Cookies

### 7.1 Access Token

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- Required on all authenticated endpoints.
- Access token is short-lived (15 min default).
- Stored in memory by client — never in `localStorage` or `sessionStorage`.

### 7.2 Refresh Token

- Sent as Secure, HttpOnly, SameSite=Strict cookie: `refresh_token`.
- API clients (non-browser) may pass refresh token in `Authorization` header on refresh endpoint only.
- Cookie-based flows require CSRF protection.

### 7.3 CSRF Protection

- For browser-based flows using the refresh token cookie, include a CSRF token in header:
  ```
  X-CSRF-Token: <csrf-token>
  ```
- CSRF token issued at login and on token refresh.
- Server validates CSRF token on all state-changing requests from browser clients.

### 7.4 Multi-Tenant Context

The school is identified from the domain of the request (via Host header or `X-School-ID` header for API clients that don't use school domains).

```
# Browser clients use school domain — school resolved automatically
POST https://api.springfield.schoolos.com/v1/auth/login

# API-key or non-browser clients may use the header
POST https://api.schoolos.com/v1/auth/login
X-School-ID: school-uuid-here
```

---

## 8 — Error Structure & Canonical Codes

### 8.1 Generic Codes

| Code | HTTP Status | When to Use |
|---|---|---|
| `BAD_REQUEST` | 400 | DTO validation failure; malformed request |
| `UNAUTHORIZED` | 401 | Missing, expired, or invalid access token |
| `FORBIDDEN` | 403 | Authenticated but lacks required permission |
| `NOT_FOUND` | 404 | Resource does not exist (or deleted) |
| `CONFLICT` | 409 | Duplicate resource; state transition conflict |
| `UNPROCESSABLE_ENTITY` | 422 | Passes validation but fails business rule |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Dependency unavailable (DB, provider) |

### 8.2 Auth & Session Codes

| Code | HTTP | Description |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Wrong identifier or password |
| `ACCOUNT_LOCKED` | 401 | Too many failed login attempts |
| `SESSION_EXPIRED` | 401 | Access or refresh token expired |
| `SESSION_REVOKED` | 401 | Session explicitly revoked |
| `MAX_SESSIONS_EXCEEDED` | 409 | Strict session limit exceeded (no auto-revoke mode) |
| `OTP_EXPIRED` | 422 | OTP not used within TTL |
| `OTP_INVALID` | 422 | OTP does not match |
| `OTP_ALREADY_USED` | 409 | OTP has already been consumed |
| `OTP_LOCKED` | 429 | Too many OTP verification attempts |
| `TWO_FA_REQUIRED` | 403 | Action requires 2FA to be completed first |

### 8.3 Domain-Specific Codes

#### Students
| Code | HTTP | Description |
|---|---|---|
| `STUDENT_NOT_FOUND` | 404 | No student with given ID in this school |
| `ADMISSION_NO_CONFLICT` | 409 | Admission number already assigned |
| `STUDENT_ALREADY_ENROLLED` | 409 | Student already in an active enrollment |
| `CLASS_CAPACITY_EXCEEDED` | 422 | Class is at maximum capacity |

#### Admissions
| Code | HTTP | Description |
|---|---|---|
| `ENQUIRY_NOT_FOUND` | 404 | Enquiry does not exist |
| `ENQUIRY_ALREADY_CONVERTED` | 409 | Enquiry has already been converted to application |
| `APPLICATION_NOT_FOUND` | 404 | Application does not exist |
| `APPLICATION_ALREADY_APPROVED` | 409 | Application cannot be re-approved |

#### Fees
| Code | HTTP | Description |
|---|---|---|
| `INVOICE_NOT_FOUND` | 404 | Invoice does not exist |
| `INVOICE_ALREADY_PAID` | 409 | Invoice is fully paid; cannot re-pay |
| `INVOICE_VOID` | 422 | Invoice has been voided |
| `PAYMENT_FAILED` | 422 | Payment gateway transaction failed |
| `PAYMENT_AMOUNT_MISMATCH` | 422 | Submitted amount does not match expected |

#### Storage & Files
| Code | HTTP | Description |
|---|---|---|
| `FILE_NOT_FOUND` | 404 | File object does not exist |
| `STORAGE_QUOTA_EXCEEDED` | 422 | School's storage quota would be exceeded |
| `FILE_TYPE_NOT_ALLOWED` | 422 | MIME type not permitted for this upload slot |
| `FILE_SIZE_EXCEEDED` | 422 | File exceeds maximum size for this context |

#### Modules
| Code | HTTP | Description |
|---|---|---|
| `MODULE_NOT_ACTIVE` | 403 | Module is not enabled for this school |
| `MODULE_PROVISIONING` | 503 | Module is being provisioned; retry later |
| `FEATURE_NOT_AVAILABLE_ON_PLAN` | 403 | Feature requires a higher subscription tier |

#### General Access
| Code | HTTP | Description |
|---|---|---|
| `MOBILE_ACCESS_RESTRICTED` | 403 | This endpoint is not accessible from mobile |
| `INSUFFICIENT_PERMISSIONS` | 403 | User lacks required permission |
| `IMPERSONATION_NOT_ALLOWED` | 403 | Impersonation not permitted in this context |

---

## 9 — Rate Limit Headers & Behavior

### 9.1 Standard Headers

Included on every API response:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1710003600
X-RateLimit-Policy: teacher-standard
```

### 9.2 On Limit Exceeded

HTTP `429 Too Many Requests`:

```json
{
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Rate limit exceeded. Please retry after the reset time.",
    "details": {
      "limit": 1000,
      "retry_after": "2025-03-12T10:00:00Z",
      "retry_after_seconds": 847
    }
  }
}
```

The `Retry-After` HTTP header is also set:
```
Retry-After: 847
```

### 9.3 Endpoint-Specific Rate Limits

When an endpoint has a lower limit than the global role limit, the tighter limit applies and is reflected in the headers.

---

## 10 — Idempotency

### 10.1 When to Use Idempotency Keys

Required for endpoints that:
- Create financial transactions (fee payment, refund).
- Trigger external operations (SMS, email, payment gateway charge).
- Could cause duplicate records if retried (e.g., bulk import triggered twice).

### 10.2 Idempotency Key Convention

Client sends a `Idempotency-Key` header with a UUID:

```
POST /v1/fees/invoices/{id}/record-payment
Idempotency-Key: 7f8e3a2b-1c4d-5e6f-7a8b-9c0d1e2f3a4b
```

Server behavior:
1. Check if `Idempotency-Key` exists in `idempotency_keys` table for this school + endpoint.
2. If exists and original request succeeded: return original response with `X-Idempotent-Replay: true`.
3. If exists and original request is in-flight: return `409 Conflict` with `code: IDEMPOTENCY_KEY_IN_USE`.
4. If not exists: process request normally, store key + response on completion.
5. Idempotency keys expire after 24 hours.

### 10.3 Endpoints Requiring Idempotency Keys

These endpoints **must** send an `Idempotency-Key` header; requests without one are rejected with `400 BAD_REQUEST`:

- `POST /v1/fees/invoices/{id}/record-payment`
- `POST /v1/fees/invoices/{id}/refund`
- `POST /v1/payments/initiate`
- `POST /v1/admissions/bulk-import`
- `POST /v1/students/bulk-import`

---

## 11 — WebSocket / Real-Time Conventions

### 11.1 Connection

- Technology: Socket.IO.
- Namespace per school: `/school/{school_id}`.
- Auth: access token passed on connection handshake:

  ```javascript
  const socket = io('https://ws.schoolos.com/school/abc-123', {
    auth: { token: accessToken },
    transports: ['websocket'],
  });
  ```

- Server validates access token on connection. Invalid token → disconnect with `UNAUTHORIZED`.
- On access token expiry while connected: client sends `auth:refresh` event; server issues new token or disconnects.

### 11.2 Event Naming

All events follow `snake_case` with dot-namespace: `{domain}.{event}`.

**Examples:**
```
attendance.updated
visitor.checked_in
fees.invoice_created
fees.payment_received
student.promoted
announcement.published
module.provisioning_complete
report.ready
```

### 11.3 Event Payload Structure

```json
{
  "event": "attendance.updated",
  "request_id": "req-uuid",
  "school_id": "school-uuid",
  "timestamp": "2025-03-12T08:30:00Z",
  "data": {
    "class_id": "class-uuid",
    "date": "2025-03-12",
    "updated_by": "teacher-uuid",
    "summary": {
      "present": 28,
      "absent": 4,
      "late": 2
    }
  }
}
```

### 11.4 Room Strategy

Clients join rooms based on their role and data access:

| Room | Who joins | Events received |
|---|---|---|
| `school:{school_id}` | All authenticated users | Announcements, broadcast events |
| `class:{class_id}` | Teachers and admins of that class | Attendance updates, timetable changes |
| `user:{user_id}` | The specific user | Personal notifications, report ready, job status |
| `admin:{school_id}` | Admins and Super Admins | All school-level events |

### 11.5 Reconnection & Missed Events

- Socket.IO handles automatic reconnection.
- On reconnection, client should re-fetch latest state via REST API (do not rely on missed WebSocket events for data consistency).
- For critical updates (payment confirmed, report ready), the notification engine also sends push/email as a fallback.

---

## 12 — Per-Endpoint Folder Structure

### 12.1 Required Files

Every endpoint must be a folder. The following files are required:

```
create-student/
├── route.md          ← REQUIRED. CI enforces presence and completeness.
├── controller.ts     ← Route wiring, guards, DTO binding.
├── service.ts        ← Business logic.
├── dto/
│   ├── request.dto.ts    ← Incoming request shape with class-validator.
│   └── response.dto.ts   ← Outgoing response shape.
├── permissions.ts    ← Required permission strings and policy expressions.
├── tests/
│   ├── service.spec.ts
│   └── controller.spec.ts
└── examples/
    ├── request.json
    └── response.json
```

### 12.2 Optional Files

```
create-student/
├── entities/
│   └── student-create.entity.ts  ← If endpoint introduces new entity/relation
├── types/
│   └── index.ts                  ← Local types not in shared package
└── helpers/
    └── admission-no.generator.ts ← Endpoint-specific utilities
```

### 12.3 CI Enforcement

The CI linter checks:
1. `route.md` exists in every folder under `endpoints/`.
2. `route.md` contains all required sections: `Purpose`, `Roles & Permissions`, `Request Schema`, `Response Schema`, `Errors`.
3. `dto/request.dto.ts` and `dto/response.dto.ts` exist.
4. `tests/` directory exists and contains at least one `.spec.ts` file.
5. `examples/request.json` and `examples/response.json` exist and are valid JSON.

---

## 13 — OpenAPI Generation Guidance

### 13.1 Source of Truth Hierarchy

```
route.md  ←  Single source of truth for business rules, PBAC, audit behavior.
     ↓
Controller decorators + DTO decorators  ←  Source for OpenAPI generation.
     ↓
openapi.json  ←  Generated artifact. Used for: SDK generation, developer docs, Postman collections.
```

### 13.2 NestJS Swagger Decorators

All controllers and DTOs must use NestJS Swagger decorators:

```typescript
// Controller
@ApiTags('students')
@ApiOperation({ summary: 'Create a new student' })
@ApiResponse({ status: 201, description: 'Student created', type: CreateStudentResponseDto })
@ApiResponse({ status: 400, description: 'Validation failed' })
@ApiResponse({ status: 409, description: 'Admission number conflict' })

// DTO
export class CreateStudentRequestDto {
  @ApiProperty({ example: 'Riya', description: 'Student first name', minLength: 2, maxLength: 100 })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  first_name: string;
}
```

### 13.3 OpenAPI Generation Command

```bash
pnpm run generate:openapi
# Outputs: docs/openapi.json and docs/openapi.yaml
```

The generated spec is committed to the repo and kept up to date. CI fails if the generated spec differs from committed spec (run `pnpm run generate:openapi` before committing).

### 13.4 Discrepancy Handling

If `route.md` documents behavior that cannot be expressed in OpenAPI (complex PBAC logic, conditional responses, async state machines), add a note in the OpenAPI `description` field linking to `route.md` for full details.
