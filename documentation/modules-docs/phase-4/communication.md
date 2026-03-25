# Phase 4 — Communication System (Module 11)

## What & Why
The Communication System is SchoolOS's multi-channel outbound and inbound communication hub. It replaces paper circulars, manual WhatsApp messages, and uncoordinated SMS campaigns with a structured, compliant, and logged system. For Indian K-12 schools, daily communication with parents regarding attendance, fees, exams, and events is critical. This module ensures TRAI/DLT compliance for SMS and Meta's template requirements for WhatsApp, providing a single source of truth for all school-to-home interactions.

## Done looks like
- Notice Board: Staff can post and pin announcements with attachments, targeted by audience (All, Students, Parents, Staff, or specific Class-Sections).
- Circulars: Formal digital circulars with unique numbering and PDF attachments can be drafted, approved, and broadcasted via multi-channel (SMS, WhatsApp, Email, Push).
- Message Templates: Centralized management of pre-approved templates for different channels, supporting variable interpolation (e.g., {{student_name}}).
- Direct Messaging: Secure, thread-based communication between parents, teachers, and admins with read receipts.
- Bulk Announcements: Ability to send ad-hoc messages to specific groups or individual users with opt-out list validation and idempotency.
- TRAI/DLT Compliance: Support for DLT Template IDs and Sender IDs required for Indian SMS gateways.
- Delivery Tracking: Comprehensive logs for every message sent, including status (Sent, Delivered, Read, Failed) and error reporting.
- Real-time Feed: A personalized notification feed for students and parents showing relevant notices and circulars.
- Opt-out Management: Automated handling of "Do Not Disturb" requests for SMS to maintain compliance.
- Thread-based UI: Modern chat interface for direct messages with real-time updates and attachment support.

## Out of scope
- Social media integration (Facebook/Instagram posting).
- Video calling within the chat interface (handled by Live Classes module).
- Public website CMS (handled by the CMS module).
- External marketing campaigns to non-school users.
- Physical printing services for circulars.

## Tasks

