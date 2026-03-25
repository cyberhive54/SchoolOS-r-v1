# platform-services.md

> **Definitions and configuration for platform-level services** that SchoolOS provides or integrates with.
> This file explains which services the SaaS owner controls, what schools can configure, and the runtime behaviors and integration rules for each service.

---

## Table of Contents

1. [Overview — Who Controls What](#1--overview--who-controls-what)
2. [Storage Provider Integration](#2--storage-provider-integration)
3. [Email Provider Options & Guidelines](#3--email-provider-options--guidelines)
4. [OTP Provider & Rules](#4--otp-provider--rules)
5. [SMS Gateway (India) — MSG91](#5--sms-gateway-india--msg91)
6. [WhatsApp API Options & Rules](#6--whatsapp-api-options--rules)
7. [Push Notifications (FCM)](#7--push-notifications-fcm)
8. [Notification Engine (Event → Channel Mapping)](#8--notification-engine)
9. [Provider Enablement, Per-School Configuration & Billing](#9--provider-enablement-per-school-configuration--billing)
10. [Monitoring & Quotas](#10--monitoring--quotas)
11. [Developer Notes & Integration Patterns](#11--developer-notes--integration-patterns)

---

## 1 — Overview — Who Controls What

### Responsibility Matrix

| Capability | SaaS Owner | School Super Admin |
|---|---|---|
| Enable/disable provider drivers | ✓ | — |
| Set global provider credentials | ✓ | — |
| Allow school-supplied credentials | ✓ (opt-in per provider) | — |
| Set hard usage quotas per school | ✓ | — |
| Choose provider from enabled list | — | ✓ |
| Configure school email/SMS templates | — | ✓ |
| Map notification events to channels | — | ✓ |
| Set per-school notification preferences | — | ✓ |
| View usage metrics for own school | — | ✓ |
| View usage metrics for all schools | ✓ | — |

### Key Principle

> The SaaS owner defines the **menu of options**. The school Super Admin makes **selections from that menu**. Schools cannot use providers that the SaaS owner has not enabled.

---

## 2 — Storage Provider Integration

### 2.1 Driver Abstraction Interface

All storage operations are routed through a common driver interface. No module should reference a specific provider SDK directly — always use the abstraction layer.

```typescript
interface StorageDriver {
  /**
   * Generate a short-lived URL for the client to upload directly.
   * Platform API never proxies file bytes.
   */
  getPresignedUploadUrl(path: string, options: UploadOptions): Promise<PresignedUrl>;

  /**
   * Generate a signed URL for the client to download a private object.
   */
  getSignedDownloadUrl(path: string, ttlSeconds: number): Promise<string>;

  /**
   * Permanently delete an object from storage.
   */
  delete(path: string): Promise<void>;

  /**
   * Retrieve object metadata (size, MIME type, custom metadata).
   */
  getMetadata(path: string): Promise<ObjectMetadata>;

  /**
   * Copy an object to another path within the same bucket/driver.
   */
  copy(sourcePath: string, destPath: string): Promise<void>;
}

interface UploadOptions {
  mimeType: string;           // e.g., 'application/pdf'
  maxSizeBytes: number;       // Hard limit enforced at presign time
  metadata?: Record<string, string>;
  expiresInSeconds?: number;  // Default: 900 (15 minutes)
}

interface PresignedUrl {
  url: string;
  fields?: Record<string, string>; // Required for S3 POST-style presign
  expiresAt: string;               // ISO 8601
}
```

### 2.2 Initial Driver: Firebase Storage

**Use cases:** Development environment and production for schools without custom provider requirements.

**Folder layout:**
```
{bucket}/schools/{school_id}/{module}/{entity}/{uuid}.{ext}
```

**Examples:**
```
schools/abc-123/admissions/documents/app-uuid.pdf
schools/abc-123/students/photos/student-uuid.jpg
schools/abc-123/examinations/uploads/marksheet-uuid.xlsx
schools/abc-123/hr/contracts/staff-uuid.pdf
```

**Firebase adapter notes:**
- Use Firebase Admin SDK server-side for presigned URL generation.
- Set appropriate Firebase Storage security rules (no public read; access only via signed URLs).
- Metadata stored in Firestore or DB, not in Firebase Storage metadata alone.

**Firebase Storage security rule pattern:**
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // All access via server-issued signed URLs only
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### 2.3 S3-Compatible Adapter

Implements the same `StorageDriver` interface for AWS S3, DigitalOcean Spaces, Cloudflare R2, and any S3-compatible provider.

- Use `PutObject` presigned URL for uploads (single-part files < 5 GB).
- Use `CreateMultipartUpload` for files > 100 MB.
- Store `ETag` and `VersionId` in file metadata DB record for integrity verification.

### 2.4 Per-School Storage Configuration

```json
{
  "school_id": "abc-123",
  "storage": {
    "provider": "firebase",
    "bucket": "schoolos-prod",
    "use_school_credentials": false,
    "quotas": {
      "total_bytes": 10737418240,
      "max_file_bytes": 26214400
    }
  }
}
```

- If `use_school_credentials: true`, the school provides a Firebase service account JSON or S3 access key. Stored encrypted in KMS.
- Quota enforcement: checked at presign time. If quota would be exceeded, return `STORAGE_QUOTA_EXCEEDED` (422).

### 2.5 File Metadata Record (DB)

```sql
CREATE TABLE file_objects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL,
  module          TEXT NOT NULL,         -- e.g., 'admissions'
  entity_type     TEXT NOT NULL,         -- e.g., 'application'
  entity_id       UUID NOT NULL,
  object_key      TEXT NOT NULL UNIQUE,  -- UUID-based storage path
  original_name   TEXT NOT NULL,
  mime_type       TEXT NOT NULL,
  size_bytes      BIGINT NOT NULL,
  provider        TEXT NOT NULL,         -- 'firebase' | 's3' | ...
  uploaded_by     UUID NOT NULL,
  uploaded_at     TIMESTAMPTZ DEFAULT now(),
  deleted_at      TIMESTAMPTZ            -- Soft delete; storage purge via job
);
```

---

## 3 — Email Provider Options & Guidelines

### 3.1 Supported Providers

| Provider | Type | Notes |
|---|---|---|
| Amazon SES | API | Low cost; high deliverability; requires domain verification |
| SendGrid | API | Good analytics; well-documented |
| Mailgun | API | Strong EU data residency options |
| Resend | API | Developer-friendly; newer provider |
| Custom SMTP | SMTP | For schools with own mail server |

### 3.2 Email Driver Interface

```typescript
interface EmailDriver {
  send(message: EmailMessage): Promise<EmailSendResult>;
  sendBulk(messages: EmailMessage[]): Promise<EmailSendResult[]>;
  verifyDomain(domain: string): Promise<DomainVerificationRecord[]>;
  getDeliveryStatus(messageId: string): Promise<DeliveryStatus>;
}

interface EmailMessage {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  from: string;           // Verified sender address
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;          // Plain-text fallback
  attachments?: Attachment[];
  tags?: string[];        // Provider-specific tagging for analytics
  metadata?: Record<string, string>;
}
```

### 3.3 Sender Identity Rules

- Each school should use a verified "from" address. Options:
  1. **Platform managed:** `noreply@schoolos.com` (available on all plans, SchoolOS branding visible).
  2. **School delegated domain:** `noreply@springfieldhs.com` (requires DNS TXT/DKIM/DMARC records). Available on paid plans.
- DKIM and DMARC records must be configured to avoid spam filtering.
- SES/SendGrid/Mailgun require domain verification before sending from a custom address.

### 3.4 Template Management

- Templates stored per school in DB, versioned.
- Template variables follow `{{variable_name}}` syntax.
- Available variables are documented per event type (e.g., `{{student_name}}`, `{{fee_amount}}`, `{{due_date}}`).
- Super Admin can preview rendered templates with sample data before saving.
- Template version history kept for 10 versions.

**Example template record:**
```json
{
  "id": "tmpl-uuid",
  "school_id": "school-uuid",
  "event_type": "fees.invoice_created",
  "channel": "email",
  "subject": "Fee Invoice for {{student_name}} — {{month}}",
  "html_body": "<p>Dear {{parent_name}}, ...</p>",
  "text_body": "Dear {{parent_name}}, ...",
  "version": 3,
  "created_by": "admin-uuid",
  "created_at": "2025-01-10T00:00:00Z"
}
```

### 3.5 Delivery & Retry Logic

- Transient errors (5xx from provider, timeout): retry with exponential backoff.
  - Attempt 1: immediate
  - Attempt 2: 1 minute
  - Attempt 3: 5 minutes
  - Attempt 4: 30 minutes
  - After 4 failures: move to DLQ, alert admin.
- Permanent errors (invalid email address, domain not found): log and surface in admin notification log. Do not retry.
- Bounce handling: integrate provider webhooks for bounce/complaint events. Suppress bounced addresses from future sends.

---

## 4 — OTP Provider & Rules

### 4.1 Email OTP (Primary)

**Flow:**
```
1. User submits credentials → first-factor check passes
2. Server generates 6-digit numeric OTP
3. OTP hashed (bcrypt/SHA-256) and stored in otp_requests table
4. OTP sent via school's email provider
5. User submits OTP on verification screen
6. Server verifies hash, checks expiry (10 min), checks not-used flag
7. On success: mark OTP as used, issue access + refresh tokens
8. On failure: increment attempt_count; lock after 5 failures
```

**OTP record schema:**
```sql
CREATE TABLE otp_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL,
  user_id       UUID NOT NULL,
  channel       TEXT NOT NULL,       -- 'email' | 'sms'
  otp_hash      TEXT NOT NULL,
  purpose       TEXT NOT NULL,       -- '2fa_login' | 'password_reset' | 'email_verify'
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  attempt_count INT DEFAULT 0,
  locked_until  TIMESTAMPTZ,
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### 4.2 SMS OTP (Optional)

- Sent via MSG91 or configured SMS provider.
- Used when: school admin has enabled SMS OTP, or user's role requires it, or email delivery is unavailable.
- Same security rules as email OTP (rate limit, hash, single-use, 10-minute expiry).

### 4.3 OTP Security Rules

| Rule | Value |
|---|---|
| OTP length | 6 digits |
| OTP expiry | 10 minutes (configurable 5–30 min by SaaS owner) |
| Max attempts before lockout | 5 |
| Lockout duration | 15 minutes |
| Rate limit: requests per account | 3 per 10 minutes |
| Rate limit: requests per IP | 10 per 10 minutes |
| Storage | Hashed in DB (never stored in plaintext) |
| Reuse | One-time use; `used_at` set on first successful verification |

### 4.4 Password Reset Flow (Uses OTP)

```
1. User submits email/phone on "Forgot Password" screen
2. System generates OTP with purpose = 'password_reset'
3. OTP sent via email (or SMS if email unavailable)
4. User submits OTP → verification → token issued
5. User sets new password with reset token
6. All existing refresh tokens for user are revoked on password change
```

---

## 5 — SMS Gateway (India) — MSG91

### 5.1 Initial Integration

MSG91 is the initial SMS provider. The adapter implements:

```typescript
interface SmsDriver {
  send(message: SmsMessage): Promise<SmsSendResult>;
  sendBulk(messages: SmsMessage[]): Promise<SmsSendResult[]>;
  sendTemplated(message: TemplatedSmsMessage): Promise<SmsSendResult>;
  handleStatusWebhook(payload: unknown): Promise<void>;
  registerTemplate(template: SmsTemplate): Promise<SmsTemplateResult>;
  getTemplateStatus(templateId: string): Promise<TemplateStatus>;
}
```

### 5.2 Legal & TRAI Compliance

All SMS sends in India are subject to TRAI (Telecom Regulatory Authority of India) regulations:

- **DLT (Distributed Ledger Technology) registration** required.
- Templates for transactional/promotional messages must be pre-approved.
- Sender ID (header) must be registered on DLT.

**Compliance requirements:**
1. SaaS owner registers on a DLT platform (Airtel, Jio, Vodafone, etc.) as the principal entity.
2. Schools register as telemarketer entities under the SaaS owner's DLT account, or SaaS owner covers all schools under a single DLT registration.
3. Each SMS template type must have a `template_id` from the DLT platform.
4. The `template_id` must be passed in every SMS API call to MSG91.

### 5.3 Template Registration Flow

1. Super Admin creates a new SMS template in the SchoolOS admin UI.
2. Platform submits template to MSG91 via API (or provides template for manual DLT submission).
3. Status is `pending_approval`.
4. MSG91 / DLT approves template (timeline: 1–3 business days typically).
5. Approved `template_id` stored in `sms_templates` table.
6. Status updated to `approved`; Super Admin notified.
7. Template is now available for use in notification mappings.

```sql
CREATE TABLE sms_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL,
  name          TEXT NOT NULL,
  body          TEXT NOT NULL,         -- Template text with {#var#} placeholders
  dlt_template_id TEXT,               -- Assigned by DLT platform on approval
  sender_id     TEXT NOT NULL,         -- Registered sender ID (6-char header)
  status        TEXT DEFAULT 'draft',  -- draft | pending_approval | approved | rejected
  category      TEXT NOT NULL,         -- transactional | promotional | otp
  rejection_reason TEXT,
  created_by    UUID NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  approved_at   TIMESTAMPTZ
);
```

### 5.4 Sending with MSG91

```typescript
// Example: Send OTP via MSG91
const result = await msg91Adapter.sendTemplated({
  to: '+919876543210',
  templateId: 'dlt_template_id_here',
  senderId: 'SCHOOL',
  variables: {
    otp: '482910',
    expiry: '10'
  }
});
```

### 5.5 SMS Cost Tracking

- Each SMS send event recorded in `sms_usage` table: `school_id`, `template_id`, `recipient`, `status`, `cost_units`, `timestamp`.
- SaaS admin dashboard shows per-school SMS usage and cost.
- Monthly usage report available for SaaS owner billing reconciliation.
- Schools receive usage alerts at 80% and 95% of their SMS quota.

---

## 6 — WhatsApp API Options & Rules

### 6.1 Supported Drivers

| Provider | Notes |
|---|---|
| Meta WhatsApp Business API | Official; requires Business Manager account; 24-hour session window |
| Twilio WhatsApp | Meta-powered; developer-friendly API; higher per-message cost |
| Gupshup | Popular in India; supports rich messages |

### 6.2 Template Message Requirements

- WhatsApp **template messages** (HSM — Highly Structured Messages) require pre-approval from Meta.
- Templates must be submitted for review per category: `UTILITY`, `MARKETING`, `AUTHENTICATION`.
- Platform provides UI to create and submit templates; approval can take hours to a few days.
- Once approved, template stored with `whatsapp_template_id`.

### 6.3 Session vs. Template Messages

| Type | When Applicable | Cost |
|---|---|---|
| Template message | Always; the only type allowed for outbound | Per message (varies by country) |
| Session message (free-form) | Only within 24-hour window after user-initiated contact | Lower cost |

### 6.4 Use Cases for WhatsApp

- Fee payment reminders (high open rates).
- Exam schedule notifications.
- Attendance alerts for parents.
- Admission status updates.
- Emergency broadcasts.

### 6.5 Opt-In Requirements

- Users must have opted in to receive WhatsApp messages.
- Opt-in captured at: parent registration, profile settings, or explicit consent screen.
- Opt-in record stored in `communication_preferences` table.
- Sending to non-opted-in numbers violates Meta's policy and can result in account suspension.

---

## 7 — Push Notifications (FCM)

### 7.1 Overview

Firebase Cloud Messaging (FCM) is used for mobile (iOS + Android) and web push notifications.

### 7.2 Device Token Registration

```typescript
// Client-side (React Native / Web)
const token = await messaging().getToken();

// POST /v1/devices/register
{
  "fcm_token": "token_here",
  "platform": "android",  // 'android' | 'ios' | 'web'
  "device_model": "Samsung Galaxy S24",
  "app_version": "2.1.0"
}
```

```sql
CREATE TABLE device_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL,
  user_id     UUID NOT NULL,
  fcm_token   TEXT NOT NULL UNIQUE,
  platform    TEXT NOT NULL,
  device_model TEXT,
  app_version TEXT,
  is_active   BOOLEAN DEFAULT true,
  last_used   TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### 7.3 Sending Push Notifications

- Notifications sent via Notification Engine (Section 8), not directly from business logic.
- FCM v1 HTTP API used (not legacy FCM API).
- Token invalidation: if FCM returns `UNREGISTERED` or `INVALID_ARGUMENT`, mark token as inactive.

### 7.4 Push Notification Payload

```json
{
  "token": "device_fcm_token",
  "notification": {
    "title": "Fee Due Reminder",
    "body": "Term 2 fees for Rahul are due on March 15."
  },
  "data": {
    "event_type": "fees.due_reminder",
    "student_id": "uuid",
    "invoice_id": "uuid",
    "deep_link": "schoolos://fees/invoice/uuid"
  },
  "android": {
    "priority": "high",
    "notification": { "sound": "default" }
  },
  "apns": {
    "payload": { "aps": { "sound": "default", "badge": 1 } }
  }
}
```

### 7.5 Fallback Strategy

- If push fails (device offline, token invalid): fall back to SMS or email based on school preference.
- Fallback configured per event type in notification settings.

---

## 8 — Notification Engine

### 8.1 Architecture

```
Event Producer  →  Event Bus (Bull Queue)  →  Router  →  Sender Workers
                                                ↓
                                       Per-school config
                                  (event → channels mapping)
                                                ↓
                                  Email | SMS | WhatsApp | Push
```

### 8.2 Event Types (Examples)

| Event Key | Description | Default Channels |
|---|---|---|
| `admissions.enquiry_received` | New enquiry submitted | Email (staff) |
| `admissions.application_approved` | Application approved | Email + Push (parent) |
| `attendance.absent_marked` | Student marked absent | SMS + Push (parent) |
| `fees.invoice_created` | New invoice generated | Email + Push (parent) |
| `fees.payment_due` | Payment due reminder | SMS + Push (parent) |
| `fees.payment_received` | Payment confirmed | Email + Push (parent) |
| `examinations.result_published` | Exam results available | Push (student + parent) |
| `communication.announcement` | School-wide announcement | Push + Email (all) |
| `auth.login_from_new_device` | Login from unrecognized device | Email (user) |
| `auth.password_changed` | Password was changed | Email (user) |

### 8.3 Router Configuration (Per School)

Super Admin configures the event → channel mapping:

```json
{
  "school_id": "abc-123",
  "notification_config": {
    "fees.payment_due": {
      "channels": ["push", "sms"],
      "sms_template_id": "tmpl-uuid",
      "push_template": "fees.due_reminder",
      "enabled": true,
      "audience": "parent"
    },
    "attendance.absent_marked": {
      "channels": ["push", "whatsapp"],
      "whatsapp_template_id": "wa-tmpl-uuid",
      "enabled": true,
      "audience": "parent"
    }
  }
}
```

### 8.4 Sender Workers

- Each channel has a dedicated Bull queue: `notifications:email`, `notifications:sms`, `notifications:push`, `notifications:whatsapp`.
- Workers are independent and can be scaled separately.
- Each worker job:
  1. Resolves template for the school + event + channel.
  2. Renders template with event payload variables.
  3. Calls the appropriate provider driver.
  4. Records send result in `notification_logs` table.
  5. On failure: retries (up to 3 times with exponential backoff), then DLQ.

### 8.5 Fallback & Retry Configuration

```json
{
  "fallback_chain": {
    "push": ["sms", "email"],
    "sms": ["email"],
    "whatsapp": ["sms", "email"],
    "email": []
  },
  "retry_policy": {
    "max_attempts": 3,
    "backoff_ms": [1000, 5000, 30000]
  }
}
```

### 8.6 Notification Logs

```sql
CREATE TABLE notification_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL,
  event_type      TEXT NOT NULL,
  channel         TEXT NOT NULL,
  recipient_id    UUID NOT NULL,
  recipient_ref   TEXT NOT NULL,  -- email address or phone number (masked in logs)
  template_id     UUID,
  provider        TEXT,
  provider_msg_id TEXT,
  status          TEXT NOT NULL,  -- 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced'
  attempts        INT DEFAULT 0,
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## 9 — Provider Enablement, Per-School Configuration & Billing

### 9.1 Provider Enablement by SaaS Owner

In `saas-backend`, SaaS owner manages a `platform_providers` table:

```sql
CREATE TABLE platform_providers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category      TEXT NOT NULL,    -- 'storage' | 'email' | 'sms' | 'whatsapp' | 'push'
  name          TEXT NOT NULL,    -- 'firebase' | 'msg91' | 'ses' | ...
  is_enabled    BOOLEAN DEFAULT false,
  config        JSONB,            -- Encrypted platform-level credentials
  allow_school_credentials BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### 9.2 School Provider Selection

Schools see only providers where `is_enabled = true`. When a school selects a provider:

1. Super Admin selects provider in settings.
2. If `allow_school_credentials = true`, admin enters school-specific credentials.
3. Credentials encrypted and stored in `school_provider_configs` table (KMS-encrypted `config` column).
4. Platform validates credentials by performing a test call to the provider API.
5. On success, provider is set as active for that category.

### 9.3 Usage Tracking

Every provider interaction records usage:
- SMS: per message
- Email: per message + per MB attachment
- WhatsApp: per template message
- Storage: GB-hours (computed daily)
- Push: per send attempt (usually free on FCM)

Usage aggregated daily per school. Accessible via SaaS admin dashboard and per-school Super Admin panel.

---

## 10 — Monitoring & Quotas

### 10.1 Provider Health Monitoring

| Metric | Alert Threshold | Action |
|---|---|---|
| Email delivery rate | < 95% success in 1 hour | Alert SaaS owner |
| SMS delivery rate | < 90% success in 1 hour | Alert SaaS owner |
| Provider API latency (p95) | > 2,000 ms | Alert SaaS owner |
| Provider API error rate | > 5% in 15 min | Alert + consider fallback |

### 10.2 Quota Enforcement

- Quotas checked **before** attempting a send.
- If quota would be exceeded:
  - Block the send and return `QUOTA_EXCEEDED` error.
  - Or (if school configured): automatically fall back to a cheaper channel.
- Warning alerts sent to Super Admin at 80% and 95% of quota.

### 10.3 Per-School Usage Dashboard

Super Admin can view:
- SMS sent this month / quota remaining.
- Emails sent this month / bounce rate.
- Storage used / quota remaining.
- WhatsApp messages sent this month.
- Notification delivery success rates per channel.

---

## 11 — Developer Notes & Integration Patterns

### 11.1 Adapter Implementation Guide

Each new provider adapter must implement the relevant interface(s) and:

1. **Map provider errors** to canonical `SchoolOsError` codes.
2. **Implement health check** method used by monitoring.
3. **Expose metrics hooks** (send count, latency, error count) for Prometheus.
4. **Handle webhooks** (delivery status callbacks) from the provider.
5. **Encrypt credentials** — never log raw credentials; use masked representations.

### 11.2 Adding a New Email Provider

1. Create `adapters/email/{provider-name}/index.ts` implementing `EmailDriver`.
2. Register the adapter in `EmailProviderFactory`.
3. Add provider to `platform_providers` seed data.
4. Add provider credentials schema to validation service.
5. Write integration tests with mocked HTTP responses.
6. Document provider setup steps in `schoolos-docs`.

### 11.3 Credential Storage Pattern

```typescript
// Encrypted storage
await kmsService.encrypt(schoolId, JSON.stringify({
  api_key: 'raw_key_here',
  api_secret: 'raw_secret_here'
}));

// Retrieval
const raw = await kmsService.decrypt(schoolId, encryptedValue);
const creds = JSON.parse(raw);
```

- Never log decrypted credentials.
- Never include credentials in error messages.
- Rotate school credentials: provide UI for Super Admin to update credentials; old credentials revoked after validation of new ones.

### 11.4 Testing Provider Integrations

Each adapter has three test layers:
1. **Unit tests** — mock the HTTP client; test error mapping and retry logic.
2. **Integration tests** — use provider sandbox/test environment where available.
3. **Smoke test** — a health-check endpoint (`POST /v1/providers/test`) that sends a test message to a configured test recipient.

### 11.5 Notification Engine Local Development

- Use `@fakesendmail` or `ethereal.email` for email in development.
- Use MSG91 test mode / sandbox for SMS.
- Use FCM test tokens for push.
- A `NOTIFICATION_SINK_ENABLED=true` env flag can route all notifications to a local log file instead of actual providers in development.
