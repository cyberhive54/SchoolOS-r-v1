# platform-architecture-rules.md

> **Canonical platform rules for SchoolOS** — the white-label SaaS school operating system.
> This document is the single source of truth for architects and engineers.
> Implementations must follow these rules unless an approved change request is recorded in the change log.

---

## Table of Contents

1. [Summary Decisions (Finalized)](#1--summary-decisions-finalized)
2. [Goals & Guiding Principles](#2--goals--guiding-principles)
3. [Multi-Tenancy (Hybrid)](#3--multi-tenancy-hybrid)
4. [Domain & White-Labeling Policy](#4--domain--white-labeling-policy)
5. [Themes, Front Site, Loaders, UI Customization](#5--themes-front-site-loaders-ui-customization)
6. [Module Activation & Subscription Mapping](#6--module-activation--subscription-mapping)
7. [Authentication — JWT, Refresh, Device Sessions, Login Types, 2FA](#7--authentication)
8. [Authorization — RBAC + PBAC](#8--authorization--rbac--pbac)
9. [API Conventions, Foldering, Responses, Error Codes, Versioning](#9--api-conventions)
10. [Rate Limiting & Throttling Policy](#10--rate-limiting--throttling)
11. [Caching Strategy (Redis + Browser)](#11--caching-strategy)
12. [Offline & Sync Strategy (Attendance-First)](#12--offline--sync-strategy)
13. [File Storage Strategy & Per-School Configuration](#13--file-storage-strategy)
14. [Reports Generation (Server vs. Client)](#14--reports-generation)
15. [Audit Logging & Retention Policy](#15--audit-logging--retention-policy)
16. [Data Deletion / Subscription Cancellation Policy](#16--data-deletion--subscription-cancellation-policy)
17. [Platform Services — SaaS Owner vs. School](#17--platform-services)
18. [Repos & Project Layout](#18--repos--project-layout)
19. [Server Optimization & Scaling Patterns](#19--server-optimization--scaling-patterns)
20. [Security & Hardening Checklist](#20--security--hardening-checklist)
21. [Defaults & Configurable Knobs](#21--defaults--configurable-knobs)
22. [Open / Operational Items & Next Steps](#22--open--operational-items--next-steps)
23. [Appendix — Actionable Checklist](#23--appendix--actionable-checklist)

---

## 1 — Summary Decisions (Finalized)

| Concern | Decision |
|---|---|
| **Tenancy** | Hybrid model. Default = shared DB with RLS. Enterprise/heavy customers → dedicated DB. Group 20–50 schools per DB (manual with tooling). |
| **Domain** | Subdomain + custom subdomain + full custom domain (Model C). Custom domains included on all paid plans. |
| **White label** | Extreme — full branding, custom front site, custom loaders, template editors, ability to remove SchoolOS branding on paid tiers. |
| **Themes** | Multiple prebuilt themes + custom theme builder (Super Admin chooses internal app theme). Front site independently customizable. |
| **Modules** | Toggleable per school; mapped to subscription tiers; Super Admin enables within allowed set. |
| **Auth** | JWT access + refresh tokens with server-stored refresh hashes and device sessions. Access token: 15 min default; Refresh token: 7 days default; Device sessions: 3 (configurable). |
| **Login types** | Flexible per role. Super Admin controls allowed login methods: `student_id`, `admission_no`, `staff_id`, `staff_no`, `parent_id`, `email`, `phone`. Parents support multiple children. |
| **2FA** | Email OTP primary; SMS OTP optional. Critical roles (`super_admin`, `accountant`, `platform_owner`) must use 2FA. |
| **SSO** | Not supported for MVP. Planned for a future version. |
| **Storage** | Hybrid default single-bucket layout. Super Admin may choose storage provider from platform offerings. Firebase supported initially; others pluggable. |
| **Real-time** | Socket.IO (WebSockets) for live updates. Fixed — not configurable per school. |
| **Initial providers** | Firebase (storage), MSG91 (India SMS gateway). |
| **Audit logs** | Create / update / delete / login / permission_denied / impersonation / payment events logged. Hot retention: 90 days. Archive older logs indefinitely. |
| **Cancellation** | Freeze immediately on cancellation; hard delete after 90-day grace period (configurable by SaaS owner). Full export available during grace period. |
| **API structure** | Folder-per-endpoint: every endpoint directory contains `route.md`, DTOs, controller, service, permissions, tests, examples. |
| **Webhooks** | Webhook signature verification required for all inbound webhooks. No dedicated outbound webhook system for MVP. |
| **Background jobs** | Bull + Redis. Dead-letter queue (DLQ) must be configured for all critical job queues. |

---

## 2 — Goals & Guiding Principles

### 2.1 Security by Default
- Least-privilege access at every layer (API, DB, storage).
- Row-Level Security (RLS) enforced at the database for all tenant data.
- All secrets encrypted at rest via KMS/Vault — never stored in code or environment files.
- Comprehensive audit trail for all state-changing and access-control events.

### 2.2 Multi-Tenant First
- Every data model decision starts from the question: "Is this safe in shared tenancy?"
- RLS is the last-resort safety net, not the first line of defense — middleware must also enforce `school_id` scoping.
- Dedicated DB is an operational upgrade, not a different code path.

### 2.3 White-Label Ready
- Schools must be able to brand the system as their own at every customer touchpoint: login page, emails, SMS, reports, mobile app splash.
- SchoolOS attribution is removable on paid plans.

### 2.4 High Performance, Cost Conscious
- Cache aggressively at the edge, Redis layer, and browser.
- Offload heavy work (report generation, bulk notifications, exports) to background queues.
- Never block the synchronous request path with I/O that can be deferred.

### 2.5 Operationally Practical
- Manual DB migrations with platform tooling to avoid automated surprises in production.
- All configuration changes that affect live tenants require explicit operator action and audit log entries.
- Runbooks must exist for every operational procedure (DB grouping, module provisioning, domain migration).

---

## 3 — Multi-Tenancy (Hybrid)

### 3.1 Tenancy Modes

#### Mode A — Shared DB with RLS (Default)
- All schools in a single PostgreSQL database (or a DB group of 20–50 schools).
- `school_id` on every tenant table enforces data isolation.
- RLS policies deny cross-tenant access at the DB level.
- Used by: all standard and growth-tier schools.

#### Mode B — Dedicated DB
- One PostgreSQL database per school (or per small group for very large schools).
- Tenant isolation enforced at the connection level — no RLS needed but still applied as defense-in-depth.
- Used by: enterprise customers, schools with compliance requirements, or schools exceeding resource thresholds.

#### Mode C — DB Grouping
- SaaS owner groups ~20–50 schools into a named DB cluster.
- Provides partial isolation: a noisy neighbor affects only the group, not the entire platform.
- Splitting groups is a manual migration operation with platform tooling.

### 3.2 Tenancy Enforcement Rules

1. **All tenant tables MUST include `school_id UUID NOT NULL`** — enforced by a custom TypeORM decorator and migration linter.

2. **Auth middleware/interceptor MUST set DB session context** on every request:

   ```sql
   SET LOCAL app.current_school_id = '<school_id>';
   SET LOCAL app.user_id           = '<user_id>';
   SET LOCAL app.user_role         = '<role>';
   ```

3. **RLS policies must be present and deny by default.** Example policy pattern:

   ```sql
   -- Policy: tenant isolation on students table
   CREATE POLICY tenant_isolation ON students
     USING (school_id = current_setting('app.current_school_id')::uuid);
   ```

4. **Platform owner bypass** is allowed for support operations but must be explicitly activated and every bypass action is audit-logged with `impersonation` event type.

5. **Composite indexes** must place `school_id` as the first column for all queries that filter by tenant:

   ```sql
   CREATE INDEX idx_students_school_class ON students (school_id, class_id);
   ```

6. **Backwards-compatible migrations** — all migrations touching tenant tables must be non-destructive and safe for rolling updates (e.g., add column nullable first, then backfill, then add NOT NULL constraint).

### 3.3 DB Grouping Operational Notes

- Group assignment stored in platform DB: `db_groups` table maps `school_id` → `db_group_id` → connection string.
- Migration between groups is performed with `schoolos-cli migrate-tenant --school-id=X --target-group=Y`.
- Zero-downtime migration strategy: dual-write phase → validate → cut over → cleanup.

---

## 4 — Domain & White-Labeling Policy

### 4.1 Supported Domain Models

| Model | Example | Notes |
|---|---|---|
| Platform subdomain | `springfield.schoolos.com` | Default; zero config for school. |
| Custom subdomain (CNAME) | `erp.springfieldhs.com` | School CNAMEs their subdomain to platform. |
| Full custom domain | `schoolos.springfieldhs.com` | Dedicated domain; ACME TLS auto-issued. |

### 4.2 Domain Onboarding Flow

1. School admin enters desired domain in Super Admin panel.
2. Platform generates DNS verification records (TXT + CNAME).
3. Admin adds DNS records at their registrar.
4. Platform polls for verification (every 5 minutes, timeout 48 hours).
5. On verification, ACME TLS certificate issued and auto-renewed.
6. Domain → `school_id` mapping written to platform DB.
7. Mapping is used by: API CORS policy, theme loading middleware, login page resolver.

### 4.3 White-Label Options by Tier

| Feature | Free | Starter | Growth | Enterprise |
|---|---|---|---|---|
| Custom subdomain | ✓ | ✓ | ✓ | ✓ |
| Full custom domain | — | ✓ | ✓ | ✓ |
| Remove SchoolOS branding | — | — | ✓ | ✓ |
| Custom email templates | — | ✓ | ✓ | ✓ |
| Custom SMS/WhatsApp templates | — | ✓ | ✓ | ✓ |
| Custom login page | — | — | ✓ | ✓ |
| Custom report card templates | — | — | ✓ | ✓ |
| Custom code injection (sandboxed) | — | — | — | ✓ |

### 4.4 Custom Code Constraints
- Custom JS/CSS injected by schools is sandboxed in an iframe or via CSP-restricted scope.
- Maximum size: 50 KB total (JS + CSS combined).
- Maximum execution time: 200 ms for any synchronous script.
- No access to auth tokens, cookies, or tenant data objects.

---

## 5 — Themes, Front Site, Loaders, UI Customization

### 5.1 Theme Engine

- Built on Tailwind CSS variables and runtime overrides.
- CSS variables injected into `<style>` block on page load from school's theme record.
- Example variables:

  ```css
  :root {
    --color-primary: #1a56db;
    --color-secondary: #7c3aed;
    --radius-md: 0.5rem;
    --font-heading: 'Inter', sans-serif;
  }
  ```

- Theme is loaded before first paint to prevent flash.
- Theme record cached in Redis: key `{school_id}:theme:active`, TTL 1 hour.

### 5.2 Theme Presets

- 6+ prebuilt themes (e.g., `default`, `dark`, `classic`, `ocean`, `forest`, `high-contrast`).
- Super Admin can fork a preset and customize in the theme builder.
- Theme builder exposes: color palette, border radius, font choices, spacing scale.

### 5.3 Front Site (Marketing / Public Pages)

- Separate from the internal app. Default template provided.
- Super Admin can use WYSIWYG editor or upload a full HTML template.
- Front site can sync colors/fonts with the internal app theme or have a completely separate identity.

### 5.4 Preloaders & Custom Loaders

- Schools may upload a branded preloader (spinner, animation).
- Uploaded as a self-contained HTML/CSS/JS file, sandboxed, max 20 KB.
- Validated for safe content (no external requests, no `eval`).

---

## 6 — Module Activation & Subscription Mapping

### 6.1 Module List (Examples)

| Module Key | Description |
|---|---|
| `admissions` | Enquiry → application → enrollment workflow |
| `attendance` | Daily/period attendance with offline support |
| `fees` | Fee structure, invoicing, payment gateway |
| `examinations` | Exam scheduling, marks entry, report cards |
| `timetable` | Class scheduling and teacher assignment |
| `library` | Book catalog, issue/return tracking |
| `transport` | Route and vehicle management |
| `hostel` | Dormitory room assignment |
| `hr` | Staff leave, payroll, appraisals |
| `communication` | Announcements, messaging, parent-teacher |
| `lms` | Assignments, content delivery |
| `analytics` | School-wide dashboards and exports |

### 6.2 Activation Rules

- Canonical field: `schools.active_modules: string[]` stored in platform DB.
- SaaS owner defines module availability per subscription tier in `plan_modules` table.
- Super Admin can toggle any module within the set allowed by their plan.
- **Module enable flow:**
  1. Super Admin enables module via UI.
  2. API returns `{ status: "pending" }`.
  3. Background job runs provisioning (run module migrations, seed config defaults).
  4. On completion, module status updated to `active`; real-time event sent to frontend.
  5. On failure, status set to `error`; admin notified with error details.
- **Module disable flow:**
  1. Super Admin disables module.
  2. API checks for dependencies (e.g., `fees` requires `admissions` in some configs).
  3. If no blocking dependencies, module status set to `inactive`; data retained.
  4. Data is NOT deleted on module disable — only hidden from UI.

### 6.3 Module Dependencies

- Dependencies declared in a `module-manifest.json` file per module.
- Example:

  ```json
  {
    "key": "examinations",
    "requires": ["admissions", "timetable"],
    "optional": ["lms"]
  }
  ```

---

## 7 — Authentication

### 7.1 Token Architecture

| Token | Storage (Server) | Storage (Client) | Default TTL | Rotation |
|---|---|---|---|---|
| Access JWT | Stateless (verified by signature) | Memory (JS variable) | 15 min | On every refresh |
| Refresh token | Hashed in `refresh_tokens` table | Secure HttpOnly cookie | 7 days | On every use (rotation) |

- Access token payload example:

  ```json
  {
    "sub": "user_uuid",
    "school_id": "school_uuid",
    "role": "teacher",
    "permissions": ["attendance.mark", "students.profile.view"],
    "device_id": "device_uuid",
    "iat": 1710000000,
    "exp": 1710000900
  }
  ```

- Refresh token table schema:

  ```sql
  CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    school_id   UUID NOT NULL,
    token_hash  TEXT NOT NULL UNIQUE,
    device_id   UUID NOT NULL,
    device_type TEXT,               -- 'web' | 'mobile' | 'api'
    user_agent  TEXT,
    ip_address  INET,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT now()
  );
  ```

### 7.2 Device Sessions

- Default concurrent sessions per user: **3** (configurable by SaaS owner up to 10).
- When a new login would exceed the limit:
  - **Option A (default):** Revoke the oldest session automatically.
  - **Option B (strict):** Reject the new login with `MAX_SESSIONS_EXCEEDED` error.
  - SaaS owner selects behavior globally; Super Admin cannot override.
- Admin UI shows active sessions per user: device type, last IP, last activity.
- Admin or user can revoke individual sessions or all sessions.

### 7.3 Login Identifiers

Super Admin configures which identifiers are valid per role:

| Identifier | Typical Role |
|---|---|
| `student_id` | Student |
| `admission_no` | Student |
| `staff_id` | Teacher, Staff |
| `staff_no` | Teacher, Staff |
| `parent_id` | Parent |
| `email` | Any role |
| `phone` | Any role (SMS OTP required) |

- Parent accounts support linking to multiple children. On login, parent selects active child context (or switches via UI).
- Students may be prevented from logging in via email if the school only enables `student_id`.

### 7.4 Two-Factor Authentication (2FA)

#### Email OTP (Primary)
1. User submits credentials and passes first-factor check.
2. Server generates a 6-digit OTP, hashes and stores it with 10-minute expiry.
3. OTP sent via school's configured email provider.
4. User submits OTP; server verifies hash, checks expiry, marks as used.
5. On success, access + refresh tokens issued.
6. On failure: increment attempt counter. Lock after 5 failures.

#### SMS OTP (Optional)
- Sent via MSG91 (or other configured SMS provider).
- Same flow as Email OTP.
- Used when: school admin enables SMS OTP, or user's email is unavailable.

#### 2FA Enforcement
- The following roles **must** use 2FA (not configurable off):
  - `platform_owner`
  - `super_admin`
  - `accountant`
- School Super Admin may additionally require 2FA for: `admin`, `principal`, any custom role.
- Users without 2FA enrolled on a required role are forced through enrollment on next login.

### 7.5 Token Refresh Flow

```
Client                           Server
  |  POST /v1/auth/refresh          |
  |  Cookie: refresh_token=<token>  |
  |-------------------------------->|
  |                                 | 1. Verify token signature + not expired
  |                                 | 2. Lookup token_hash in refresh_tokens
  |                                 | 3. Check device_id matches
  |                                 | 4. Revoke old refresh token
  |                                 | 5. Issue new refresh token + new access token
  |<--------------------------------|
  |  { access_token, expires_in }   |
  |  Set-Cookie: refresh_token=new  |
```

---

## 8 — Authorization (RBAC + PBAC)

### 8.1 RBAC — Role-Based Access Control

#### Seeded Platform Roles (immutable)

| Role | Scope | Description |
|---|---|---|
| `platform_owner` | Platform | Full platform admin |
| `super_admin` | School | Full school admin |
| `admin` | School | Day-to-day admin operations |
| `principal` | School | Academic oversight |
| `teacher` | School | Class and subject level |
| `student` | School | Own records only |
| `parent` | School | Own children's records only |
| `accountant` | School | Fees and financial records |
| `receptionist` | School | Admissions and visitor management |
| `librarian` | School | Library module |
| `transport_manager` | School | Transport module |

#### Custom Roles
- Super Admin can create custom roles scoped to their school.
- Custom roles inherit permissions from a base role and can be further restricted/extended.
- Custom roles cannot exceed the permission set of `super_admin`.

#### Permission String Format
`{module}.{resource}.{action}`

Examples:
- `students.profile.view`
- `students.profile.create`
- `fees.invoice.delete`
- `attendance.report.export`
- `timetable.class.assign`

### 8.2 PBAC — Policy-Based Access Control

PBAC handles **data-scoping** rules — which rows of data a user may see/modify.

| Policy | Example |
|---|---|
| Teacher sees only assigned classes | `class_id IN (SELECT class_id FROM teacher_assignments WHERE teacher_id = $user_id)` |
| Parent sees only own children | `student_id IN (SELECT student_id FROM parent_children WHERE parent_id = $user_id)` |
| Accountant sees only own school fees | `school_id = $school_id` (always enforced by RLS anyway) |
| Admin sees all classes | No additional policy restriction |

- PBAC policies are enforced by: middleware query scoping + RLS fallback.
- Super Admins can toggle common PBAC policies via UI (e.g., "Restrict teachers to assigned classes only: ON/OFF").
- Custom PBAC policies (e.g., department-level isolation) require platform engineering assistance.

### 8.3 Permission Check Flow

```
Request → Auth Middleware (verify JWT)
       → RBAC Guard (check role has permission)
       → PBAC Guard (apply data scoping policy)
       → Controller
       → Service (apply scoped query)
       → DB (RLS as final defense)
```

---

## 9 — API Conventions

### 9.1 Base URL
`https://api.{school-domain}/v1`

Example: `https://api.springfield.schoolos.com/v1`

### 9.2 Folder-per-Endpoint Structure

Every endpoint lives in its own folder under `src/modules/<module>/endpoints/<endpoint-name>/`:

```
src/modules/students/endpoints/create-student/
├── route.md          ← Required. CI enforces presence.
├── controller.ts
├── service.ts
├── dto/
│   ├── create-student.request.dto.ts
│   └── create-student.response.dto.ts
├── permissions.ts
├── tests/
│   ├── create-student.service.spec.ts
│   └── create-student.controller.spec.ts
└── examples/
    ├── request.json
    └── response.json
```

### 9.3 Response Envelopes

**Single resource:**
```json
{
  "data": {
    "id": "uuid",
    "name": "John Doe"
  }
}
```

**List resource:**
```json
{
  "data": [
    { "id": "uuid", "name": "John Doe" }
  ],
  "meta": {
    "total": 120,
    "page": 1,
    "per_page": 25,
    "total_pages": 5
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "STUDENT_NOT_FOUND",
    "message": "No student found with the given ID.",
    "details": {
      "field": "student_id",
      "provided": "abc-123"
    }
  }
}
```

### 9.4 HTTP Status Codes

| Code | Meaning | When to use |
|---|---|---|
| 200 | OK | Successful GET, PATCH, DELETE |
| 201 | Created | Successful POST that creates a resource |
| 204 | No Content | Successful DELETE with no response body |
| 400 | Bad Request | DTO validation failures |
| 401 | Unauthorized | Missing or invalid access token |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate resource or state conflict |
| 422 | Unprocessable Entity | Business logic validation failure (not input format) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

### 9.5 Versioning Policy

- Current stable version: `v1`.
- Breaking changes (removed fields, changed semantics) → new major version `v2`.
- Non-breaking additions (new optional fields, new endpoints) → same version.
- Deprecated endpoints remain active for a minimum of 6 months after deprecation notice.
- Deprecation announced via: `Deprecation` response header, docs, and email to registered API users.

---

## 10 — Rate Limiting & Throttling

### 10.1 Default Limits

| Actor | Limit | Scope |
|---|---|---|
| Unauthenticated | 100 req/hr | Per IP |
| Student / Parent | 500 req/hr | Per user |
| Teacher | 1,000 req/hr | Per user |
| Admin / Super Admin | 2,000 req/hr | Per user |
| Platform Owner | 10,000 req/hr | Per user |

### 10.2 Special Endpoint Limits

| Endpoint | Limit | Notes |
|---|---|---|
| `POST /v1/auth/login` | 5 attempts / 15 min | Per IP + per identifier |
| `POST /v1/auth/otp/request` | 3 requests / 10 min | Per user |
| `POST /v1/auth/refresh` | 30 requests / hr | Per device |
| Bulk import endpoints | 10 requests / hr | Per school |
| Report generation | 5 requests / hr | Per user |

### 10.3 Enforcement Layers

1. **Edge (CDN/WAF):** IP-based rate limiting for unauthenticated traffic. DDoS protection.
2. **Application (Redis counters):** User/role-based limits. Uses sliding window algorithm.

### 10.4 Response Headers

Returned on every response:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1710003600
```

On limit exceeded — HTTP `429` with body:
```json
{
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Rate limit exceeded. Retry after 2025-03-12T10:00:00Z.",
    "details": { "retry_after": "2025-03-12T10:00:00Z" }
  }
}
```

### 10.5 Configurable Overrides

- SaaS owner may increase or decrease limits per school via platform admin.
- SaaS owner may grant a school a temporary burst allowance (e.g., during exam season).

---

## 11 — Caching Strategy

### 11.1 Redis Cache

| Cache Type | Key Pattern | TTL | Invalidation |
|---|---|---|---|
| School theme | `{school_id}:theme:active` | 1 hr | Write to theme → publish invalidation |
| User permissions | `{school_id}:user:{user_id}:permissions` | 15 min | Role/permission update |
| Student list | `{school_id}:students:list:{page}:{filters_hash}` | 5 min | Student create/update/delete |
| Dashboard stats | `{school_id}:dashboard:{date}` | 15 min | Nightly recompute |
| Session list | `{school_id}:user:{user_id}:sessions` | 7 days | Session revoke |
| Module config | `{school_id}:modules:active` | 1 hr | Module toggle |

### 11.2 Cache Invalidation

- Invalidation is pub/sub based: services publish to a Redis channel on write.
- Subscribers (other service instances) delete or update affected keys.
- Pattern:

  ```
  PUBLISH cache:invalidate '{"school_id": "x", "scope": "students.list"}'
  ```

### 11.3 Browser Cache

| Data | Storage | Notes |
|---|---|---|
| User profile | `sessionStorage` | Cleared on tab close |
| User permissions | `sessionStorage` | Refetched on new session |
| Theme/CSS variables | `localStorage` | TTL: 1 hr via stored timestamp |
| Access token | JS memory variable | Never persisted to storage |
| Refresh token | Secure HttpOnly cookie | Set by server; JS cannot read |

### 11.4 Cache Aside Pattern (Standard)

```
1. Request arrives for data X
2. Check Redis for key
3a. Cache HIT → return cached value, extend TTL
3b. Cache MISS → query DB → store in Redis → return value
4. On write: update DB → invalidate/update cache → publish invalidation event
```

---

## 12 — Offline & Sync Strategy

### 12.1 Offline-First Scope (MVP)

- **Attendance module only** for MVP offline support.
- Planned expansion: fee collection, exam marks entry (future phases).

### 12.2 Client-Side Storage

- **IndexedDB** for structured offline data (attendance records, class lists).
- Encrypted at rest on device using Web Crypto API (key derived from user credentials).
- Service Worker intercepts attendance API calls and queues them when offline.

### 12.3 Sync Endpoint

```
POST /v1/sync/attendance
```

Request body:
```json
{
  "records": [
    {
      "uuid": "client-generated-uuid",
      "client_seq": 1,
      "student_id": "uuid",
      "class_id": "uuid",
      "date": "2025-03-12",
      "status": "present",
      "marked_at": "2025-03-12T08:30:00Z",
      "marked_by": "teacher-uuid"
    }
  ]
}
```

Response:
```json
{
  "data": {
    "accepted": 45,
    "skipped": 2,
    "conflicts": [
      {
        "uuid": "some-uuid",
        "reason": "ALREADY_MARKED_BY_DIFFERENT_USER",
        "server_record": { ... }
      }
    ]
  }
}
```

### 12.4 Conflict Resolution Rules

| Scenario | Resolution |
|---|---|
| Same UUID submitted twice | Idempotent — second submission skipped |
| Two different users mark same student same day | Conflict logged; server value wins; conflict queued for admin review |
| Sync record older than 7 days | Rejected with `SYNC_RECORD_TOO_OLD` |

---

## 13 — File Storage Strategy

### 13.1 Storage Driver Abstraction

All storage operations go through a driver interface:

```typescript
interface StorageDriver {
  getPresignedUploadUrl(path: string, options: UploadOptions): Promise<string>;
  getSignedDownloadUrl(path: string, ttl: number): Promise<string>;
  delete(path: string): Promise<void>;
  getMetadata(path: string): Promise<ObjectMetadata>;
  copy(sourcePath: string, destPath: string): Promise<void>;
}
```

### 13.2 Default Path Layout

```
{bucket}/schools/{school_id}/{module}/{entity}/{uuid}.{ext}
```

Examples:
```
schools/abc-123/admissions/applications/doc-uuid.pdf
schools/abc-123/students/photos/student-uuid.jpg
schools/abc-123/examinations/results/report-uuid.pdf
```

### 13.3 Upload Flow

1. Client requests a presigned upload URL from API.
2. API validates permissions, file type, and size against school's plan quota.
3. API issues a short-lived (15-minute) presigned URL.
4. Client uploads file **directly** to storage (bypasses API server).
5. Client notifies API of upload completion with object key.
6. API stores file metadata in DB (original filename, MIME type, size, UUID path).

### 13.4 Supported Providers

| Provider | Status | Notes |
|---|---|---|
| Firebase Storage | ✅ Initial | Default for development and production |
| AWS S3 | 🔜 Planned | S3-compatible adapter |
| DigitalOcean Spaces | 🔜 Planned | S3-compatible adapter |
| Cloudflare R2 | 🔜 Planned | S3-compatible; no egress fees |

### 13.5 Quotas & Limits

| Plan | Storage Quota | Max File Size |
|---|---|---|
| Free | 1 GB | 10 MB |
| Starter | 10 GB | 25 MB |
| Growth | 100 GB | 100 MB |
| Enterprise | Custom | 500 MB |

- Super Admin can configure per-module limits within plan bounds.
- Storage overage warning at 80% and 95% capacity.

---

## 14 — Reports Generation

### 14.1 Export Types

| Export Type | Method | Use Case |
|---|---|---|
| Quick CSV | Client-side | Small lists (<1,000 rows), ad-hoc exports |
| Structured XLSX | Server-side (sync) | Medium datasets (<10,000 rows) |
| PDF Report Card | Server-side (async) | Official documents with school branding |
| PDF Fee Receipt | Server-side (async) | Financial receipts requiring audit trail |
| Bulk ZIP export | Server-side (async) | Batch of report cards for entire class |

### 14.2 Async Generation Flow (Recommended for Official Assets)

```
1. Client requests report generation (POST /v1/reports/generate)
2. API validates permissions and queues Bull job
3. API returns { job_id: "uuid", status: "queued" }
4. Worker processes: renders template + merges data
5. Worker stores artifact in file storage
6. Worker emits report.ready event
7. Notification engine sends push + email to requesting user
8. Client polls GET /v1/reports/{job_id} or receives WebSocket event
9. Client downloads via presigned URL
```

### 14.3 Report Template Engine

- PDF: Puppeteer (headless Chrome) rendering HTML templates.
- Templates stored per school; can be customized by Super Admin within allowed schema.
- Template variables follow `{{variable_name}}` syntax.
- Template preview available in Super Admin panel.

---

## 15 — Audit Logging & Retention Policy

### 15.1 Logged Events

| Event Type | Trigger |
|---|---|
| `CREATE` | Any resource creation |
| `UPDATE` | Any resource update (stores diff of changed fields) |
| `DELETE` | Any soft or hard delete |
| `LOGIN` | Successful and failed login attempts |
| `LOGOUT` | Explicit logout |
| `PERMISSION_DENIED` | Any 403 response |
| `IMPERSONATION_START` | Platform owner begins support session |
| `IMPERSONATION_END` | Support session ends |
| `PAYMENT` | Any fee transaction (create, void, refund) |
| `EXPORT` | Any data export |
| `SETTINGS_CHANGE` | School or platform config changes |
| `MODULE_TOGGLE` | Module enabled or disabled |

### 15.2 Audit Log Record Schema

```sql
CREATE TABLE audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL,
  actor_id        UUID,                   -- NULL for system actions
  actor_role      TEXT,
  action          TEXT NOT NULL,          -- Event type from above
  resource_type   TEXT NOT NULL,          -- e.g., 'student', 'invoice'
  resource_id     UUID,
  old_value       JSONB,                  -- Previous state (UPDATE/DELETE)
  new_value       JSONB,                  -- New state (CREATE/UPDATE)
  metadata        JSONB,                  -- Additional context
  ip_address      INET,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);
-- Append-only: no UPDATE or DELETE allowed on this table
```

### 15.3 Retention Policy

| Phase | Duration | Storage |
|---|---|---|
| Hot (queryable) | 90 days | Primary DB |
| Archive | Indefinite | Cold storage (S3 / GCS Nearline) |

- Archival job runs nightly, moves records older than 90 days to cold storage.
- Archived logs remain accessible via platform admin export tool.
- Super Admin can query hot logs via audit log viewer in UI.

---

## 16 — Data Deletion / Subscription Cancellation Policy

### 16.1 Cancellation Lifecycle

```
Cancel Request
  → Status: FROZEN (immediate)
  → Access: READ-ONLY for 30 days, then BLOCKED
  → Grace Period: 90 days (configurable 30–180 days)
  → Export: Available throughout grace period
  → Hard Delete: After grace period expires
```

### 16.2 Freeze Behavior

- All write operations blocked immediately on cancellation.
- Login still permitted for data export.
- Scheduled notifications and jobs paused.
- Domain DNS remains active during grace period.

### 16.3 Hard Delete Sequence

1. Remove all student, staff, and parent records.
2. Remove all financial records.
3. Delete all uploaded files from storage.
4. Revoke all active tokens for school users.
5. Remove DNS mapping and TLS certificate.
6. Archive audit logs to cold storage.
7. Remove school record from platform DB.

### 16.4 Export Options During Grace Period

- Full JSON export of all school data.
- CSV exports per module.
- ZIP of all uploaded files.
- Request fulfilled within 24 hours; download link valid for 7 days.

---

## 17 — Platform Services

> Full details in `platform-services.md`. Summary here.

### SaaS Owner Controls
- Which storage providers are available to schools.
- Which SMS, email, WhatsApp providers are available.
- Global provider credentials (or school-supplied credentials if permitted).
- Pricing, quotas, and hard limits per provider.

### School Super Admin Controls
- Which provider to use from the enabled list.
- Email/SMS/WhatsApp templates and content.
- Notification event-to-channel mappings.
- Per-module notification preferences.

### Initial Providers

| Category | Provider | Notes |
|---|---|---|
| Storage | Firebase Storage | Default |
| SMS | MSG91 | India; TRAI-compliant DLT templates |
| Email | Amazon SES / SendGrid / Mailgun / custom SMTP | School choice |
| Push | Firebase Cloud Messaging (FCM) | Mobile + web push |
| WhatsApp | Meta Business / Twilio / Gupshup | Optional |

---

## 18 — Repos & Project Layout

```
schoolos-backend/          NestJS tenant API
  src/
    modules/               Feature modules
      students/
        endpoints/
          create-student/  Folder-per-endpoint
    common/                Shared guards, pipes, decorators
    config/                Environment config service
  migrations/              TypeORM migrations

schoolos-frontend/         Next.js App Router
  app/                     Route segments
  components/              Shared UI components
  lib/                     API client, auth, utils

schoolos-mobile/           React Native / Expo
  app/                     Expo Router screens
  components/
  services/

schoolos-docs/             Public developer documentation (Docusaurus)

saas-backend/              Platform admin API (NestJS)
saas-frontend/             Platform admin UI (Next.js)
```

### Cross-Repo Shared Packages (Monorepo or NPM Private Registry)
- `@schoolos/types` — shared TypeScript interfaces and enums
- `@schoolos/validators` — shared Zod schemas
- `@schoolos/ui` — shared shadcn/ui-based component library

---

## 19 — Server Optimization & Scaling Patterns

### 19.1 Database

- **pgBouncer** for connection pooling (transaction-mode for RLS compatibility).
- **Read replicas** for analytics queries, report generation, and non-critical reads.
- **Table partitioning** for high-volume append tables: `audit_logs` (by month), `attendance_records` (by month), `notifications` (by month).
- **Vacuum tuning** — custom autovacuum settings for high-write tables.

### 19.2 Application

- **Stateless API servers** — horizontal scaling behind a load balancer.
- **Bull + Redis** for job queues. Dedicated worker pool autoscales by queue depth.
- **Dead-letter queue (DLQ)** configured on all critical queues. Failed jobs after 3 retries go to DLQ and trigger an alert.

### 19.3 Storage & CDN

- **Presigned direct uploads** — API server never proxies file bytes.
- **CDN for public assets** — school logos, public front site content.
- **Image optimization** — automatic resizing for student photos and profile images on upload (stored in multiple sizes).

### 19.4 Scaling Thresholds (Suggested)

| Metric | Threshold | Action |
|---|---|---|
| DB connections | > 80% of pool | Add pgBouncer instance |
| Queue depth | > 500 jobs | Scale worker replicas |
| API p95 latency | > 500 ms | Investigate + scale |
| Redis memory | > 75% | Evict LRU keys / scale |

---

## 20 — Security & Hardening Checklist

### Network & Transport
- [ ] TLS 1.2+ enforced on all endpoints.
- [ ] HSTS header set (`max-age=31536000; includeSubDomains`).
- [ ] CORS restricted to verified school domains only.
- [ ] WAF in front of public API with rate limiting and IP reputation filtering.

### Application
- [ ] CSP headers set on all HTML responses.
- [ ] Secure, HttpOnly, SameSite=Strict cookies for refresh tokens.
- [ ] DTO validation at every controller boundary (no raw body passthrough).
- [ ] CSRF protection for browser-based cookie flows.
- [ ] Webhook signature verification (HMAC-SHA256) for all inbound webhooks.
- [ ] SQL injection prevention via TypeORM parameterized queries (no string interpolation in queries).
- [ ] XSS prevention: output encoding in templates; DOMPurify on client for user-generated content.

### Secrets & Config
- [ ] All secrets in KMS or Vault.
- [ ] No secrets in code, `.env` files in repo, or logs.
- [ ] Static analysis (e.g., `trufflehog`, `gitleaks`) runs in CI on every PR.
- [ ] Environment variable service with schema validation at startup.

### Database
- [ ] RLS policies on all tenant tables.
- [ ] DB session context set by auth middleware on every request.
- [ ] Audit log table is append-only (no UPDATE/DELETE privileges granted).
- [ ] DB credentials rotated quarterly.
- [ ] Point-in-time recovery (PITR) enabled.

### Monitoring & Incident Response
- [ ] Centralized logging (structured JSON) with alerting on error rate spikes.
- [ ] Sentry for exception tracking (PII masked before sending).
- [ ] Uptime monitoring with on-call alerting.
- [ ] Incident response runbook documented and reviewed quarterly.

---

## 21 — Defaults & Configurable Knobs

| Setting | Default | Min | Max | Configurable By |
|---|---|---|---|---|
| Tenancy grouping | 20–50 schools/DB | 1 | 100 | SaaS owner |
| Access token expiry | 15 min | 5 min | 60 min | SaaS owner |
| Refresh token expiry | 7 days | 1 day | 90 days | SaaS owner |
| Device sessions per user | 3 | 1 | 10 | SaaS owner |
| Rate limit (unauthenticated) | 100 req/hr | — | — | SaaS owner |
| Rate limit (student/parent) | 500 req/hr | 100 | 5,000 | SaaS owner |
| Rate limit (teacher) | 1,000 req/hr | 100 | 10,000 | SaaS owner |
| Rate limit (admin) | 2,000 req/hr | 100 | 20,000 | SaaS owner |
| Login attempt limit | 5 per 15 min | — | — | SaaS owner |
| OTP expiry | 10 min | 5 min | 30 min | SaaS owner |
| Cache TTL (static) | 1 hr | — | — | SaaS owner |
| Cache TTL (dashboard) | 15 min | — | — | SaaS owner |
| Audit hot retention | 90 days | 30 days | 365 days | SaaS owner |
| Deletion grace period | 90 days | 30 days | 180 days | SaaS owner |
| Max file size (default) | Varies by plan | — | — | SaaS owner |
| Real-time technology | Socket.IO | — | — | Fixed |
| Concurrent sessions behavior | Revoke oldest | — | — | SaaS owner |

---

## 22 — Open / Operational Items & Next Steps

### Confirmed Decisions
- Storage: Firebase (initial), S3-compatible adapters (next).
- SMS (India): MSG91 with DLT template registration.
- DB grouping and migration: manual with `schoolos-cli` tooling.
- Enterprise dedicated DB playbook: deferred to Phase 2.
- SSO: deferred post-MVP.
- Outbound webhooks: deferred post-MVP.

### Items Requiring Decision
- [ ] **GDPR/data privacy**: Define data residency requirements and geographic DB placement strategy.
- [ ] **API keys**: Design machine-to-machine (M2M) authentication for server-side integrations (no browser involved).
- [ ] **Database backup**: Define backup frequency, retention, and restore testing schedule.
- [ ] **Idempotency keys**: Define standard for POST endpoints that must be idempotent (e.g., fee payment).
- [ ] **Multi-language (i18n)**: Define translation strategy for frontend and notification templates.
- [ ] **Mobile push offline**: Define FCM delivery guarantees and offline message queuing behavior.

---

## 23 — Appendix — Actionable Checklist

### Auth & Sessions
- [ ] Auth interceptor sets DB session context (`school_id`, `user_id`, `role`).
- [ ] `refresh_tokens` table migration with all required columns.
- [ ] Device session management UI (list, revoke individual, revoke all).
- [ ] 2FA enforcement for critical roles with enrollment gate on login.

### Database & Multi-Tenancy
- [ ] RLS migration templates for all tenant tables.
- [ ] Composite index linter (ensure `school_id` is first column).
- [ ] `schoolos-cli` tool for DB group assignment and tenant migration.

### Storage
- [ ] Storage driver abstraction interface.
- [ ] Firebase Storage adapter.
- [ ] Presigned upload + download URL generation.
- [ ] File metadata DB table.

### Notifications & Providers
- [ ] MSG91 integration + DLT template registration workflow.
- [ ] Email provider adapters (SES, SendGrid, Mailgun, SMTP).
- [ ] FCM integration for push notifications.
- [ ] Notification engine: event producer, router, sender workers, fallback logic.

### Real-Time
- [ ] Socket.IO server with per-school namespace (`/school/{school_id}`).
- [ ] Access token verification on WebSocket connection.

### API & CI
- [ ] `route.md` template enforced in CI lint on every PR.
- [ ] Folder-per-endpoint structure generator (scaffold CLI command).
- [ ] OpenAPI generation from NestJS decorators.
- [ ] Dead-letter queue configuration for all Bull queues.

### Monitoring
- [ ] Structured JSON logger (pino) with PII masking.
- [ ] Sentry integration with PII scrubbing rules.
- [ ] Uptime monitor and on-call alerting setup.
