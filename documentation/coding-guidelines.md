# coding-guidelines.md

> **Engineering and code style rules for SchoolOS.**
> These rules are enforced for both human developers and AI-generated code.
> Consistent style and testing ensure predictable outputs from automated generators and reliable contributions across the team.

---

## Table of Contents

1. [Language & Runtime Choices](#1--language--runtime-choices)
2. [TypeScript & Typings Rules](#2--typescript--typings-rules)
3. [Backend: NestJS Patterns & Structure](#3--backend-nestjs-patterns--structure)
4. [Frontend: Next.js App Router & React](#4--frontend-nextjs-app-router--react)
5. [Styling: Tailwind CSS & shadcn/ui](#5--styling-tailwind-css--shadcnui)
6. [State Management & Data Fetching](#6--state-management--data-fetching)
7. [Database & ORM Conventions (TypeORM)](#7--database--orm-conventions-typeorm)
8. [Validation & DTOs](#8--validation--dtos)
9. [Error Handling & Logging](#9--error-handling--logging)
10. [Testing Rules](#10--testing-rules)
11. [Security & Secret Handling](#11--security--secret-handling)
12. [CI/CD & Linting Rules](#12--cicd--linting-rules)
13. [Commit & PR Guidelines](#13--commit--pr-guidelines)
14. [Generated Code Conventions (AI Constraints)](#14--generated-code-conventions-ai-constraints)

---

## 1 — Language & Runtime Choices

| Layer | Technology | Version |
|---|---|---|
| Backend | Node.js + NestJS + TypeScript | Node 20 LTS+; NestJS 10+; TS 5+ |
| Frontend | Next.js + React + TypeScript | Next.js 14 (App Router); React 18+ |
| Mobile | React Native + Expo + TypeScript | Expo SDK 51+ |
| Database | PostgreSQL | 16+ |
| Cache / Queue | Redis + Bull (BullMQ) | Redis 7+; BullMQ 5+ |
| ORM | TypeORM | 0.3+ |
| Package Manager | pnpm (preferred) or npm | pnpm 9+ |

### Runtime Constraints

- **Node.js 20 LTS** is the minimum — no features from 22+ until officially adopted.
- **`"type": "module"` in `package.json`** is NOT used due to TypeORM/NestJS decorator compatibility. Use CommonJS.
- TypeScript **strict mode** is required everywhere. See Section 2.

---

## 2 — TypeScript & Typings Rules

### 2.1 Compiler Config

All repos must have `tsconfig.json` with at minimum:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "target": "ES2022",
    "module": "CommonJS",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### 2.2 Type Discipline

- **No `any`** — use precise interfaces. If a type is truly unknown at compile time, use `unknown` with an explicit type guard:

  ```typescript
  // ✅ Good
  function parseWebhookPayload(raw: unknown): WebhookEvent {
    if (!isWebhookEvent(raw)) throw new BadRequestException('Invalid payload shape');
    return raw;
  }

  // ❌ Bad
  function parseWebhookPayload(raw: any) { ... }
  ```

- **No type assertions without guards** — `as SomeType` is allowed only after a runtime check has confirmed the shape.

- **Prefer interfaces over type aliases** for object shapes (better error messages, extensible).

- **Enums** — use `const enum` for pure numeric enums. For string enums that need to be serialized/deserialized, use plain string union types or a plain `enum`:

  ```typescript
  // ✅ String union type (preferred for API values)
  type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

  // ✅ Enum for internal state machines
  enum ModuleProvisioningStatus {
    Pending = 'pending',
    Active = 'active',
    Error = 'error',
  }
  ```

### 2.3 Shared Types

- Shared types (used across backend + frontend + mobile) live in `@schoolos/types` package.
- Export from a barrel `index.ts` per domain:

  ```typescript
  // packages/types/src/students/index.ts
  export type { Student, CreateStudentDto, StudentListItem } from './student.types';
  ```

---

## 3 — Backend: NestJS Patterns & Structure

### 3.1 Module Structure

Every feature is a self-contained NestJS module:

```
src/modules/students/
├── students.module.ts
├── endpoints/
│   ├── create-student/
│   │   ├── route.md              ← Required
│   │   ├── controller.ts
│   │   ├── service.ts
│   │   ├── dto/
│   │   │   ├── create-student.request.dto.ts
│   │   │   └── create-student.response.dto.ts
│   │   ├── permissions.ts
│   │   ├── tests/
│   │   │   ├── service.spec.ts
│   │   │   └── controller.spec.ts
│   │   └── examples/
│   │       ├── request.json
│   │       └── response.json
│   ├── get-student/
│   ├── update-student/
│   └── list-students/
├── entities/
│   └── student.entity.ts
├── repositories/
│   └── student.repository.ts
└── students.module.ts
```

### 3.2 Controller Rules

Controllers are thin — they handle:
- Route decoration (`@Get`, `@Post`, etc.)
- Auth guards (`@UseGuards(JwtAuthGuard, RolesGuard)`)
- DTO transformation (`@Body()`, `@Param()`, `@Query()`)
- Calling service method
- Returning response

**Controllers must not contain business logic.**

```typescript
// ✅ Good controller
@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CreateStudentController {
  constructor(private readonly service: CreateStudentService) {}

  @Post()
  @RequirePermissions('students.profile.create')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateStudentRequestDto,
    @CurrentSchool() schoolId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateStudentResponseDto> {
    return this.service.create(schoolId, user.id, dto);
  }
}
```

### 3.3 Service Rules

Services contain all business logic:

```typescript
@Injectable()
export class CreateStudentService {
  constructor(
    private readonly studentRepo: StudentRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(schoolId: string, actorId: string, dto: CreateStudentRequestDto): Promise<Student> {
    // 1. Business validation
    const exists = await this.studentRepo.findByAdmissionNo(schoolId, dto.admission_no);
    if (exists) throw new ConflictException({ code: 'ADMISSION_NO_CONFLICT' });

    // 2. Persist
    const student = await this.studentRepo.create({ ...dto, school_id: schoolId });

    // 3. Audit log
    await this.auditService.log({ action: 'CREATE', resource_type: 'student', resource_id: student.id, actor_id: actorId, new_value: student });

    // 4. Emit domain event
    this.eventEmitter.emit('student.created', { student_id: student.id, school_id: schoolId });

    return student;
  }
}
```

### 3.4 Repository Rules

- Use TypeORM repositories and QueryBuilder.
- Raw SQL allowed only in migrations or in exceptional performance-critical scenarios (must be documented with a comment explaining why).
- Never expose DB entities directly from repositories without mapping to domain types when the entity contains sensitive fields.

```typescript
@Injectable()
export class StudentRepository {
  constructor(
    @InjectRepository(StudentEntity)
    private readonly repo: Repository<StudentEntity>,
  ) {}

  async findByAdmissionNo(schoolId: string, admissionNo: string): Promise<StudentEntity | null> {
    return this.repo.findOne({
      where: { school_id: schoolId, admission_no: admissionNo, deleted_at: IsNull() },
    });
  }

  async findBySchoolPaginated(
    schoolId: string,
    page: number,
    perPage: number,
  ): Promise<[StudentEntity[], number]> {
    return this.repo.findAndCount({
      where: { school_id: schoolId, deleted_at: IsNull() },
      order: { created_at: 'DESC' },
      skip: (page - 1) * perPage,
      take: perPage,
    });
  }
}
```

### 3.5 Dependency Injection

- All dependencies injected via constructor.
- No `new ServiceClass()` outside of tests.
- Circular dependencies (if ever unavoidable) resolved via `forwardRef()` — but treat any circular dep as a design smell and refactor if possible.

### 3.6 Exception Handling

Always throw NestJS `HttpException` subclasses with a canonical error code:

```typescript
// ✅ Good
throw new NotFoundException({ code: 'STUDENT_NOT_FOUND', message: 'Student not found.' });
throw new ConflictException({ code: 'ADMISSION_NO_CONFLICT', message: 'Admission number already in use.' });
throw new UnprocessableEntityException({ code: 'INVALID_CLASS_ASSIGNMENT', message: 'Class is full.' });

// ❌ Bad — no code, no structured payload
throw new Error('Student not found');
throw new NotFoundException('not found');
```

---

## 4 — Frontend: Next.js App Router & React

### 4.1 Routing Conventions

- Use App Router (`app/` directory) exclusively.
- File naming: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`.
- Route groups for logical organization: `(auth)`, `(dashboard)`, `(public)`.
- Dynamic routes: `[id]`, `[school_code]`.

**Example structure:**
```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── verify-otp/page.tsx
├── (dashboard)/
│   ├── layout.tsx            ← Auth-protected layout
│   ├── students/
│   │   ├── page.tsx          ← List
│   │   └── [id]/page.tsx     ← Detail
│   └── fees/
│       └── page.tsx
└── (public)/
    └── page.tsx              ← School front site
```

### 4.2 Server vs. Client Components

| Rule | Guidance |
|---|---|
| Default to Server Components | Unless interactivity (state, event handlers) is needed |
| Data fetching | Server Components fetch data directly; pass to Client Components as props |
| Forms | Always Client Components (use React Hook Form) |
| Auth state | Use Server Component for initial check; Zustand for client-side auth state |
| Heavy UI (charts, editors) | Client Components with `dynamic(() => import(...), { ssr: false })` |

```typescript
// ✅ Server Component fetching data
// app/(dashboard)/students/page.tsx
export default async function StudentsPage({ searchParams }) {
  const students = await fetchStudents(searchParams); // Direct service call or fetch
  return <StudentsTable initialData={students} />;
}

// Client Component for interactivity
'use client';
export function StudentsTable({ initialData }) {
  const { data } = useStudents(initialData); // React Query
  return <DataTable data={data} />;
}
```

### 4.3 Component Organization

```
components/
├── ui/           ← shadcn/ui primitives (Button, Input, Dialog, etc.)
├── forms/        ← Reusable form components
├── layout/       ← Header, Sidebar, PageWrapper
├── modules/      ← Feature-specific components (StudentCard, FeeInvoice, etc.)
└── shared/       ← Cross-module components (DataTable, EmptyState, LoadingSpinner)
```

- Keep components small (< 150 lines is a good heuristic).
- Extract logic into custom hooks (`use-students.ts`, `use-fee-calculator.ts`).
- No inline styles — Tailwind classes only. Exception: runtime CSS variable injection (e.g., school theme).

---

## 5 — Styling: Tailwind CSS & shadcn/ui

### 5.1 Tailwind Configuration

Central `tailwind.config.ts` with design tokens:

```typescript
// tailwind.config.ts
export default {
  content: ['./app/**/*.tsx', './components/**/*.tsx'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        surface: 'var(--color-surface)',
      },
      borderRadius: {
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
      },
    },
  },
};
```

### 5.2 CSS Variables (Theme System)

```css
/* Base theme variables injected by server based on school config */
:root {
  --color-primary: #1a56db;
  --color-secondary: #7c3aed;
  --color-accent: #f59e0b;
  --color-surface: #f9fafb;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
}
```

### 5.3 shadcn/ui Usage Rules

- **Use shadcn/ui primitives** for all standard UI: Button, Input, Dialog, Table, Select, etc.
- **Do not re-implement** primitives that shadcn/ui already provides.
- **Extend** shadcn/ui components via the `cn()` utility:

  ```typescript
  import { cn } from '@/lib/utils';
  import { Button } from '@/components/ui/button';

  // ✅ Extending with additional classes
  <Button className={cn('w-full mt-4', isLoading && 'opacity-50')} />

  // ❌ Don't create a new Button from scratch when shadcn/ui's Button works
  ```

- **No CSS-in-JS** (no `styled-components`, no `emotion`). Tailwind classes only.
- **No inline `style` prop** except for runtime CSS variable injection:

  ```tsx
  // ✅ Acceptable: runtime theme variable
  <div style={{ '--color-primary': school.primaryColor } as React.CSSProperties}>

  // ❌ Not acceptable: static styling via inline style
  <div style={{ marginTop: '16px', color: 'blue' }}>
  ```

---

## 6 — State Management & Data Fetching

### 6.1 Server State — React Query (TanStack Query v5)

All API calls from the frontend go through React Query.

```typescript
// hooks/use-students.ts
export function useStudents(params: StudentListParams) {
  return useQuery({
    queryKey: ['students', params],
    queryFn: () => apiClient.students.list(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateStudentDto) => apiClient.students.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
```

**Rules:**
- Every entity type has a centralized query key factory.
- On successful mutations, always invalidate related queries.
- Use `placeholderData` (not `keepPreviousData`) for paginated lists (TQ v5 API).

### 6.2 Global State — Zustand

Used only for: auth state, UI state (sidebar open/closed, active theme), and user preferences.

```typescript
// stores/auth.store.ts
interface AuthState {
  user: AuthUser | null;
  school: School | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, school: School) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  school: null,
  isAuthenticated: false,
  setAuth: (user, school) => set({ user, school, isAuthenticated: true }),
  clearAuth: () => set({ user: null, school: null, isAuthenticated: false }),
}));
```

### 6.3 Forms — React Hook Form + Zod

```typescript
// Zod schema (reused in backend DTO validation where possible)
const createStudentSchema = z.object({
  first_name: z.string().min(2).max(50),
  last_name: z.string().min(2).max(50),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  gender: z.enum(['male', 'female', 'other']),
  class_id: z.string().uuid(),
});

type CreateStudentFormValues = z.infer<typeof createStudentSchema>;

// Form component
const form = useForm<CreateStudentFormValues>({
  resolver: zodResolver(createStudentSchema),
  defaultValues: { gender: 'male' },
});
```

### 6.4 API Client

Central API client with auth interceptors:

```typescript
// lib/api-client.ts
const apiClient = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

// Request interceptor: attach access token
apiClient.interceptors.request.use((config) => {
  const token = getAccessTokenFromMemory();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle 401 → refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      await refreshAccessToken(); // Calls /auth/refresh with HttpOnly cookie
      return apiClient(error.config);
    }
    return Promise.reject(error);
  },
);
```

---

## 7 — Database & ORM Conventions (TypeORM)

### 7.1 Entity Conventions

```typescript
@Entity('students')
export class StudentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'school_id', nullable: false })
  school_id: string;           // ← Required on all tenant entities

  @Column({ name: 'admission_no', length: 50 })
  admission_no: string;

  @Column({ name: 'first_name', length: 100 })
  first_name: string;

  @Column({ name: 'last_name', length: 100 })
  last_name: string;

  @Column({ type: 'date', name: 'date_of_birth' })
  date_of_birth: string;

  @Column({ type: 'enum', enum: ['male', 'female', 'other'] })
  gender: 'male' | 'female' | 'other';

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deleted_at: Date | null;      // ← Soft delete
}
```

**Rules:**
- Table names in `snake_case` (plural).
- Column names in `snake_case`.
- All primary keys: UUID (`gen_random_uuid()`).
- All timestamps: `created_at`, `updated_at`, `deleted_at`.
- Soft delete on all tenant data entities (`deleted_at` column + TypeORM `@DeleteDateColumn`).
- Hard delete only on: session tokens, OTP records, temporary data.

### 7.2 Migration Rules

- **Never use `synchronize: true` in any environment except isolated unit test DBs.**
- All schema changes via TypeORM migration files.
- Migration naming: `{timestamp}-{action}-{entity}.ts` (e.g., `1710000000000-add-class-id-to-students.ts`).
- Migrations must be backwards compatible (additive or two-phase).

**Two-phase migration example (adding NOT NULL column):**
```typescript
// Phase 1 migration: add nullable column
export class AddGradeToStudents1710000000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.addColumn('students', new TableColumn({ name: 'grade', type: 'varchar', isNullable: true }));
  }
}

// Deploy Phase 1 → Backfill data → Deploy Phase 2
// Phase 2 migration: add NOT NULL constraint
export class MakeGradeNotNull1710000600000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.changeColumn('students', 'grade', new TableColumn({ name: 'grade', type: 'varchar', isNullable: false }));
  }
}
```

### 7.3 Index Conventions

```typescript
@Entity('students')
@Index(['school_id', 'class_id'])           // ← school_id FIRST
@Index(['school_id', 'admission_no'], { unique: true })
@Index(['school_id', 'created_at'])
export class StudentEntity { ... }
```

### 7.4 QueryBuilder for Complex Queries

```typescript
async findStudentsWithAttendance(schoolId: string, classId: string, date: string) {
  return this.repo
    .createQueryBuilder('s')
    .leftJoinAndSelect('s.attendance', 'a', 'a.date = :date', { date })
    .where('s.school_id = :schoolId', { schoolId })
    .andWhere('s.class_id = :classId', { classId })
    .andWhere('s.deleted_at IS NULL')
    .orderBy('s.last_name', 'ASC')
    .getMany();
}
```

---

## 8 — Validation & DTOs

### 8.1 Backend DTOs (class-validator + class-transformer)

```typescript
// dto/create-student.request.dto.ts
import { IsString, IsUUID, IsDateString, IsEnum, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateStudentRequestDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  first_name: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  last_name: string;

  @IsDateString()
  date_of_birth: string;   // ISO date: YYYY-MM-DD

  @IsEnum(['male', 'female', 'other'])
  gender: 'male' | 'female' | 'other';

  @IsUUID()
  class_id: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  admission_no: string;
}
```

**Rules:**
- All DTOs use `class-validator` decorators.
- Global `ValidationPipe` applied in `main.ts` with `{ whitelist: true, forbidNonWhitelisted: true }`.
- Whitelist strips unknown fields — do not rely on client sending only expected fields.
- Response DTOs must be explicitly typed — do not return raw entities.

### 8.2 Frontend Validation (Zod)

- Zod schemas mirror backend DTOs for forms.
- Where possible, use `@schoolos/validators` shared package to avoid duplication.
- Zod schemas used for: form validation, API response parsing, URL search param parsing.

---

## 9 — Error Handling & Logging

### 9.1 Logging

- Use **pino** for structured JSON logging in backend.
- Log levels: `trace` (dev only), `debug` (dev only), `info`, `warn`, `error`, `fatal`.
- Every log entry includes: `timestamp`, `level`, `request_id`, `school_id` (when available), `user_id` (when available), `message`.
- **Mask sensitive data** before logging: passwords, OTPs, tokens, payment card numbers, full phone numbers.

```typescript
// ✅ Good
logger.info({ school_id: schoolId, student_id: student.id }, 'Student created');

// ❌ Bad — never log sensitive data
logger.info({ dto }, 'Student created'); // dto may contain PII
logger.error({ error, token }, 'Token validation failed'); // never log tokens
```

### 9.2 Global Exception Filter

A single `GlobalExceptionFilter` catches all unhandled exceptions and formats them as the canonical error envelope:

```typescript
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      // Normalize to canonical error format
      response.status(status).json(normalizeError(body));
    } else {
      // Unexpected error — log full stack, return 500
      logger.error({ err: exception, path: request.url }, 'Unhandled exception');
      response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
    }
  }
}
```

### 9.3 Error Codes

Every error must have an `error.code` in UPPER_SNAKE_CASE. See `api-style-guide.md` for canonical list. Domain-specific codes follow the pattern `{DOMAIN}_{REASON}`:

```
STUDENT_NOT_FOUND
ADMISSION_NO_CONFLICT
ENQUIRY_ALREADY_CONVERTED
FEE_INVOICE_OVERDUE
CLASS_CAPACITY_EXCEEDED
STORAGE_QUOTA_EXCEEDED
```

### 9.4 Sentry Integration

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // Scrub PII from all events
    return scrubPiiFromSentryEvent(event);
  },
});
```

- PII scrubbing rules: remove `password`, `otp`, `token`, `Authorization`, `cookie`, `phone`, `email` fields from Sentry payloads.
- Sentry performance tracing enabled for API routes.

---

## 10 — Testing Rules

### 10.1 Test Types & Tooling

| Type | Tool | Coverage Target |
|---|---|---|
| Unit tests (services, utilities) | Jest | 70% minimum for critical modules |
| Integration tests (controllers, repos) | Jest + Supertest + test DB | Key API flows |
| E2E tests (full user flows) | Playwright | Critical paths: login, admission, fee payment |
| Mobile E2E | Detox (future) | Critical paths |

### 10.2 Unit Test Examples

```typescript
// tests/service.spec.ts
describe('CreateStudentService', () => {
  let service: CreateStudentService;
  let mockRepo: jest.Mocked<StudentRepository>;

  beforeEach(async () => {
    mockRepo = { findByAdmissionNo: jest.fn(), create: jest.fn() } as any;
    const module = await Test.createTestingModule({
      providers: [
        CreateStudentService,
        { provide: StudentRepository, useValue: mockRepo },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = module.get(CreateStudentService);
  });

  it('throws ConflictException when admission_no is already taken', async () => {
    mockRepo.findByAdmissionNo.mockResolvedValue({ id: 'existing-id' } as any);
    await expect(service.create('school-id', 'actor-id', mockDto)).rejects.toThrow(ConflictException);
  });

  it('creates student and emits domain event', async () => {
    mockRepo.findByAdmissionNo.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue({ id: 'new-id', ...mockDto } as any);
    const result = await service.create('school-id', 'actor-id', mockDto);
    expect(result.id).toBe('new-id');
  });
});
```

### 10.3 Integration Test Example

```typescript
describe('POST /v1/students', () => {
  it('returns 201 with created student', async () => {
    const { body } = await request(app.getHttpServer())
      .post('/v1/students')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(validCreateStudentDto)
      .expect(201);

    expect(body.data.id).toBeDefined();
    expect(body.data.admission_no).toBe(validCreateStudentDto.admission_no);
  });

  it('returns 409 when admission_no is duplicate', async () => {
    await request(app.getHttpServer()).post('/v1/students').send(validCreateStudentDto);
    const { body } = await request(app.getHttpServer())
      .post('/v1/students')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(validCreateStudentDto)
      .expect(409);

    expect(body.error.code).toBe('ADMISSION_NO_CONFLICT');
  });
});
```

### 10.4 Test Data Management

- Use `@faker-js/faker` for generating test fixtures.
- Seed test DB with a `test-seed.ts` script that runs before integration test suite.
- Clean up test data after each test (use transactions or truncation strategy).
- Never use production or staging DB for tests.

---

## 11 — Security & Secret Handling

### 11.1 Secret Storage Rules

- All secrets (API keys, DB passwords, signing keys) in KMS (AWS KMS, GCP KMS) or HashiCorp Vault.
- **Zero secrets in:**
  - Source code
  - Git history
  - `.env` files committed to repo
  - Log files
  - Sentry payloads
- `.env.sample` provides key names with placeholder values for local developer setup.

### 11.2 Environment Variable Validation

Use a validation schema at app startup to catch missing required config early:

```typescript
// config/env.validation.ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  REDIS_URL: z.string().url(),
  FIREBASE_PROJECT_ID: z.string(),
  NODE_ENV: z.enum(['development', 'staging', 'production']),
});

export const env = envSchema.parse(process.env);
```

### 11.3 Static Secret Scanning in CI

- `gitleaks` or `trufflehog` scans every PR for secret patterns.
- Pre-commit hook with `git-secrets` for local enforcement.
- CI pipeline fails immediately if any secret pattern is detected.

---

## 12 — CI/CD & Linting Rules

### 12.1 CI Pipeline (Every PR)

```
1. lint          → ESLint + Prettier check
2. typecheck     → tsc --noEmit
3. unit-tests    → Jest (unit tests only)
4. build         → Ensure production build succeeds
5. route-md-lint → Verify route.md exists in every endpoint folder
6. migration-check → Verify no uncommitted migration changes
7. secret-scan   → gitleaks scan
8. [staging only] integration-tests → Jest + Supertest
9. [staging only] e2e             → Playwright
```

### 12.2 ESLint Config Highlights

```json
{
  "extends": ["@typescript-eslint/recommended", "plugin:import/recommended"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "no-console": "error",              // Use logger, not console.log
    "import/order": ["error", { "groups": [...] }],
    "no-process-env": "error"           // Always use config service, not process.env directly
  }
}
```

### 12.3 Deployment

| Environment | Frontend | Backend |
|---|---|---|
| Preview (PR) | Vercel (automatic) | — (skipped) |
| Staging | Vercel (automatic on main) | Docker container on Railway/DO (automatic) |
| Production | Vercel (manual promote) | Docker container (manual promote) |

- Zero-downtime deploys via rolling update strategy on backend.
- Database migrations run separately before deploying new backend version.
- Rollback plan: previous Docker image tag retained; deploy previous tag if needed.

---

## 13 — Commit & PR Guidelines

### 13.1 Conventional Commits

Format: `<type>(<scope>): <description>`

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Build, tooling, dependency updates |
| `docs` | Documentation only |
| `refactor` | Code restructure (no feature, no fix) |
| `test` | Adding or updating tests |
| `perf` | Performance improvements |
| `ci` | CI/CD config changes |

**Examples:**
```
feat(students): add bulk import endpoint
fix(auth): handle refresh token race condition on concurrent requests
chore(deps): update NestJS to 10.3.2
docs(api): add route.md for create-fee-invoice endpoint
```

### 13.2 PR Rules

- Every PR must be linked to a task/ticket in the project tracker.
- All CI checks must pass before review.
- Minimum 1 approved review before merge.
- PR scope: focused on a single feature or fix. Large PRs are split.
- Draft PRs allowed for work-in-progress (not mergeable).
- Delete branch after merge.

### 13.3 Changelogs

- Changelogs generated from Conventional Commit messages using `conventional-changelog`.
- Released with each version tag.

---

## 14 — Generated Code Conventions (AI Constraints)

When AI tools (Copilot, Claude, etc.) generate code for SchoolOS, the output **must** conform to all rules above. Additional constraints specific to AI-generated code:

### Non-Negotiable Rules for Generated Code

1. **Every generated endpoint must include a `route.md` file** — no exceptions. The route.md must have all required sections filled in.

2. **Every generated service must include a unit test scaffold** with at minimum:
   - One happy-path test case.
   - One test for each major error case (`NotFoundException`, `ConflictException`, etc.).

3. **Every generated endpoint must have DTOs** — request and response, with full `class-validator` decorators.

4. **No hardcoded values:**
   - No hardcoded school IDs, user IDs, or UUIDs.
   - No hardcoded API keys, tokens, or secrets.
   - No hardcoded URLs (use config service).

5. **No `any` types** — generated code must be fully typed.

6. **No raw SQL** in generated services or repositories (TypeORM QueryBuilder only).

7. **All generated entities must include `school_id`, `created_at`, `updated_at`, `deleted_at`** unless there is an explicitly documented reason not to.

8. **Generated code must follow the folder-per-endpoint structure exactly** — no deviation.

9. **Comments must be meaningful** — no placeholder comments like `// TODO: implement` in generated code that is being submitted for review.

10. **Audit logging and domain event emission must be present** in every generated service that creates, updates, or deletes a resource.
