# Phase 8B — AI Copilot / Agent (Module 37)

## What & Why

The AI Copilot extends the AI Assistant (Module 36) with **write capability** — it can make real changes to the system on behalf of the logged-in user. It is a full AI Agent with tool-calling over every SchoolOS API endpoint the user has permission to access.

The Copilot uses the same chat interface as the Assistant, but unlocks action tools: mark attendance, create leave requests, send fee reminders, enroll students, update records, and more. Every write action requires **explicit user confirmation** before execution — the AI shows a precise preview of what it is about to do, and the user must confirm or cancel.

The Copilot uses the **logged-in user's JWT token** for every API call, meaning the existing PBAC system enforces all permissions automatically. The Copilot cannot do anything the user cannot do themselves — it is a faster, natural-language interface to the same capabilities, not an escalation of privilege.

**Key design principles:**
1. **Show before doing** — the AI always presents a human-readable preview of the exact action with all parameters before executing.
2. **Audit every action** — every Copilot-executed write is tagged `ai_initiated: true` and `confirmed_by_user: true` in the audit log, alongside the user's ID. Admins can always distinguish AI actions from manual ones.
3. **Never guess** — if the user's intent is ambiguous, the Copilot asks for clarification before proceeding. It never assumes and acts.
4. **Async-aware** — for operations that go to a BullMQ queue (bulk promotion, bulk import, data export), the Copilot tracks job status and streams progress updates until completion.
5. **Graceful failure** — every API error is translated into a human-readable explanation with an actionable next step. The Copilot never silently fails.

## Done looks like
- Users can instruct the Copilot in plain language to perform any action they are permitted to do — "Mark Class 10-A absent today", "Create a leave request for Rajesh Sharma for next Monday", "Send fee reminders to all defaulters in Class 9".
- Before every write, the Copilot shows a structured confirmation card with the exact action, affected records count, and any irreversibility warnings.
- Bulk operations show a live progress tracker in the chat as the BullMQ job executes.
- All API errors are translated into clear, actionable human language — no raw JSON ever shown to the user.
- Partial success on bulk operations is reported clearly: "23 of 25 updated. 2 failed: [list with reasons]. Want me to retry?"
- Every Copilot-executed action appears in the school's audit log tagged as AI-initiated with the acting user's ID.
- Admins can view an AI Action Log — a filtered view of all AI-initiated changes across the school.
- School admin can configure which modules the Copilot can write to, and can disable write access per user while keeping read (Assistant) access.
- Rate limits prevent runaway usage: max 10 write actions per user per hour, max 3 bulk operations per user per day.
- Sensitive/irreversible endpoints (delete academic year, bulk delete students, user role changes) are permanently blocked from the Copilot tool list regardless of user role.

## Out of scope
- Copilot accessing data or taking actions beyond the current user's permissions — PBAC always enforced via JWT.
- Platform-level actions (school onboarding, subscription management, impersonation) — never exposed as Copilot tools.
- Scheduled / automated actions without user being present in session — the Copilot is always user-initiated and real-time; no autonomous background agents.
- Integration with external systems (WhatsApp sending, Razorpay payment collection) beyond what SchoolOS API already exposes.
- Fine-tuning or training an ML model — all intelligence is prompt-engineered via the hosted LLM API.
- Voice commands — text only.

## Tasks

