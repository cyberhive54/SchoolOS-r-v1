# gaps-issues-fixed.md

> **SchoolOS — Architecture Issues, Gaps & Resolutions**
> Single source of truth for all audit findings, decisions, and implementation rules.
> All engineers and AI agents must follow the resolutions defined here.

---

## Status Legend

| Status | Meaning |
|---|---|
| ✅ RESOLVED | Decision made and fully documented |
| 🔧 IMPL REQUIRED | Decision made; system implementation pending |
| 📄 DOC REQUIRED | Decision made; documentation update pending |

---

## Section 1 — Critical Architecture Issues

---

### A1 — Access Token Lifecycle (SSR Conflict)

**Problem:** Architecture specifies access token in JS memory + refresh token in HttpOnly cookie. Next.js App Router server components cannot access client memory, breaking SSR authentication.

**Resolution:** Hybrid token propagation model.

| Token | Client Storage | Server (SSR) Access |
|---|---|---|
| Access Token | JS memory | Short-lived HttpOnly access cookie |
| Refresh Token | Secure HttpOnly cookie | Refresh token table |

**Flow:**
- Login → server issues: `access_token` (JS memory) + `refresh_token` cookie + `short_access_cookie`
- SSR requests → read `short_access_cookie`
- Client requests → `Authorization: Bearer <access_token>`
- Refresh → rotates all three: refresh token, access token, short access cookie

**Status:** ✅ RESOLVED

---

### A2 — RLS Index Performance

**Problem:** RLS policies cause slow queries if composite indexes don't start with `school_id`.

**Resolution:** Hard rule — all composite indexes must place `school_id` first.

```sql
-- ✅ Correct
CREATE INDEX ON students (school_id, class_id);
CREATE INDEX ON students (school_id, admission_no);

-- ❌ Forbidden
CREATE INDEX ON students (class_id, school_id);
```

**Enforcement:** Migration linter rejects any index on a tenant table that doesn't lead with `school_id`.

**Status:** 🔧 IMPL REQUIRED

---

## Section 2 — Missing Core Platform Capabilities

---

### B1 — Machine-to-Machine (API Key) Authentication

**Problem:** Only browser/mobile auth exists. External systems (biometric attendance, accounting software, payment reconciliation, government reporting) have no integration path.

**Resolution:** API Key authentication layer.

```
Format:  scos_live_<random_hex>
Header:  Authorization: Bearer scos_live_XXXX
Storage: api_keys table — store key_hash only, never plaintext
```

