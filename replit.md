# SchoolOS — Multi-Tenant School ERP

## Overview

SchoolOS is a production-grade, multi-tenant SaaS School ERP for Indian K-12 schools.
Competitive with Entab, MyClassboard, and Vidyalaya — focused on the Indian market.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Backend**: NestJS 11, TypeORM, PostgreSQL, Redis + BullMQ (port 3001)
- **Frontend**: Next.js 15, React, TypeScript (port 5000)
- **Auth**: OTP 2FA + JWT, RBAC with permission guards
- **Queue**: BullMQ (Redis) for async jobs (promotions, bulk import, leave allocation)
- **Multi-tenancy**: `school_id` on every table; `X-School-ID` header; composite indexes always start with `school_id`

## Packages

| Package | Path | Description |
|---------|------|-------------|
| `schoolos-backend` | `backend/` | NestJS 11 API — all modules, migrations, seeds |
| `schoolos-frontend` | `frontend/` | Next.js 15 frontend — dashboard UI |
| `@schoolos/config` | `packages/config/` | Shared PERMISSIONS const, role defaults |
| `@schoolos/types` | `packages/types/` | Shared TypeScript types (AuthUser, etc.) |

## Running

Servers are NOT auto-started. User will instruct when to start them.

- **Backend**: `pnpm --filter schoolos-backend run start:dev` (port 3001)
- **Frontend**: `pnpm --filter schoolos-frontend run dev` (port 5000)
- **Seed**: `pnpm --filter schoolos-backend run seed`
- **Migrations**: `pnpm --filter schoolos-backend run migration:run`

## Seed credentials

- **Admin email**: `admin@demo.schoolos.com`
- **Admin password**: `Admin@123`
- **School UUID**: `12e9720e-4f8e-4630-8bc1-ca7c6a1cfca9`
- OTP prints to backend console in dev mode

## Migration numbering

| # | File | Purpose |
|---|------|---------|
| 001 | initial-schema | Platform: schools, users, school_memberships, audit_logs |
| 002 | permissions-table | RBAC: permissions, role_permissions |
| 003 | academics-core | academic_years, classes, sections, class_sections, subjects, subject_groups |
| 004 | academics-assignments | class_section_subjects, class_teacher_assignments, teacher_subject_assignments |
| 005 | class-sections-status | Adds status column to class_sections |
| 006 | students-core | student_categories, student_houses, students, student_profiles |
| 007 | students-guardians-enrollments | guardians, student_guardians, student_enrollments |
| 008 | hr-structure | departments, designations, staff, staff_profiles |
| 009 | hr-leave | leave_types, leave_allocations, leave_requests |
| 010 | hr-attendance | staff_attendance |
| 011 | academics-timetable | timetable_periods, timetable_slots, timetable_substitutions |
| 012 | students-siblings-documents | student_siblings, student_documents |
| 013 | hr-staff-documents | staff_documents |
| **014** | _admissions_ (next) | enquiries, applications, admission tests |
| **015** | _fees-structure_ (next) | fee_categories, fee_structures, discounts |
| **016** | _fees-invoices_ (next) | fee_invoices, fee_payments |

## Built Modules (Phase 2)

| # | Module | Status | Key Endpoints |
|---|--------|--------|---------------|
| 1 | Auth | ✅ Complete | OTP login, JWT refresh, RBAC, audit logs |
| 4 | Academics | ✅ Complete | Years, Classes, Sections, Subjects, Teacher assignments, Timetable (periods/slots/substitutions), Promotions |
| 5 | Students (SIS) | ✅ Complete | Students CRUD, Guardians, Enrollments, Siblings, Documents, Bulk import |
| 10 | HR | ✅ Complete | Staff, Departments, Designations, Leave management, Attendance, Staff documents |

## Upcoming Modules (Phase 2 continuation)

| # | Module | Migrations | Priority |
|---|--------|-----------|----------|
| 2 | Admissions | 014 | Next |
| 8 | Fees | 015-016 | After Admissions |
| 5 | Student Attendance | 017 | After Fees |
| 6 | Examinations | 018-019 | After Attendance |

## Architecture Rules

1. **Every table has `school_id`** — first column in all composite indexes
2. **Entities use TypeORM decorators** — `timestamptz` for all dates, composite `@Index` at class level
3. **Services**: inject `AuditService`, use `toDto()` mapper, throw `NotFoundException`/`ConflictException`
4. **Every endpoint folder** needs: `route.md`, `controller.ts`, `service.ts`, `dto/request.dto.ts`, `dto/response.dto.ts`, `permissions.ts`, `tests/*.spec.ts`, `examples/*.json`
5. **PERMISSIONS const** in `packages/config/src/permissions.ts` — add new permissions there
6. **Migrations**: class name format `DescriptionTimestamp<num>`, raw SQL in `queryRunner.query()`

## Code Patterns

```ts
// Service pattern
@Injectable()
export class XService {
  constructor(
    @InjectRepository(XEntity) private readonly xRepo: Repository<XEntity>,
    private readonly auditService: AuditService,
  ) {}
  async create(dto: CreateXDto, user: AuthUser): Promise<XDto> { /* ... */ }
  private toDto(x: XEntity): XDto { /* ... */ }
}

// Controller pattern
@Controller('module/resource')
export class XController {
  @Post()
  @RequirePermissions(PERMISSIONS.X_CREATE)
  create(@Body() dto: CreateXDto, @CurrentUser() user: AuthUser) { ... }
}
```

## Market Differentiators

- Same-day school onboarding
- Mandatory OTP 2FA
- WhatsApp-first communication
- Transparent pricing (no per-student pricing surprises)
- NEP 2020 compliance (Holistic Progress Card, competency-based assessment)
- UDISE compliance reporting

## Key Documentation Files

- `documentation/module-list.md` — All 35 modules with features
- `documentation/module-dependency-map.md` — Layer-based dependency ordering
- `Progress-track/MARKET-RESEARCH.md` — Competitor analysis, pricing, battlecards
- `documentation/modules-docs/` — Per-module spec files (academics, students, hr, fees, admissions)
- `documentation/api-style-guide_1773725741508.md` — API conventions
- `documentation/coding-guidelines_1773725741509.md` — Code standards
- `documentation/agent-rules_1773725741507.md` — Agent rules
