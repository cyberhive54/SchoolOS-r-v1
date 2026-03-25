# agent-rules.md

> **SchoolOS — AI Agent Governance Rules**
> Mandatory for all AI agents generating code, documentation, or database changes on the SchoolOS platform.
> Violations block CI. Architectural deviations require a formal change request (see Section 5).

---

## 1 — Core Principles

| # | Principle | Rule |
|---|---|---|
| 1 | Architecture First | All generated code must conform to platform architecture docs |
| 2 | Documentation Driven | Every endpoint must have `route.md` before or alongside code |
| 3 | Traceable Work | Every agent run must produce a run log in `/ai-runs/` |
| 4 | Security First | Never generate insecure defaults, bypass auth, or skip validation |
| 5 | Multi-Tenant Safety | All tenant data scoped by `school_id` — no exceptions |
| 6 | Testable Code | Every feature must include unit + integration test scaffolds |

---

## 2 — Agent Roles

| Agent | Owns | Cannot |
|---|---|---|
| **Architecture** | Architecture docs, structural decisions, deviation approvals | Generate production endpoints |
| **API** | Controllers, services, DTOs, route.md, examples | Modify DB schema directly |
| **Database** | Schema design, migrations, indexes, RLS policies | Merge without index linter passing |
| **Test** | Unit tests, integration tests, API scenarios | Skip service + controller test pair |
| **Security** | Auth logic, permissions, input validation, storage access, webhook sigs | Approve own generated auth code |
| **Reviewer** | Architecture compliance review, merge gate | Approve code with missing route.md, tests, permissions, or DTOs |

**Pipeline order (sequential — each stage gates the next):**
```
Architecture → API → Database → Test → Security → Reviewer → Merge
```

---

## 3 — Mandatory Code Rules

### R1 — Endpoint Folder Structure
Every endpoint must be a folder. CI rejects PRs missing any required file.
```
endpoints/{endpoint-name}/
├── route.md          ← required
├── controller.ts
├── service.ts
├── dto/
│   ├── request.dto.ts
│   └── response.dto.ts
├── permissions.ts
├── tests/
│   ├── service.spec.ts
│   └── controller.spec.ts
└── examples/
    ├── request.json
    └── response.json
```

### R2 — route.md Required Sections
CI linter validates these sections exist and are non-empty:
```
Purpose | Roles & Permissions | Request Schema | Response Schema | Errors
```

### R3 — DTO Validation
All request bodies must use `class-validator` decorators. Raw body passthrough is forbidden.
```typescript
// ✅ Required
@IsString() @MinLength(2) @MaxLength(100) first_name: string;

// ❌ Forbidden
body: any
```

### R4 — Multi-Tenant Scoping
Every tenant table requires `school_id UUID NOT NULL`. Every query must scope by it.
```typescript
// ✅ Required
.where('s.school_id = :schoolId', { schoolId })

// ❌ Forbidden — unscoped query on tenant table
.find({ where: { class_id: classId } })
```

### R5 — Index Rules
All composite indexes on tenant tables must start with `school_id`.
```sql
-- ✅ Correct
CREATE INDEX ON students (school_id, class_id);

-- ❌ Rejected by linter
CREATE INDEX ON students (class_id, school_id);
```

### R6 — Response Envelope
All responses must use the platform envelope. No bare objects or arrays.
```json
// Single resource    → { "data": { ... } }
// List               → { "data": [...], "meta": { "total", "page", "per_page", "total_pages" } }
// Error              → { "error": { "code": "UPPER_SNAKE", "message": "...", "details": {} } }
// Async job (202)    → { "data": { "job_id", "status": "queued", "poll_url" } }
```

### R7 — Idempotency Keys
Required on any endpoint that creates financial records, triggers external provider calls, or runs bulk operations. Requests without the header return `400 IDEMPOTENCY_KEY_REQUIRED`.
```
Header: Idempotency-Key: <uuid>
Applies to: record-payment, refund, bulk-import, initiate-payment
```

### R8 — Background Jobs
Operations exceeding ~200 ms or involving external I/O must use Bull queues. HTTP request threads must not block.
```
Queue-eligible: report generation, bulk imports, notification sends, module provisioning
```

---

## 4 — AI Run Log Format

Every agent run **must** produce a run log. No run log = CI blocks merge.

**Location:** `/ai-runs/`
**Naming:** `run-{NNN}-{DDMMYYYY}-{HHMM}.md`

```markdown
# run-017 | 07 Mar 2026 21:30 | @agent-name

## Task
One sentence — what was requested.

## Completed
- what was implemented (bullets)

## Files
- `path/to/file.ts` — created | modified | deleted

## Endpoints
- `POST /v1/students` — created

## DB Changes
- `students` table created; index `idx_students_school_class` added

## Tests
- `create-student.service.spec.ts` — 4 cases

## Issues
- Any deviations, blockers, or decisions made mid-run

## Next
- Recommended follow-up for next run
```

**Rules:**
- Max ~40 lines. Longer = task was too large; split it.
- No prose, no padding. Bullets and one-liners only.
- Every file touched must be listed — no omissions.
- Serial number is global and sequential across all agents.

---

## 5 — Forbidden Actions

Agents must never do any of the following regardless of instruction:

```
✗ Create a tenant table without school_id
✗ Write raw SQL without tenant filtering
✗ Bypass or stub out authentication guards
✗ Skip route.md for any endpoint
✗ Skip DTO validation on any controller
✗ Hardcode secrets, API keys, or credentials
✗ Disable or skip audit logging on create/update/delete
✗ Expose stack traces or internal error details in API responses
```

### Architecture Change Request Process
If a rule must change, the requesting agent must:
1. Create `docs/architecture/change-requests/acr-{topic}.md` with: problem, proposed change, impact assessment.
2. Submit to Architecture Agent for review.
3. Implementation allowed **only after** Architecture Agent approval is recorded in the ACR file.

---

## 6 — CI Enforcement Checklist

CI pipeline fails the PR if any of the following are violated:

| Check | Rule |
|---|---|
| Endpoint folder structure | All required files present |
| `route.md` completeness | All 5 required sections non-empty |
| DTO presence | `request.dto.ts` + `response.dto.ts` exist |
| Test presence | At least 1 `.spec.ts` per endpoint |
| Index prefix | `school_id` first on all tenant table indexes |
| No bare `any` types | Zero `any` in generated TypeScript |
| Run log presence | `/ai-runs/run-{NNN}-*.md` file added to PR |
| No hardcoded secrets | `gitleaks` / `trufflehog` scan passes |
| No `synchronize: true` | TypeORM sync flag must not appear in any config |