1. **DB migration — communication core tables** — Create migration `035-communication.ts` with:
   - `notice_board_posts`: `(id UUID PK, school_id UUID NOT NULL, title VARCHAR(400) NOT NULL, body TEXT NOT NULL, post_type ENUM('general','academic','exam','event','holiday','fee','emergency','other') NOT NULL DEFAULT 'general', target_audience ENUM('all','students','parents','staff','class_specific') NOT NULL DEFAULT 'all', target_class_section_ids UUID[] NULL, is_pinned BOOLEAN DEFAULT false, pin_expires_at TIMESTAMPTZ NULL, attachment_urls TEXT[] NULL, is_published BOOLEAN DEFAULT false, published_at TIMESTAMPTZ NULL, expires_at TIMESTAMPTZ NULL, view_count INT DEFAULT 0, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), deleted_at TIMESTAMPTZ NULL)`.
     - Index: `(school_id, is_published, published_at)`, `(school_id, target_audience)`, `(school_id, is_pinned)`.
   - `circulars`: `(id UUID PK, school_id UUID NOT NULL, circular_number VARCHAR(50) NOT NULL, academic_year_id UUID NOT NULL FK academic_years, title VARCHAR(400) NOT NULL, body TEXT NOT NULL, circular_date DATE NOT NULL DEFAULT CURRENT_DATE, target_audience ENUM('all','students','parents','staff','class_specific') DEFAULT 'all', target_class_section_ids UUID[] NULL, pdf_url TEXT NULL, is_published BOOLEAN DEFAULT false, published_at TIMESTAMPTZ NULL, send_via_whatsapp BOOLEAN DEFAULT false, send_via_sms BOOLEAN DEFAULT false, send_via_email BOOLEAN DEFAULT false, send_via_push BOOLEAN DEFAULT false, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Unique: `(school_id, circular_number, academic_year_id)`. Index: `(school_id, academic_year_id, is_published)`.
   - `message_templates`: `(id UUID PK, school_id UUID NOT NULL, template_name VARCHAR(200) NOT NULL, channel ENUM('sms','whatsapp','email','push') NOT NULL, event_type VARCHAR(100) NOT NULL, template_body TEXT NOT NULL, variables TEXT[] NULL, dlt_template_id VARCHAR(100) NULL, dlt_sender_id VARCHAR(20) NULL, whatsapp_template_name VARCHAR(200) NULL, whatsapp_language_code VARCHAR(10) DEFAULT 'en', is_active BOOLEAN DEFAULT true, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Unique: `(school_id, channel, event_type)`. Index: `(school_id, channel, is_active)`.
   - `message_threads`: `(id UUID PK, school_id UUID NOT NULL, participant_ids UUID[] NOT NULL, thread_type ENUM('parent_teacher','admin_parent','admin_staff','other') NOT NULL, last_message_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
     - Index: `(school_id, last_message_at)`.
   - `direct_messages`: `(id UUID PK, school_id UUID NOT NULL, thread_id UUID NOT NULL FK message_threads, sender_id UUID NOT NULL FK users, recipient_id UUID NOT NULL FK users, body TEXT NOT NULL, attachment_urls TEXT[] NULL, is_read BOOLEAN DEFAULT false, read_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ DEFAULT now())`.
     - Index: `(school_id, thread_id, created_at)`, `(school_id, recipient_id, is_read)`, `(school_id, sender_id)`.
   - `sms_opt_out_list`: `(id UUID PK, school_id UUID NOT NULL, phone_number VARCHAR(15) NOT NULL, opted_out_at TIMESTAMPTZ DEFAULT now(), reason TEXT NULL)`.
     - Unique: `(school_id, phone_number)`. Index: `(school_id, phone_number)`.
   - `communication_send_logs`: `(id UUID PK, school_id UUID NOT NULL, channel ENUM('sms','whatsapp','email','push') NOT NULL, event_type VARCHAR(100) NULL, recipient_user_id UUID NULL FK users, recipient_phone VARCHAR(15) NULL, recipient_email VARCHAR(255) NULL, message_body TEXT NOT NULL, template_id UUID NULL FK message_templates, status ENUM('queued','sent','delivered','failed','opted_out') DEFAULT 'queued', provider_message_id VARCHAR(300) NULL, error_message TEXT NULL, sent_at TIMESTAMPTZ NULL, delivered_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ DEFAULT now())`.
     - Index: `(school_id, channel, status, created_at)`, `(school_id, recipient_user_id)`, `(school_id, event_type, created_at)`.
   - All composite indexes MUST start with `school_id`.

2. **Notice Board Endpoints** — Manage and serve announcements:
   - `POST /v1/communication/notices` — Create a notice. Body: `{title, body, post_type, target_audience, target_class_section_ids?, is_pinned?, pin_expires_at?, attachment_urls?, expires_at?}`. Validates: if `target_audience='class_specific'`, `target_class_section_ids` is required. Permission: `communication.notice.create`. Audit logged.
   - `GET /v1/communication/notices` — List notices with filters: `post_type`, `target_audience`, `is_pinned`, `is_published`, `from_date`, `to_date`. Paginated. Permission: `communication.notice.view`.
   - `GET /v1/communication/notices/:id` — Get single notice. Permission: `communication.notice.view`.
   - `PATCH /v1/communication/notices/:id` — Update notice. Permission: `communication.notice.update`. Audit logged.
   - `DELETE /v1/communication/notices/:id` — Soft delete notice. Permission: `communication.notice.delete`. Audit logged.
   - `POST /v1/communication/notices/:id/publish` — Sets `is_published=true`, `published_at=now()`. Emits `communication.notice_published` event. Permission: `communication.notice.publish`.
   - `POST /v1/communication/notices/:id/pin` — Pins the notice. Permission: `communication.notice.publish`.
   - `POST /v1/communication/notices/:id/unpin` — Unpins the notice. Permission: `communication.notice.publish`.
   - `GET /v1/communication/notices/feed` — Returns published, non-expired notices for the authenticated user's audience segment. Auto-filters `class_specific` notices to user's class-section. Redis cache: `{school_id}:notice_feed:{user_id}`, TTL 5 min. Permission: any authenticated user.

3. **Circulars Endpoints** — Formal communication management:
   - `POST /v1/communication/circulars` — Create a circular. Auto-assigns `circular_number` using a school-scoped sequence. Permission: `communication.circular.create`. Audit logged.
   - `GET /v1/communication/circulars` — List circulars with filters: `academic_year_id`, `is_published`, `target_audience`. Paginated. Permission: `communication.circular.view`.
   - `GET /v1/communication/circulars/:id` — Get single circular. Permission: `communication.circular.view`.
   - `PATCH /v1/communication/circulars/:id` — Update circular. Permission: `communication.circular.create`.
   - `DELETE /v1/communication/circulars/:id` — Soft delete draft circular. Permission: `communication.circular.create`.
   - `POST /v1/communication/circulars/:id/publish` — Sets `is_published=true`. Triggers BullMQ job to broadcast via configured channels. Permission: `communication.circular.publish`. Audit logged.

4. **Message Templates Endpoints** — Manage re-usable message templates:
   - `POST /v1/communication/templates` — Create a template. Validates variables list matches `{{var}}` placeholders in body. Permission: `communication.template.manage`.
   - `GET /v1/communication/templates` — List templates with filters: `channel`, `event_type`, `is_active`. Permission: `communication.template.manage`.
   - `GET /v1/communication/templates/:id` — Get single template. Permission: `communication.template.manage`.
   - `PATCH /v1/communication/templates/:id` — Update template. Permission: `communication.template.manage`.
   - `DELETE /v1/communication/templates/:id` — Delete template. Permission: `communication.template.manage`.
   - `POST /v1/communication/templates/:id/test` — Send a test message. Body: `{recipient_phone?, recipient_email?, recipient_user_id?, sample_variables: {key: value}}`. Permission: `communication.template.manage`.

5. **Direct Messaging Endpoints** — Real-time user-to-user communication:
   - `GET /v1/communication/messages/threads` — List all threads for the logged-in user, sorted by `last_message_at` DESC. Permission: `communication.message.view`.
   - `POST /v1/communication/messages/threads` — Start a new thread. Body: `{recipient_id, thread_type, initial_message}`. Permission: `communication.message.send`.
   - `GET /v1/communication/messages/threads/:threadId` — Get messages in a thread. Paginated. Marks unread messages for the user as read. Permission: `communication.message.view`.
   - `POST /v1/communication/messages/threads/:threadId/send` — Add a message to a thread. Body: `{body, attachment_urls?}`. Emits `communication.message_sent` event. Permission: `communication.message.send`.
   - `GET /v1/communication/messages/unread-count` — Returns total unread message count for the user. Redis cache TTL 30s. Permission: any authenticated user.

6. **Bulk Announcements & Logs Endpoints** — Ad-hoc broadcasts and tracking:
   - `POST /v1/communication/announcements/send` — Send a custom message. Body: `{message, channel[], target_audience, target_class_section_ids?, target_user_ids?}`. Validates opt-out list. Enqueues BullMQ jobs. **Requires `Idempotency-Key` header**. Returns 202 with `{job_id, estimated_recipients}`. Permission: `communication.announcement.send`. Audit logged.
   - `GET /v1/communication/logs` — Query send logs. Filters: `channel`, `status`, `event_type`, `from_date`, `to_date`, `recipient_user_id`. Paginated. Permission: `communication.report.view`.
   - `GET /v1/communication/logs/stats` — Get aggregated delivery stats per channel for a date range. Redis cache 1 hr. Permission: `communication.report.view`.

7. **Opt-Out Management Endpoints**:
   - `POST /v1/communication/opt-out` — Add a phone number to the opt-out list. Body: `{phone_number, reason?}`. Permission: `communication.settings.manage`.
   - `DELETE /v1/communication/opt-out/:phone` — Remove from opt-out list. Permission: `communication.settings.manage`.
   - `GET /v1/communication/opt-out` — Paginated list of opt-outs. Permission: `communication.settings.manage`.

8. **NestJS Module Wiring**:
   - Create `CommunicationModule` in `backend/src/modules/communication/`.
   - Register all 7 entities: `NoticeBoardPost`, `Circular`, `MessageTemplate`, `MessageThread`, `DirectMessage`, `SmsOptOut`, `CommunicationLog`.
   - Import `StudentsModule`, `AcademicsModule`.
   - Export `MessageTemplateService` (critical for Notification Engine) and `CommunicationLogService`.
   - Register BullMQ queue: `communication-dispatch` for processing bulk jobs and circular broadcasts.
   - Implement `CommunicationDispatchProcessor` to handle queue items and interface with notification providers.
   - Register in `AppModule`.

9. **Permissions Registration**:
   - Keys: `communication.notice.view`, `communication.notice.create`, `communication.notice.update`, `communication.notice.delete`, `communication.notice.publish`, `communication.circular.view`, `communication.circular.create`, `communication.circular.publish`, `communication.template.manage`, `communication.message.view`, `communication.message.send`, `communication.announcement.send`, `communication.report.view`, `communication.settings.manage`.
   - Default assignments:
     - `super_admin`, `admin`, `principal`: All permissions.
     - `teacher`: `notice.view`, `notice.create`, `circular.view`, `message.view`, `message.send`.
     - `parent`, `student`: `notice.view` (feed only), `message.view`, `message.send` (own threads only).

10. **Frontend — Notice Board Page** (`/dashboard/communication/notices`):
    - Two-column layout. Left: Scrollable feed of published notices with type badges (Event, Exam, etc.), pinned posts at top, search/filter bar.
    - Right: "Create Notice" slide-over form with rich text editor, audience selector, and pinning options.
    - View notice full-page modal with attachment links and view count.
    - Audience chips: All, Students, Parents, Staff, Class-specific.

11. **Frontend — Circulars Page** (`/dashboard/communication/circulars`):
    - Table view: Circular Number, Title, Date, Target, Channel Badges (SMS, WA, etc.), Status (Draft/Published).
    - "New Circular" form: Title, Rich Text Body, PDF upload, Channel checkboxes, Target Audience picker.
    - "Publish" action with confirmation and channel summary.

12. **Frontend — Bulk Announcement Composer** (`/dashboard/communication/send`):
    - Multi-step form:
      1. Compose: Select channels, template (optional), or write custom message with variable preview.
      2. Audience: Choose targets (Class, specific students, etc.).
      3. Preview: Shows estimated recipient count and warnings for opted-out numbers.
      4. Send: Dispatches job with Idempotency-Key.
    - Success screen with real-time job progress bar.

13. **Frontend — Direct Messages Page** (`/dashboard/communication/messages`):
    - Chat-style layout. Left: Thread list with last message snippet, timestamp, and unread badge.
    - Right: Active thread with message bubbles, sender info, file attachments, and a send input field.
    - Polling interval (5s) for new messages. Mobile-responsive layout (list-to-thread transition).

14. **Frontend — Message Templates & Logs**:
    - Templates page: Tabs for SMS, WhatsApp, Email, Push. Table showing event type, DLT ID (for SMS), and status. "Test Template" action.
    - Logs page: Delivery analytics dashboard (sent vs. delivered vs. failed). Table with deep filtering by channel and user. Export to CSV.

15. **Seed Data**:
    - 6 Message Templates: `attendance.absent` (SMS/WA), `fee.payment_received` (WA), `exam.results_published` (Email/Push), `homework.published` (Push), `live_class.session_started` (Push).
    - 2 Notice Board posts: "School Reopening Notice" (Published, General), "Independence Day Celebration" (Published, Event).
    - 1 Circular: "Academic Calendar 2025–26".

## Relevant files
- `backend/src/modules/communication/`
- `backend/src/modules/communication/entities/notice-board-post.entity.ts`
- `backend/src/modules/communication/entities/circular.entity.ts`
- `backend/src/modules/communication/entities/message-template.entity.ts`
- `backend/src/modules/communication/entities/message-thread.entity.ts`
- `backend/src/modules/communication/entities/direct-message.entity.ts`
- `backend/src/modules/communication/entities/sms-opt-out.entity.ts`
- `backend/src/modules/communication/entities/communication-log.entity.ts`
- `backend/src/database/migrations/035-communication.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/communication/notices/page.tsx`
- `frontend/src/app/(dashboard)/communication/circulars/page.tsx`
- `frontend/src/app/(dashboard)/communication/send/page.tsx`
- `frontend/src/app/(dashboard)/communication/messages/page.tsx`
- `frontend/src/app/(dashboard)/communication/templates/page.tsx`
- `frontend/src/app/(dashboard)/communication/logs/page.tsx`
- `documentation/api-style-guide.md`
- `documentation/coding-guidelines.md`
- `documentation/agent-rules.md`
- `documentation/route-template.md`
