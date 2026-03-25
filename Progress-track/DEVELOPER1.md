# SchoolOS — Developer Reference

> Phase 1 complete. This document is the authoritative onboarding guide for any developer picking up the project. Read it top-to-bottom before writing a single line of code.
>
> **File location:** `Progress-track/developer1.md`

---

## Table of Contents

1. [Project Goal](#1-project-goal)
2. [Tech Stack](#2-tech-stack)
3. [Repository Layout](#3-repository-layout)
4. [Architecture Decisions](#4-architecture-decisions)
5. [Backend Deep-Dive](#5-backend-deep-dive)
6. [Frontend Deep-Dive](#6-frontend-deep-dive)
7. [Database Schema](#7-database-schema)
8. [Auth Flow (Detailed)](#8-auth-flow-detailed)
9. [RBAC / Permissions](#9-rbac--permissions)
10. [Multi-Tenancy](#10-multi-tenancy)
11. [API Style Guide](#11-api-style-guide)
12. [Per-Endpoint Folder Structure](#12-per-endpoint-folder-structure)
13. [Code Rules — Non-Negotiable](#13-code-rules--non-negotiable)
14. [Running Quality Gates](#14-running-quality-gates)
15. [Docker Setup](#15-docker-setup)
16. [Environment Variables](#16-environment-variables)
17. [Phase 1 Status — What's Done](#17-phase-1-status--whats-done)
18. [Phase 2 Roadmap — What's Next](#18-phase-2-roadmap--whats-next)
19. [Troubleshooting](#19-troubleshooting)

---

## 1. Project Goal

SchoolOS is a **Docker-native, multi-tenant SaaS School ERP** targeting Indian K-12 schools. It is designed for:

- **Multi-tenancy**: One database, every table scoped by `school_id`. Schools never see each other's data.
- **Production-grade security from day one**: 2FA (OTP), JWT rotation, RBAC, PBAC, full audit logs.
- **Domain-complete**: Students, admissions, academics, attendance, examinations, fees, HR, payroll, communication — one platform.
- **Standalone deployable apps**: `backend/` and `frontend/` are completely isolated. They share no code at runtime. They communicate only via REST API + environment variables.

---

## 2. Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Runtime | Node.js | 22 LTS | |
| Backend | NestJS | 11 | CommonJS — never ESM |
| Frontend | Next.js | 15 | App Router |
| ORM | TypeORM | 0.3.x | migrations only, never synchronize |
| Database | PostgreSQL | 16 | timezone-aware timestamps, UUID PKs |
| Cache / Queue | Redis + BullMQ | 7 / 5.x | |
| Monorepo | pnpm workspaces | 9+ | backend and frontend only |
| Validation (BE) | class-validator + class-transformer + Zod | | Zod for env config, cv for DTOs |
| Auth | @nestjs/jwt + bcrypt | | bcrypt cost 12 |
| Frontend State | Zustand | 5 | access token in JS memory ONLY |
| Data Fetching | TanStack React Query | 5 | |
| UI Components | Custom (inlined) | | 13 components in frontend/src/components/ui/ |
| Styling | Tailwind CSS | 4 | |
| Testing | Jest + ts-jest | 29 / latest | 18 passing tests |
| Linting | ESLint | 9 | flat config (eslint.config.js) |

---

## 3. Repository Layout

```
/
├── backend/                      NestJS 11 API — standalone, port 4000
│   ├── src/
│   │   ├── types/                Shared types (AuthUser, JwtPayload, ApiResponse…)
│   │   ├── config/               Roles, permissions, event names, constants
│   │   ├── common/
│   │   │   ├── filters/          AllExceptionsFilter (global)
│   │   │   ├── interceptors/     ResponseTransformInterceptor (global)
│   │   │   ├── middleware/       TenantMiddleware
│   │   │   ├── guards/           JwtAuthGuard, PermissionsGuard, RoleAwareThrottlerGuard
│   │   │   └── decorators/       @CurrentUser, @CurrentSchool, @RequirePermissions, @Public, @SkipTransform
│   │   ├── modules/
│   │   │   ├── auth/             4 endpoints — each in its own sub-folder
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── login/
│   │   │   │   │   ├── verify-otp/
│   │   │   │   │   ├── refresh/
│   │   │   │   │   └── logout/
│   │   │   │   └── auth.module.ts
│   │   │   ├── users/            UsersModule + UsersService
│   │   │   ├── schools/          SchoolsModule — GET /v1/school/theme
│   │   │   └── platform/
│   │   │       ├── audit/        AuditModule (global, append-only, never throws)
│   │   │       └── permissions/  PermissionsModule (global, in-memory cache)
│   │   ├── database/
│   │   │   ├── entities/         7 TypeORM entities
│   │   │   ├── migrations/       001-initial-schema.ts
│   │   │   ├── seeds/            seed.ts (demo school + admin + role permissions)
│   │   │   └── run-migrations.ts CLI migration runner
│   │   ├── config/               (also has database.config.ts, redis.config.ts, jwt.config.ts)
│   │   ├── main.ts               Bootstrap (Helmet, compression, CORS, validation pipe)
│   │   └── app.module.ts         Root module (Zod env validation, TypeORM, Throttler, BullMQ)
│   ├── tsconfig.json             Standalone (does NOT extend root tsconfig.base.json)
│   ├── tsconfig.test.json        Extends tsconfig.json, adds types:["jest","node"]
│   ├── tsconfig.typecheck.json   For CI typecheck gate
│   ├── jest.config.js
│   ├── eslint.config.js          ESLint v9 flat config (split: src vs spec)
│   ├── Dockerfile                Production multi-stage
│   └── Dockerfile.dev            Development (ts-node + hot reload)
│
├── frontend/                     Next.js 15 — standalone, port 3000
│   ├── src/
│   │   ├── types/                Shared types (mirrored from backend/src/types)
│   │   ├── config/               Roles, permissions (mirrored from backend/src/config)
│   │   ├── components/
│   │   │   ├── ui/               13 UI components (Button, Input, Card, Badge, Label,
│   │   │   │                     Checkbox, Select, Textarea, Dialog, Table,
│   │   │   │                     Separator, Skeleton, Spinner)
│   │   │   ├── auth/             LoginForm.tsx, OtpForm.tsx
│   │   │   └── layout/           Sidebar.tsx, TopBar.tsx, SchoolThemeInjector.tsx
│   │   ├── app/                  Next.js App Router
│   │   │   ├── layout.tsx
│   │   │   ├── providers.tsx     ReactQuery + Zustand hydration
│   │   │   ├── globals.css       CSS variables + Tailwind
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── verify-otp/
│   │   │   └── (dashboard)/
│   │   │       ├── layout.tsx    Protected — redirects to /login if no token
│   │   │       └── page.tsx      Dashboard placeholder
│   │   ├── store/
│   │   │   └── auth.store.ts     Zustand — access token in JS memory ONLY
│   │   └── lib/
│   │       ├── api-client.ts     fetch wrapper with auto-retry on 401
│   │       └── theme.ts          CSS variable injection from API response
│   ├── tsconfig.json             Standalone
│   ├── eslint.config.js
│   ├── Dockerfile                Production
│   └── Dockerfile.dev
│
├── docker/
│   ├── docker-compose.dev.yml    Dev stack (postgres, redis, api, web)
│   ├── docker-compose.yml        Production stack + Nginx
│   └── nginx/default.conf        Reverse proxy + rate limiting
│
├── Progress-track/               Project progress and documentation
│   ├── ai-runs/                  Agent run logs
│   │   └── run-001-17032026-0000.md
│   └── developer1.md             ← YOU ARE HERE — this file
│
├── documentation/                Architecture reference docs (source of truth)
│   ├── agent-rules.md
│   ├── api-style-guide.md
│   ├── coding-guidelines.md
│   ├── gaps-issues-fixed.md
│   ├── module-depedency-map.md
│   ├── module-list.md
│   ├── platform-architecture-rules.md
│   ├── platform-services.md
│   └── route-template.md
│
├── .env.example                  All env vars documented
├── README.md                     User-facing quick start guide
└── package.json                  Root convenience scripts (migrate, seed)
```

---

## 4. Architecture Decisions

### 4.1 Standalone apps, not a coupled workspace

`backend/` and `frontend/` have zero runtime coupling. They each have their own `package.json`, `node_modules`, `tsconfig.json`, and `Dockerfile`. You can deploy either one independently.

Shared types (`AuthUser`, `JwtPayload`, etc.) are **inlined** into both apps under `src/types/`. Path aliases (`@schoolos/types`, `@schoolos/config`, `@schoolos/ui`) are resolved locally via tsconfig `paths` and Jest `moduleNameMapper` — no published packages, no workspace link.

> **Why?** Workspace package coupling at deploy time creates subtle build ordering bugs. With standalone apps, each Docker image builds in its own context with no cross-dependencies.

### 4.2 CommonJS only for the backend

NestJS 11 requires CommonJS. The backend `tsconfig.json` sets `"module": "CommonJS"`. The words `"type": "module"` must **never** appear in `backend/package.json`.

### 4.3 Database: migrations only

`synchronize: false` in TypeORM config. **Always.** Schema changes go through migration files in `backend/src/database/migrations/`. Never use `synchronize: true` even in development — it's too dangerous on a multi-tenant system.

### 4.4 OTP-based two-factor auth

Login requires two steps:
1. Credentials → OTP is generated and delivered (console.log in dev, email/SMS in prod)
2. OTP verification → JWT issued

This prevents password-only login even if credentials are stolen.

### 4.5 Token security model

| Token | Storage | Lifetime | Notes |
|-------|---------|----------|-------|
| Access token | **Zustand JS memory** (never localStorage) | 15 min | Lost on page refresh — triggers silent refresh via cookie |
| Refresh token | **HttpOnly + Secure + SameSite=Strict cookie** | 7 days | Stored as bcrypt hash in DB (cost 12), rotated on every use |

### 4.6 Response envelope

Every API response follows the same shape:

```json
// Success — single resource
{ "data": { ... } }

// Success — paginated list
{ "data": [...], "meta": { "total": 100, "page": 1, "per_page": 25, "total_pages": 4 } }

// Error
{ "error": { "code": "UPPER_SNAKE_CASE", "message": "Human-readable.", "details": {} } }
```

`AllExceptionsFilter` catches everything. Stack traces **never** reach the response body.

---

## 5. Backend Deep-Dive

### 5.1 Bootstrap (`main.ts`)

```
Helmet → compression → cookie-parser → CORS → ValidationPipe (whitelist: true, transform: true) → GlobalFilter → GlobalInterceptor → listen(PORT)
```

### 5.2 App Module

- **Zod** validates all env vars at startup — the app refuses to start with missing/invalid config
- **TypeORM** with `synchronize: false`, logging disabled in production
- **ThrottlerModule** — 4 named buckets: `admin` (2000/hr), `staff` (1000/hr), `student` (500/hr), `guest` (100/hr)
- **EventEmitter2** — for async domain events
- **BullMQ** — wired up, workers to be added in Phase 2
- **ScheduleModule** — for cron jobs in future phases

### 5.3 Guard execution order

```
Request
  → JwtAuthGuard (APP_GUARD — runs first for every route)
  → RoleAwareThrottlerGuard (selects throttle bucket based on role)
  → PermissionsGuard (checks role_permissions table)
  → Route handler
```

- `@Public()` decorator skips `JwtAuthGuard`
- `super_admin` role bypasses `PermissionsGuard` entirely

### 5.4 Decorators

| Decorator | Usage |
|-----------|-------|
| `@CurrentUser()` | Gets `req.user` (AuthUser) from request |
| `@CurrentSchool()` | Gets `req.school` (SchoolEntity) from tenant middleware |
| `@RequirePermissions(...p)` | Declares required permissions for PermissionsGuard |
| `@Public()` | Skips JwtAuthGuard |
| `@SkipTransform()` | Skips ResponseTransformInterceptor (for healthz) |
| `@PaginatedResponse()` | Signals ResponseTransformInterceptor to include meta |

### 5.5 Tenant resolution (TenantMiddleware)

Applied to every route. Three strategies in priority order:

1. `X-School-ID: <uuid>` header — for API clients and local dev
2. Subdomain: `springfield.schoolos.com` → resolves slug `springfield`
3. Custom domain match against `schools.domain` column

Returns `404` if school not found or inactive.

---

## 6. Frontend Deep-Dive

### 6.1 Auth state (Zustand)

```typescript
// store/auth.store.ts
interface AuthStore {
  accessToken: string | null;      // JWT — JS memory ONLY, wiped on page refresh
  user: AuthUser | null;
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}
```

When the page refreshes and `accessToken` is null, the API client automatically attempts a silent refresh using the HttpOnly cookie. If the cookie is expired/invalid, the user is redirected to `/login`.

### 6.2 API client (`lib/api-client.ts`)

- Base URL from `NEXT_PUBLIC_API_URL`
- Attaches `Authorization: Bearer <token>` on every request
- On `401` response: attempts one silent token refresh, then retries original request
- On second `401`: clears auth state, redirects to `/login`

### 6.3 Route protection

The `(dashboard)/layout.tsx` checks for an access token. If none, it redirects immediately to `/login`. The page itself never renders without a valid token.

### 6.4 School theme

The `SchoolThemeInjector` component fetches school branding from `GET /v1/school/theme` and injects CSS variables (`--school-primary`, `--school-secondary`, etc.) into the document root. This allows per-school color theming without rebuilding the app.

### 6.5 UI components

Located in `frontend/src/components/ui/`. 13 components: Button, Input, Card, Badge, Label, Checkbox, Select, Textarea, Dialog, Table, Separator, Skeleton, Spinner. All use CSS variables for theming and class-variance-authority for variant management.

---

## 7. Database Schema

### Entities

| Entity | Table | Purpose |
|--------|-------|---------|
| `SchoolEntity` | `schools` | Tenant record — slug, domain, theme, active flag |
| `UserEntity` | `users` | User account — email, password hash |
| `SchoolMembershipEntity` | `school_memberships` | User ↔ School link with role assignment |
| `UserSessionEntity` | `user_sessions` | Refresh token sessions (stored as bcrypt hash) |
| `OtpRequestEntity` | `otp_requests` | Pending OTP challenges (stored as bcrypt hash) |
| `AuditLogEntity` | `audit_logs` | Append-only audit trail (fillfactor=70) |
| `RolePermissionEntity` | `role_permissions` | Role → permission mapping (PBAC) |

### Index rules (critical for multi-tenancy)

- Every tenant table MUST have `school_id` as the **first column** in composite indexes
- Example: `INDEX(school_id, user_id)` — never `INDEX(user_id, school_id)`
- This ensures Postgres uses school-scoped index scans, preventing cross-tenant data leaks

### Migration workflow

```bash
# Create a new migration
cd backend
pnpm migration:generate src/database/migrations/NNN-description

# Run pending migrations
pnpm migration:run

# Revert last migration
pnpm migration:revert
```

**Never** use `synchronize: true`. **Never** run `DROP` or `ALTER` manually in production.

### Seed data

```bash
pnpm schoolos:seed
```

Creates:
- School: slug=`demo`, domain=`demo.schoolos.com`
- User: `admin@demo.schoolos.com` / `Admin@123` / role=`super_admin`
- Role permissions: full default permission sets for all 7 roles

---

## 8. Auth Flow (Detailed)

### Step 1: Login

```
POST /v1/auth/login
Body: { email, password, school_slug? }
Header: X-School-ID: <uuid>

→ Validates credentials against users + school_memberships
→ Generates 6-digit OTP → bcrypt hash (cost 12) → stored in otp_requests
→ OTP delivered: console.log in dev, email/SMS provider in prod
→ Returns: { data: { message: "OTP sent", otp_request_id: "..." } }
```

Rate limit: 3 requests per 10 minutes per IP.

### Step 2: Verify OTP

```
POST /v1/auth/verify-otp
Body: { otp_request_id, otp, device_name? }

→ Loads OtpRequestEntity → bcrypt.compare(otp, hash)
→ Enforces max 3 concurrent sessions per user per school (revokes oldest)
→ Issues JWT access token (15min, HS256, JwtPayload payload)
→ Creates UserSessionEntity (refresh token = bcrypt hash, 7 days)
→ Sets HttpOnly+Secure+SameSite=Strict cookie with raw refresh token
→ Returns: { data: { access_token, user: AuthUser } }
```

### Step 3: Refresh

```
POST /v1/auth/refresh
Cookie: refresh_token=<raw-token>

→ Loads all active sessions for school
→ Finds session where bcrypt.compare(cookie, hash) = true
→ Revokes old session → creates new session (token rotation)
→ Updates cookie with new refresh token
→ Returns: { data: { access_token } }
```

### Step 4: Logout

```
POST /v1/auth/logout
Cookie: refresh_token=<raw-token>
Header: Authorization: Bearer <access-token>

→ Finds and marks session as revoked
→ Clears refresh_token cookie (maxAge=0)
→ Returns: { data: { message: "Logged out" } }
```

---

## 9. RBAC / Permissions

### Roles (7 total)

| Role | Description |
|------|-------------|
| `super_admin` | Platform owner — bypasses all permission checks |
| `school_admin` | School administrator |
| `vice_principal` | Senior staff |
| `teacher` | Teaching staff |
| `accountant` | Finance staff |
| `receptionist` | Front desk |
| `student` | Enrolled student |

### Permissions format

```
module.resource.action
```

Examples:
- `students.profile.read`
- `fees.invoice.create`
- `academics.timetable.update`
- `hr.payroll.delete`

All permissions are defined in `backend/src/config/index.ts` under `PERMISSIONS`.

### Default permission sets

`ROLE_DEFAULT_PERMISSIONS` in `backend/src/config/index.ts` defines what each role can do by default. These are seeded into `role_permissions` at startup.

### Applying to an endpoint

```typescript
@RequirePermissions('students.profile.read')
@Get(':id')
async getStudent(@CurrentUser() user: AuthUser) { ... }
```

`super_admin` always passes. For all other roles, `PermissionsService` checks the `role_permissions` table with an in-memory cache.

---

## 10. Multi-Tenancy

Every request is scoped to a school. The `TenantMiddleware` resolves the school and attaches it to `req.school`. Every service that touches the database **must** add `where: { school_id: school.id }` to every query.

```typescript
// CORRECT
await this.repo.findOne({ where: { school_id: school.id, id: userId } });

// WRONG — data leak risk
await this.repo.findOne({ where: { id: userId } });
```

The TypeScript type for the request is augmented in `backend/src/types/express.d.ts`:

```typescript
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      school?: SchoolEntity;
    }
  }
}
```

---

## 11. API Style Guide

### URL structure

```
/v1/{module}/{resource}
/v1/{module}/{resource}/{id}
/v1/{module}/{resource}/{id}/{sub-resource}
```

Examples:
- `POST /v1/auth/login`
- `GET /v1/students`
- `GET /v1/students/:id`
- `GET /v1/students/:id/attendance`

### HTTP methods

| Operation | Method |
|-----------|--------|
| List | GET |
| Get one | GET /:id |
| Create | POST |
| Full update | PUT /:id |
| Partial update | PATCH /:id |
| Delete | DELETE /:id |

### Pagination

Always paginate list endpoints:

```
GET /v1/students?page=1&per_page=25&sort=created_at&order=DESC
```

Response:
```json
{
  "data": [...],
  "meta": {
    "total": 847,
    "page": 1,
    "per_page": 25,
    "total_pages": 34,
    "has_next": true,
    "has_prev": false
  }
}
```

### Error codes

Always use `UPPER_SNAKE_CASE` error codes. Common ones:

| Code | Meaning |
|------|---------|
| `UNAUTHORIZED` | Missing or invalid JWT |
| `FORBIDDEN` | Valid JWT but insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | DTO validation failed |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Unexpected server error |
| `TENANT_NOT_FOUND` | X-School-ID not recognized |
| `OTP_EXPIRED` | OTP past 10-minute window |
| `OTP_INVALID` | Wrong OTP code |
| `MAX_SESSIONS` | Too many active sessions |

---

## 12. Per-Endpoint Folder Structure

Every endpoint lives in its own folder. This is mandatory.

```
modules/auth/endpoints/login/
├── route.md             REQUIRED — documents the endpoint contract
├── controller.ts        @Controller + @Post / @Get etc.
├── service.ts           Business logic
├── dto.ts               class-validator DTOs
├── permissions.ts       Permission constants for this endpoint
├── tests/
│   ├── service.spec.ts  Unit tests (mock all deps)
│   └── examples/        Sample request/response JSON files
```

### route.md format

Every `route.md` must contain:
- Endpoint URL and method
- Headers required
- Request body schema
- Response schema (success + errors)
- Rate limits
- Required permissions
- Business rules

See `backend/src/modules/auth/endpoints/login/route.md` for the canonical example.

---

## 13. Code Rules — Non-Negotiable

These are enforced by linting, tests, and code review. Breaking them will cause CI to fail.

| Rule | Detail |
|------|--------|
| No `"type": "module"` in backend | NestJS is CommonJS only |
| `synchronize: false` always | Migrations only, forever |
| `school_id` first in composite indexes | Multi-tenancy correctness |
| Every endpoint has `route.md` | Documentation is not optional |
| No bare `any` in TypeScript | `@typescript-eslint/no-explicit-any: error` |
| Access token: Zustand memory only | Never localStorage, never sessionStorage |
| Refresh token: HttpOnly cookie only | Never in response body, never JS-accessible |
| Refresh token stored as bcrypt hash | Never raw token in database |
| bcrypt cost factor: 12 | For all password and token hashing |
| All timestamps: TIMESTAMPTZ | Timezone-aware |
| All PKs: UUID (gen_random_uuid()) | Never auto-increment integers |
| Stack traces never in API responses | AllExceptionsFilter strips them |
| Secrets from env vars only | No hardcoded credentials, ever |
| AuditService.log() never throws | It swallows its own errors |

---

## 14. Running Quality Gates

```bash
# Backend — from workspace root or backend/
cd backend
pnpm test           # Jest — 18 tests, 4 suites (all auth endpoints)
pnpm typecheck      # tsc -p tsconfig.typecheck.json
pnpm lint           # ESLint v9 flat config

# Frontend — from workspace root or frontend/
cd frontend
pnpm typecheck      # tsc --noEmit
pnpm lint           # ESLint v9 flat config

# Root — run all recursively
pnpm test           # Runs test in all workspace packages
pnpm lint           # Runs lint in all workspace packages
pnpm typecheck      # Runs typecheck in all workspace packages
```

### ESLint configuration detail

The backend uses a **split config** in `eslint.config.js`:
- Source files (`src/**/*.ts`, excluding spec): full type-aware linting, `no-explicit-any: error`
- Test files (`src/**/*.spec.ts`): no `parserOptions.project` (spec files excluded from tsconfig), `no-explicit-any: warn`

This is necessary because spec files import from `@types/jest` which isn't in the main tsconfig `include`.

---

## 15. Docker Setup

### Dev compose (`docker/docker-compose.dev.yml`)

Services: `postgres`, `redis`, `api`, `web`

- API and web use `Dockerfile.dev` (ts-node, hot-reload)
- Source volumes: `../backend/src:/app/src` and `../frontend/src:/app/src`
- Node modules in named volumes (`api_node_modules`, `web_node_modules`) to avoid host/container conflicts

### Production compose (`docker/docker-compose.yml`)

Services: `postgres`, `redis`, `api`, `web`, `nginx`

- API and web use production `Dockerfile` (multi-stage: build → runtime)
- Nginx handles TLS termination and reverse proxy
- Resource limits: postgres=1G, api=1G, web=512M

### Build contexts

Both compose files set the build context to the individual app directory:
- `context: ../backend` → only backend/ is in the Docker build context
- `context: ../frontend` → only frontend/ is in the Docker build context

This keeps images small and build times fast.

---

## 16. Environment Variables

All documented in `.env.example`. Key variables:

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | Yes | — | Full connection string |
| `DATABASE_HOST` | Yes | — | Used when URL not set |
| `DATABASE_PORT` | Yes | 5432 | |
| `DATABASE_NAME` | Yes | schoolos | |
| `DATABASE_USER` | Yes | — | |
| `DATABASE_PASSWORD` | Yes | — | |
| `REDIS_URL` | Yes | — | Full Redis connection string |
| `REDIS_HOST` | Yes | redis | |
| `REDIS_PORT` | Yes | 6379 | |
| `JWT_SECRET` | Yes | — | Min 32 chars, generate with `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Yes | — | Different from JWT_SECRET |
| `JWT_ACCESS_EXPIRY` | No | 15m | |
| `JWT_REFRESH_EXPIRY` | No | 7d | |
| `API_PORT` | No | 4000 | |
| `BCRYPT_ROUNDS` | No | 12 | Never go below 10 |
| `OTP_EXPIRY_MINUTES` | No | 10 | |
| `MAX_DEVICE_SESSIONS` | No | 3 | Per user per school |
| `CORS_ORIGINS` | Yes | — | Comma-separated allowed origins |
| `PLATFORM_DOMAIN` | Yes | — | e.g. `schoolos.com` |
| `EMAIL_PROVIDER` | No | console | `console` | `sendgrid` | `ses` |
| `EMAIL_FROM` | No | — | Sender email for OTP delivery |
| `NODE_ENV` | Yes | development | |

---

## 17. Phase 1 Status — What's Done

### Backend

- [x] NestJS 11 full scaffold (main.ts, app.module.ts, all config modules)
- [x] TypeORM + PostgreSQL 16 (synchronize: false)
- [x] All 7 entities + initial migration
- [x] Seed script (demo school + super_admin + role permissions)
- [x] TenantMiddleware (3-strategy school resolution)
- [x] JwtAuthGuard (APP_GUARD, Bearer token)
- [x] RoleAwareThrottlerGuard (4 named rate-limit buckets)
- [x] PermissionsGuard (PBAC, in-memory cache, super_admin bypass)
- [x] AllExceptionsFilter (global, standard error envelope)
- [x] ResponseTransformInterceptor (global, standard success envelope)
- [x] AuditModule (global, append-only, never throws)
- [x] PermissionsModule (global, with cache)
- [x] HealthModule (GET /v1/healthz)
- [x] SchoolsModule (GET /v1/school/theme)
- [x] UsersModule (UsersService — findById, findByEmail, findMembership)
- [x] **Auth module — 4 complete endpoints each with full folder structure**:
  - [x] POST /v1/auth/login (credential validation, OTP generation)
  - [x] POST /v1/auth/verify-otp (OTP verification, JWT + session creation)
  - [x] POST /v1/auth/refresh (token rotation)
  - [x] POST /v1/auth/logout (session revocation)
- [x] **18 passing unit tests** (4 suites, one per auth service)
- [x] ESLint v9 flat config — 0 errors, 0 warnings
- [x] TypeScript typecheck — 0 errors

### Frontend

- [x] Next.js 15 App Router scaffold
- [x] Login page (`/login`) — email + password form
- [x] OTP page (`/verify-otp`) — 6-digit OTP entry
- [x] Dashboard layout (protected — redirects to /login)
- [x] Dashboard placeholder page
- [x] Zustand auth store (access token in memory only)
- [x] API client (fetch wrapper, auto-retry on 401, silent refresh)
- [x] School theme injector (CSS variables from API)
- [x] 13 UI components (Button, Input, Card, Badge, Label, Checkbox, Select, Textarea, Dialog, Table, Separator, Skeleton, Spinner)
- [x] 8-layer navigation sidebar (all Phase 2+ modules listed, disabled)
- [x] ESLint v9 flat config — 0 errors
- [x] TypeScript typecheck — 0 errors

### Infrastructure

- [x] Docker Compose dev stack (postgres, redis, api, web)
- [x] Docker Compose production stack (+ nginx, resource limits)
- [x] Nginx reverse proxy config with rate limiting
- [x] Production multi-stage Dockerfiles for backend and frontend
- [x] `.env.example` fully documented

---

## 18. Phase 2 Roadmap — What's Next

These modules are stubbed in the Sidebar navigation. The schema, permissions, and route structure should follow the same patterns established in Phase 1.

### Suggested Phase 2 order (by dependency)

1. **StudentsModule** — CRUD for student records, photo upload, guardian links
2. **AdmissionsModule** — application intake, document checklist, offer letters
3. **AcademicsModule** — classes, sections, subjects, timetable management
4. **AttendanceModule** — daily student + staff attendance, BullMQ daily rollup job
5. **ExaminationsModule** — exam schedule, marks entry, grade computation
6. **FeesModule** — fee structures, invoices, payments, Razorpay integration
7. **HRModule** — staff records, leave management
8. **PayrollModule** — salary structures, payslips, TDS computation
9. **CommunicationModule** — announcements, SMS/email dispatch via BullMQ

### For each new endpoint, follow the checklist:

- [ ] Create `modules/{module}/endpoints/{action}/` folder
- [ ] Write `route.md` first (API contract before code)
- [ ] DTO with class-validator decorators
- [ ] Service with school-scoped queries everywhere
- [ ] Controller
- [ ] Permissions registered in `config/index.ts`
- [ ] Default permissions added to `ROLE_DEFAULT_PERMISSIONS`
- [ ] Unit test for service (`tests/service.spec.ts`)
- [ ] Add route to Sidebar navigation in frontend

---

## 19. Troubleshooting

### Backend tests fail with "Cannot find name 'describe'"

This is a Jest + pnpm symlink depth issue. Fix:

```bash
cd backend
rm -rf node_modules
pnpm install --no-frozen-lockfile
```

### TypeORM migration fails with "relation does not exist"

Run migrations in order:

```bash
cd backend && pnpm migration:run
```

Never run migrations manually with raw SQL unless you know what you're doing.

### "Tenant not found" on every request

Pass `X-School-ID: <uuid>` header. Get the UUID from the seed output or directly from the DB:

```sql
SELECT id, slug FROM schools;
```

### OTP not arriving

In development, check the API container logs:

```bash
docker compose -f docker/docker-compose.dev.yml logs api
```

The OTP is printed as: `[DEV] OTP for admin@demo.schoolos.com: 123456`

### Hot-reload not working

The Docker volume mounts `src/` from the host. If changes aren't picked up:

```bash
docker compose -f docker/docker-compose.dev.yml restart api
```

### ESLint complains about `any`

The rule `@typescript-eslint/no-explicit-any: error` is intentional and non-negotiable. Use typed alternatives:

```typescript
// Bad
const x: any = {};

// Good
const x: Record<string, unknown> = {};
const x: Partial<MyInterface> = {};
```

---

*This document covers Phase 1. Update it as new modules are added. The architecture reference docs in `documentation/` remain the source of truth for business rules and module specifications.*