1. **DB migration 047 — AI Copilot tables**
   Create the following tables using raw SQL via `queryRunner.query()`:
   - `ai_pending_actions`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES users(id), action_type VARCHAR(100) NOT NULL, action_label VARCHAR(300) NOT NULL, http_method VARCHAR(10) NOT NULL CHECK (http_method IN ('POST','PATCH','PUT','DELETE')), endpoint_path VARCHAR(500) NOT NULL, request_body JSONB NOT NULL DEFAULT '{}', affected_record_count INT NOT NULL DEFAULT 1, is_bulk BOOLEAN NOT NULL DEFAULT false, is_reversible BOOLEAN NOT NULL DEFAULT true, reversibility_note TEXT NULL, status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','executing','completed','failed','partially_completed')), confirmed_at TIMESTAMPTZ NULL, cancelled_at TIMESTAMPTZ NULL, executed_at TIMESTAMPTZ NULL, completed_at TIMESTAMPTZ NULL, job_id VARCHAR(200) NULL, job_progress INT NULL DEFAULT 0, result_summary JSONB NULL DEFAULT '{}', error_details JSONB NULL DEFAULT '{}', expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL ''10 minutes''), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Indexes: `(school_id, user_id, status)`, `(school_id, conversation_id)`, `(school_id, status, expires_at)`.
   - `ai_action_log`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, pending_action_id UUID NOT NULL REFERENCES ai_pending_actions(id), user_id UUID NOT NULL REFERENCES users(id), action_type VARCHAR(100) NOT NULL, action_label VARCHAR(300) NOT NULL, endpoint_path VARCHAR(500) NOT NULL, request_body JSONB NOT NULL DEFAULT '{}', http_status INT NULL, response_summary JSONB NULL DEFAULT '{}', affected_record_ids UUID[] NOT NULL DEFAULT '{}', affected_record_count INT NOT NULL DEFAULT 0, failed_record_count INT NOT NULL DEFAULT 0, failure_details JSONB NULL DEFAULT '[]', job_id VARCHAR(200) NULL, final_status VARCHAR(20) NOT NULL CHECK (final_status IN ('success','failed','partial')), duration_ms INT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Indexes: `(school_id, user_id, created_at)`, `(school_id, action_type, created_at)`.
   - `ai_copilot_configs`: `(id UUID PK DEFAULT gen_random_uuid(), school_id UUID NOT NULL, user_id UUID NULL REFERENCES users(id), config_level VARCHAR(20) NOT NULL DEFAULT 'school' CHECK (config_level IN ('school','user')), copilot_enabled BOOLEAN NOT NULL DEFAULT true, allowed_modules TEXT[] NOT NULL DEFAULT '{}', blocked_action_types TEXT[] NOT NULL DEFAULT '{}', max_write_actions_per_hour INT NOT NULL DEFAULT 10, max_bulk_ops_per_day INT NOT NULL DEFAULT 3, require_double_confirm_for_bulk BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Unique: `(school_id, user_id)` (null user_id = school-level default). Index: `(school_id, config_level)`.
   All indexes start with `school_id` as first column.

2. **NestJS module — `AiCopilotModule`**
   Extends `AiAssistantModule`. Additional services: `AiCopilotService` (orchestrates write-action flow), `AiToolRegistryService` (builds the full tool list — read + write — filtered by user permissions and school copilot config), `AiActionConfirmationService` (manages pending action lifecycle and expiry), `AiJobTrackerService` (polls BullMQ job endpoints and streams progress updates via SSE), `AiErrorTranslatorService` (maps API error codes to human-readable messages with actionable guidance). Import: all modules whose write endpoints are exposed as tools. Register in `AppModule`.

3. **Write tool definitions — `AiToolRegistryService`**
   All write-capable tools follow the same pattern: method, path, body schema, description, permission required, confirmation_level (1=single, 2=bulk/double), is_reversible flag, irreversibility_note. Permanently blocked tools (hardcoded exclusion list regardless of user role):
   - Any DELETE on `academic_years`, `schools`, `users`, `subscription_plans`
   - `POST /academics/years/:id/close` (academic year close)
   - `DELETE /students/:id` when more than 1 record at a time
   - Any endpoint under `/platform/` prefix

   **Write tool list (permission-filtered at session init):**
   - `mark_attendance_bulk` → `POST /v1/attendance/bulk-mark`; confirmation_level: 2 if >10 students; requires `attendance.attendance.mark`; reversible: yes (can re-mark)
   - `mark_hr_attendance_bulk` → `POST /v1/hr/attendance/bulk-mark`; confirmation_level: 2 if >5 staff; requires `hr.attendance.mark`
   - `create_leave_request` → `POST /v1/hr/leave-requests`; confirmation_level: 1; requires `hr.leave.request`; reversible: yes (can cancel)
   - `approve_leave_request` → `POST /v1/hr/leave-requests/:id/approve`; confirmation_level: 1; requires `hr.leave.approve`; reversible: no (note: "Approvals cannot be reversed")
   - `reject_leave_request` → `POST /v1/hr/leave-requests/:id/reject`; confirmation_level: 1; requires `hr.leave.approve`
   - `cancel_leave_request` → `POST /v1/hr/leave-requests/:id/cancel`; confirmation_level: 1; requires `hr.leave.request`
   - `create_student` → `POST /v1/students`; confirmation_level: 1; requires `students.profile.create`
   - `update_student` → `PATCH /v1/students/:id`; confirmation_level: 1; requires `students.profile.update`
   - `enroll_student` → `POST /v1/students/:studentId/enrollments`; confirmation_level: 1; requires `students.enrollment.manage`
   - `bulk_promote_students` → `POST /v1/academics/promotions`; confirmation_level: 2; requires `academics.promotion.manage`; reversible: no; is_async: true (returns job_id)
   - `create_fee_invoice` → `POST /v1/fees/invoices`; confirmation_level: 1; requires `fees.invoice.create`
   - `record_fee_payment` → `POST /v1/fees/payments`; confirmation_level: 1; requires `fees.payment.record`
   - `send_fee_reminder` → `POST /v1/communication/send` with preset fee-reminder template; confirmation_level: 2 (bulk); requires `communication.message.send`
   - `create_homework` → `POST /v1/homework`; confirmation_level: 1; requires `homework.create` (Phase 2 dependency)
   - `create_leave_allocation_bulk` → `POST /v1/hr/leave-allocations/bulk`; confirmation_level: 2; requires `hr.leave.manage_allocations`
   - `create_announcement` → `POST /v1/communication/notices`; confirmation_level: 1; requires `communication.notice.post`

4. **Action flow — `AiCopilotService`**
   The complete lifecycle of a Copilot write action:
   - **Step 1 — Intent detection**: LLM processes user message using write tools in its tool list. Identifies action(s) needed. Calls retrieval tools first if entity lookup is needed (e.g., find student ID from name).
   - **Step 2 — Disambiguation**: If the entity is ambiguous (multiple students named "Rahul"), the LLM streams a disambiguation question with selectable options. Writes nothing until entity is confirmed.
   - **Step 3 — Preview generation**: LLM constructs the exact API payload. Calls `create_pending_action` endpoint which stores the action in `ai_pending_actions` with status `pending` and 10-minute expiry. LLM renders a structured confirmation card (see Frontend task).
   - **Step 4 — User confirmation**: User clicks "Confirm" or "Cancel" button (not a text reply — UI buttons always). Confirmation calls `POST /v1/ai/actions/:id/confirm`. Cancellation calls `POST /v1/ai/actions/:id/cancel`. If 10 minutes elapse without action, `AiActionConfirmationService` expires the pending action.
   - **Step 5 — Execution**: `AiCopilotService` calls the actual SchoolOS endpoint using the user's JWT. For sync endpoints: executes and collects response. For async endpoints (BullMQ jobs): gets job_id, stores in `ai_pending_actions.job_id`, begins polling via `AiJobTrackerService`.
   - **Step 6 — Result streaming**: Streams success, partial success, or failure back to chat. Writes final record to `ai_action_log`. Updates `ai_pending_actions.status` to `completed`, `partially_completed`, or `failed`.

5. **Async job tracker — `AiJobTrackerService`**
   For async Copilot actions (bulk promotion, bulk import, data export). After execution starts:
   - Polls the relevant job status endpoint every 3 seconds using a NestJS `setInterval` tied to the user's SSE connection.
   - Streams `{ type: 'job_progress', job_id, percent, message }` events: "Processing... 45% complete (140 / 312 students)."
   - On completion: streams `{ type: 'job_done', result_summary }` with full breakdown.
   - On failure: streams `{ type: 'job_failed', error, partial_results }` with which records failed and why.
   - If SSE connection drops mid-job: stores last known progress in `ai_pending_actions.job_progress`. When user reconnects, resumes streaming from last known state.
   - Timeout: if job has not completed in 10 minutes, streams a warning: "This is taking longer than expected. Job ID: {id}. You can check status later under Tools → Background Jobs."

6. **Error translator — `AiErrorTranslatorService`**
   Maps every API error response to a human-readable message with next steps:
   - `VALIDATION_ERROR` → "I couldn't do that — [field_name] is invalid: [error_detail]. [Specific fix instruction]. Want me to try again with the corrected value?"
   - `FORBIDDEN` → "You don't have permission to [action_label]. This requires the [permission_name] permission. Contact your administrator if you need access."
   - `NOT_FOUND` → "I couldn't find [entity_type] '[searched_value]'. They may have been deleted or transferred. Want me to search for similar records?"
   - `CONFLICT` → "This already exists — [duplicate_field]: [value]. Would you like to update the existing record instead?"
   - `BUSINESS_RULE_VIOLATION` → "This action isn't allowed: [api_reason]. [Contextual explanation]. [Suggested alternative action]."
   - `MISSING_IDEMPOTENCY_KEY` → Handled internally — copilot auto-generates a UUID idempotency key for all async endpoints.
   - 5xx / network timeout → "Something went wrong. Retrying once..." → auto-retry once → if second attempt fails: "Still failing. Please try again in a moment. Reference: ERR-[timestamp]. No changes were made."
   - Partial bulk failure → "Completed with some issues — [success_count] of [total_count] records updated. [failure_count] failed: [list with per-record reasons]. Want me to retry the failed ones?"

7. **Copilot action endpoints**
   - `POST /v1/ai/actions` — create a pending action (called internally by LLM flow, not directly by frontend); body: `{ conversation_id, action_type, action_label, http_method, endpoint_path, request_body, affected_record_count, is_bulk, is_reversible, reversibility_note }`; returns pending action object with 10-min expiry; permission: `ai.copilot.use`.
   - `POST /v1/ai/actions/:id/confirm` — user confirms; triggers execution; returns immediately with `{ status: 'executing' }` for async jobs or `{ status: 'completed', result }` for sync; permission: `ai.copilot.use`.
   - `POST /v1/ai/actions/:id/cancel` — user cancels; sets status to `cancelled`; permission: `ai.copilot.use`.
   - `GET /v1/ai/actions/:id/status` — poll status for async jobs; returns `{ status, job_progress, result_summary }`; permission: `ai.copilot.use`.
   - `GET /v1/ai/action-log` — admin view of all AI-initiated write actions; filters: `user_id`, `action_type`, `final_status`, `date_from`, `date_to`; paginated; permission: `ai.admin.view_logs`.
   - `GET /v1/ai/copilot-config` — get school-level or user-level copilot config; permission: `ai.copilot.use`.
   - `PATCH /v1/ai/copilot-config` — update school-level config (allowed modules, rate limits); permission: `admin.module.manage`.
   - `PATCH /v1/ai/users/:userId/copilot-config` — toggle copilot on/off for specific user, set their rate limits; permission: `admin.user.manage`.

8. **Rate limiting and quota enforcement**
   `AiCopilotService` checks before every write execution (not at confirmation):
   - User write actions this hour: if `>= max_write_actions_per_hour` (default: 10) → reject with "You've reached the write limit for this hour (10 actions). Resets at [time]. You can still use the AI Assistant for read queries."
   - User bulk operations today: if `>= max_bulk_ops_per_day` (default: 3) → reject with "You've reached the bulk operation limit for today (3). Resets at midnight. Individual actions are still available."
   - School monthly token budget: if over plan limit → notify admin in the AI panel but don't block user mid-conversation (grace period of 10% overage before hard block).
   - Rate limit counters stored in Redis with TTL (hourly counter: 1h TTL, daily counter: midnight reset, monthly: 30d TTL per school).

9. **Permissions**
   Keys: `ai.copilot.use` (use write tools, confirm actions), `ai.copilot.bulk` (trigger bulk operations — separate because higher risk), `ai.admin.view_logs` (view AI action log), `ai.admin.manage_copilot` (configure copilot access per user). Default role grants: `admin`, `principal` get `ai.copilot.use` + `ai.copilot.bulk`. `teacher`, `accountant` get `ai.copilot.use` only (no bulk). `receptionist` gets `ai.copilot.use` scoped to admissions tools. Parents and students: no Copilot access at all. Add all keys to `backend/src/config/permissions.ts`.

10. **Frontend — Confirmation card component**
    The most critical UI component in the Copilot. When the AI is ready to act, it renders a structured card inside the chat thread — not a modal, not a toast:

    ```
    ┌─────────────────────────────────────────┐
    │ 🔧 Action Preview                        │
    │─────────────────────────────────────────│
    │ Mark attendance — Class 10-A            │
    │                                         │
    │  Date:      25 Mar 2026 (today)         │
    │  Status:    Absent                      │
    │  Students:  34 students affected        │
    │                                         │
    │  ⚠️ This can be corrected by re-marking │
    │                                         │
    │  [Cancel]              [Confirm ✓]      │
    └─────────────────────────────────────────┘
    ```
    For bulk/irreversible operations, confirmation_level 2 renders an additional warning stripe and requires the user to type "CONFIRM" in the input field instead of clicking a button. The card expires and greys out after 10 minutes if not acted on ("This action expired — ask me again if you'd like to proceed."). Cancel and Confirm are always rendered as UI buttons, never as plain text responses.

11. **Frontend — Async job progress card**
    When a BullMQ job is in progress, the confirmation card transitions to a progress card in-place:

    ```
    ┌─────────────────────────────────────────┐
    │ ⏳ Promotion in progress                 │
    │─────────────────────────────────────────│
    │  ████████████░░░░░░░░░░   58%           │
    │  182 / 312 students promoted            │
    │                                         │
    │  Job ID: prm_9f3a...                    │
    │  Started: 2:34 PM                       │
    └─────────────────────────────────────────┘
    ```
    On completion, transitions to a result card: green (full success), amber (partial), red (failed). Result card shows breakdown and a "Retry failed records" button if applicable.

12. **Frontend — AI Action Log page** (`/dashboard/settings/ai/action-log`)
    Full-page admin view. Table: timestamp, user name + role, action label, affected records count, final status badge (Success / Partial / Failed), duration. Click row → detail drawer: full request body, response summary, per-record failure list, job ID (if async). Filters: date range, user, action type, status. Export CSV. Empty state: "No AI actions recorded yet — the Copilot has not been used to make changes."

13. **Frontend — Copilot config panel** (extension of `/dashboard/settings/ai`)
    New "Copilot" tab added to existing AI settings page:
    - **School-level**: Enable/disable Copilot toggle. Module access checklist (which modules Copilot can write to). Rate limit settings (write actions/hour, bulk ops/day). Double-confirm for bulk toggle.
    - **Per-user overrides table**: User name, role, Copilot enabled toggle, custom rate limits (edit inline). "Reset to school defaults" button per user.

14. **Seed data**
    One `ai_copilot_configs` record at school level (copilot_enabled: true, all modules allowed, defaults: 10 writes/hour, 3 bulk/day, double-confirm for bulk: true). No `ai_action_log` entries at seed — starts empty as expected.

## Relevant files
- `backend/src/modules/ai-copilot/` — full module (extends ai-assistant)
- `backend/src/modules/ai-copilot/services/ai-copilot.service.ts`
- `backend/src/modules/ai-copilot/services/ai-tool-registry.service.ts`
- `backend/src/modules/ai-copilot/services/ai-action-confirmation.service.ts`
- `backend/src/modules/ai-copilot/services/ai-job-tracker.service.ts`
- `backend/src/modules/ai-copilot/services/ai-error-translator.service.ts`
- `backend/src/modules/ai-copilot/endpoints/actions/controller.ts`
- `backend/src/modules/ai-copilot/endpoints/action-log/controller.ts`
- `backend/src/modules/ai-copilot/endpoints/copilot-config/controller.ts`
- `backend/src/database/migrations/047-ai-copilot.ts`
- `backend/src/config/permissions.ts` — add `ai.copilot.*` keys
- `frontend/src/components/ai/ConfirmationCard.tsx`
- `frontend/src/components/ai/JobProgressCard.tsx`
- `frontend/src/components/ai/ResultCard.tsx`
- `frontend/src/app/dashboard/settings/ai/action-log/page.tsx`
- `frontend/src/app/dashboard/settings/ai/page.tsx` — add Copilot config tab