**DB Schema:**
```sql
CREATE TABLE api_keys (
  id         UUID PRIMARY KEY,
  school_id  UUID NOT NULL,
  name       TEXT NOT NULL,
  key_hash   TEXT NOT NULL UNIQUE,
  scopes     TEXT[] NOT NULL,   -- e.g. ['students.read', 'attendance.write']
  last_used  TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Scope format:** `{module}.{action}` — e.g. `students.read`, `fees.read`, `attendance.write`
**Key rotation:** Available via Super Admin UI. Old key revoked after new key validated.

**Status:** 🔧 IMPL REQUIRED

---

### B2 — Database Backup & Recovery

**Problem:** No backup plan, RPO/RTO targets, or restore testing process defined.

**Resolution:**

| Layer | Frequency | Retention |
|---|---|---|
| WAL archive | Continuous | 7 days |
| Incremental | Hourly | 48 hours |
| Full snapshot | Daily | 30 days |
| Weekly snapshot | Weekly | 90 days |
| Monthly archive | Monthly | 1 year |

```
Storage:  s3://schoolos-backups/{env}/{date}/
RPO:      1 hour
RTO:      4 hours
Restore drill: Quarterly (automated test restore to isolated environment)
```

**Status:** 🔧 IMPL REQUIRED

---

### B3 — GDPR / Data Privacy Framework

**Problem:** Platform stores sensitive student PII with no privacy architecture, data residency options, or subject rights implementation.

**Resolution:**

**Data subject rights:**

| Right | Implementation |
|---|---|
| Access | `POST /v1/privacy/export-data` → JSON/ZIP |
| Erasure | `DELETE /v1/privacy/erase-user` |
| Rectification | Existing update APIs |
| Portability | Full JSON export during grace period |

**Retention rules:**

| Data | Retention |
|---|---|
| OTP logs | 30 days |
| Audit logs | 90 days hot → indefinite cold archive |
| Financial records | 7 years |
| Student records | Until school cancellation + 90-day grace |

**Data residency:** Enterprise tier option — India / EU / US region DB placement.
**Sub-processors:** Firebase, MSG91, SES/SendGrid/Mailgun documented in DPA appendix.

**Status:** 📄 DOC REQUIRED

---

### B4 — Outbound Webhooks

**Problem:** Only inbound webhooks (payment gateways, SMS providers) exist. Schools cannot push events to external systems.

**Resolution:**

```
Registration: POST /v1/integrations/webhooks
Signature:    X-SchoolOS-Signature: sha256=HMAC_SHA256(secret, payload)
```

**Retry policy:**

| Attempt | Delay |
|---|---|
| 1 | Immediate |
| 2 | 1 min |
| 3 | 5 min |
| 4 | 30 min |
| 5 | 2 hours |

After 5 failures → webhook marked `disabled`; admin alerted.
Delivery log visible in Super Admin panel (last 500 deliveries, 30-day retention).

**Example events:** `fees.payment_received`, `student.created`, `attendance.marked`, `report.ready`

**Status:** 🔧 IMPL REQUIRED

---

### B5 — Multi-Language / i18n

**Problem:** No internationalization strategy for UI, notifications, or report templates.

**Resolution:**

```
Library:   react-i18next (frontend), i18next (backend templates)
MVP langs: English (en), Hindi (hi)
Future:    Arabic (ar), Spanish (es), French (fr)
Directory: /locales/{lang}/
RTL:       Theme-level flag — direction: rtl (affects layout, icons, text-align)
```

Currency and date formatting: use `Intl` API, locale derived from school config.
Notification templates: stored per school per locale; fallback to `en` if locale template missing.

**Status:** 🔧 IMPL REQUIRED

---

## Section 3 — Data Integrity Rules

---

### C1 — Soft Delete Cascade Rules

**Problem:** Soft-deleting parent records (class, student, staff) could leave orphaned or inconsistent child records.

**Resolution:**

| Parent Deleted | Child Behavior |
|---|---|
| Class | `students.class_id = NULL`, `status = unassigned` |
| Student | Invoices/payments retained; `student_status = deleted` flag added |
| Staff | Timetable assignments: `teacher_id = NULL` |
| Module disabled | Data retained; hidden from UI only |

**Hard rule — never cascade delete:**
- Financial records (invoices, payments, receipts)
- Audit logs
- Notification logs

**Status:** 📄 DOC REQUIRED

---

### C2 — Migration Rollback Strategy

**Problem:** No documented process for rolling back a bad migration in production.

**Resolution:**

- Every migration **must** implement both `up()` and `down()` — empty `down()` is rejected by CI linter.
- Rollback command: `typeorm migration:revert`
- Non-reversible migrations (column drop, data transform): use **forward-fix migration** — document in migration file header comment.
- All migrations tested against a production-copy dataset in staging before production deploy.

**Status:** 🔧 IMPL REQUIRED

---

## Section 4 — Background Jobs

---

### D1 — Job SLA & Status Visibility

**Problem:** No SLA defined; users cannot tell if a job is stuck.

**Resolution:**

| Job Type | SLA |
|---|---|
| Report card (single class) | 30 sec |
| Bulk student import | 2 min |
| Module provisioning | 1 min |
| Notification send | 10 sec |
| Bulk ZIP export | 5 min |

**Stuck threshold:** Job exceeds 3× SLA → marked `stuck`, admin alerted via notification engine.

**Job status endpoint:** `GET /v1/jobs/{job_id}`
```json
{ "data": { "job_id": "uuid", "status": "processing|queued|complete|stuck|failed", "progress": 60, "result_url": "..." } }
```

**Status:** 🔧 IMPL REQUIRED

---

## Section 5 — AI Development Governance

---

### E1 — AI Agent Run Logs

**Problem:** AI-generated work has no traceability. No way to audit what was built, changed, or broken per session.

**Resolution:** Every AI agent run must produce a compact run log file.

**Naming:** `run-{NNN}-{DDMMYYYY}-{HHMM}.md` → e.g. `run-017-07032026-2130.md`
**Location:** `/ai-runs/`

**Required format (keep under ~40 lines):**

```markdown
# run-017 | 07 Mar 2026 21:30 | @agent-name

## Task
One sentence description of what was requested.

## Completed
- bullet: what was done

## Files
- `path/to/file.ts` — created/modified/deleted

## Endpoints
- `POST /v1/students` — created

## Tests
- `create-student.service.spec.ts` — added 4 cases

## Issues
- Any deviations, blockers, or decisions made during the run

## Next
- What the next run should do (if applicable)
```

**Rules:**
- No prose, no headers beyond the template, no padding.
- Max ~40 lines. If more is needed, the run was too large — split tasks.
- Every file touched must be listed. No exceptions.

**Status:** 🔧 IMPL REQUIRED

---

## Section 6 — Additional Safeguards

---

### F1 — Feature Flag System

**Problem:** No mechanism for safe incremental rollout of new features to subsets of schools.

**Resolution:**

```sql
CREATE TABLE feature_flags (
  flag_key           TEXT PRIMARY KEY,
  enabled            BOOLEAN DEFAULT false,
  rollout_percentage INT DEFAULT 0,          -- 0–100
  school_allowlist   UUID[],                 -- explicit overrides
  description        TEXT,
  created_at         TIMESTAMPTZ DEFAULT now()
);
```

**Usage:** Check via `featureFlagService.isEnabled(flagKey, schoolId)` — evaluates: global enabled → allowlist → rollout % (deterministic hash of school_id).

**Example flags:** `attendance_v2`, `new_fee_engine`, `whatsapp_notifications`

**Status:** 🔧 IMPL REQUIRED

---

### F2 — Observability Stack

**Problem:** No defined observability tooling — metrics, tracing, or alerting strategy.

**Resolution:**

| Layer | Tool |
|---|---|
| Metrics | Prometheus + Grafana |
| Distributed tracing | OpenTelemetry → Jaeger / Tempo |
| Error tracking | Sentry (PII-scrubbed) |
| Uptime | Betteruptime / Checkly |
| Log aggregation | Loki or CloudWatch Logs |

**Minimum metrics to instrument:**

```
api_request_duration_ms   (by route, status)
db_query_duration_ms      (by query label)
queue_depth               (by queue name)
provider_latency_ms       (by provider, channel)
error_rate                (by module)
active_sessions_total     (by school)
```

**Alert thresholds:** API p95 > 500 ms, queue depth > 500, error rate > 2% in 5 min, provider failure > 5% in 15 min.

**Status:** 🔧 IMPL REQUIRED

---