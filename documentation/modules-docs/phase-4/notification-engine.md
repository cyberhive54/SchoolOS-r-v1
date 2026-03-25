# Phase 4 — Notification Engine (Module 12)

## What & Why
The Notification Engine is the event-driven backbone of SchoolOS's real-time communication. Every operational module (Attendance, Fees, Homework, Examinations, Behaviour, Certificates, Live Classes, Hostel, Library) emits EventEmitter2 events. The Notification Engine listens to all these events and routes them to the correct delivery channel (SMS via MSG91/Textlocal, WhatsApp via Gupshup/Meta, Email via AWS SES/SendGrid, Push via FCM) based on the event type, school configuration, user preferences, and opt-out status. This centralizes all outbound messaging, ensuring consistency, regulatory compliance (DLT/TRAI in India), and a clean separation of concerns where operational modules remain agnostic of delivery providers.

## Done looks like
- Centralized event listener architecture that handles all system-wide operational events.
- Multi-channel support for SMS, WhatsApp, Email, and Push Notifications.
- School-level configuration for notification providers (API keys, sender IDs, etc.) with verification.
- Flexible event subscription management allowing admins to toggle channels per event type.
- User-level notification preferences (opt-in/out per channel, quiet hours).
- Persistent notification queue with BullMQ for reliable delivery, retries, and rate limiting.
- Detailed delivery logs and analytics for tracking success rates and provider responses.
- FCM device token management for reliable push notification delivery to mobile apps.
- Public webhook endpoints for real-time delivery status updates from external providers.
- Automated recipient resolution (e.g., mapping student events to parent contacts).
- Template-driven message rendering with variable substitution.
- Adherence to "Rule 4": Operational modules never call providers directly.

## Out of scope
- In-app notification bell/center (covered by a separate real-time UI component).
- AI-based notification optimization or frequency capping.
- Marketing automation or complex drip campaigns (this is for operational alerts).
- Peer-to-peer chat (handled by the Communication System module).
- Physical mail or post integration.

## Tasks

1. **DB Migration — Notification Engine Core** — Create migration `036-notification-engine.ts` with:
   - `notification_channel_configs`: `(id UUID PK, school_id UUID NOT NULL, channel ENUM('sms','whatsapp','email','push') NOT NULL, provider VARCHAR(100) NOT NULL, api_key_ref VARCHAR(200) NOT NULL, sender_id VARCHAR(50) NULL, whatsapp_phone_number_id VARCHAR(100) NULL, email_from_name VARCHAR(200) NULL, email_from_address VARCHAR(255) NULL, fcm_project_id VARCHAR(200) NULL, is_active BOOLEAN DEFAULT true, is_verified BOOLEAN DEFAULT false, verified_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. 
     - Unique: `(school_id, channel)`. 
     - Index: `(school_id, is_active)`.
   - `notification_event_subscriptions`: `(id UUID PK, school_id UUID NOT NULL, event_type VARCHAR(150) NOT NULL, channel ENUM('sms','whatsapp','email','push') NOT NULL, template_id UUID NOT NULL FK message_templates, is_active BOOLEAN DEFAULT true, target_user_roles TEXT[] NOT NULL, delay_seconds INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. 
     - Unique: `(school_id, event_type, channel)`. 
     - Index: `(school_id, event_type, is_active)`.
   - `notification_queue`: `(id UUID PK, school_id UUID NOT NULL, event_type VARCHAR(150) NOT NULL, channel ENUM('sms','whatsapp','email','push') NOT NULL, recipient_user_id UUID NOT NULL FK users, recipient_phone VARCHAR(15) NULL, recipient_email VARCHAR(255) NULL, fcm_token TEXT NULL, rendered_body TEXT NOT NULL, rendered_subject VARCHAR(500) NULL, template_id UUID NULL FK message_templates, source_entity_type VARCHAR(100) NULL, source_entity_id UUID NULL, priority INT NOT NULL DEFAULT 5, scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(), status ENUM('pending','processing','sent','delivered','failed','skipped') DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0, max_attempts INT NOT NULL DEFAULT 3, last_attempted_at TIMESTAMPTZ NULL, provider_message_id VARCHAR(300) NULL, error_message TEXT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. 
     - Index: `(school_id, status, scheduled_for)`, `(school_id, recipient_user_id)`, `(school_id, event_type, created_at)`, `(status, scheduled_for)`.
   - `notification_delivery_logs`: `(id UUID PK, school_id UUID NOT NULL, queue_id UUID NOT NULL FK notification_queue, channel ENUM('sms','whatsapp','email','push') NOT NULL, provider VARCHAR(100) NOT NULL, provider_message_id VARCHAR(300) NULL, status ENUM('sent','delivered','read','failed','bounced','rejected') NOT NULL, raw_response JSONB NULL, status_received_at TIMESTAMPTZ DEFAULT now(), created_at TIMESTAMPTZ DEFAULT now())`. 
     - Index: `(school_id, queue_id)`, `(school_id, status, created_at)`, `(provider_message_id)`.
   - `user_notification_preferences`: `(id UUID PK, school_id UUID NOT NULL, user_id UUID NOT NULL FK users, sms_enabled BOOLEAN DEFAULT true, whatsapp_enabled BOOLEAN DEFAULT true, email_enabled BOOLEAN DEFAULT true, push_enabled BOOLEAN DEFAULT true, disabled_event_types TEXT[] DEFAULT '{}', quiet_hours_start TIME NULL, quiet_hours_end TIME NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. 
     - Unique: `(school_id, user_id)`. 
     - Index: `(school_id, user_id)`.
   - `fcm_device_tokens`: `(id UUID PK, school_id UUID NOT NULL, user_id UUID NOT NULL FK users, device_token TEXT NOT NULL, platform ENUM('android','ios','web') NOT NULL, app_version VARCHAR(20) NULL, last_used_at TIMESTAMPTZ DEFAULT now(), is_active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`. 
     - Unique: `(school_id, user_id, device_token)`. 
     - Index: `(school_id, user_id, is_active)`.
   - All composite indexes MUST start with `school_id`.

2. **Event Listeners Implementation** — Create a `NotificationEventListener` that handles:
   - `attendance.marked`: Detects absent/late status. Recipients: Parents. Channel: SMS + WhatsApp. Template: "Dear {parent_name}, {student_name} was marked {status} on {date}."
   - `attendance.leave_approved`: Recipients: Parent who submitted. Channel: Push + WhatsApp. Template: "Leave approved for {student_name} from {from_date} to {to_date}."
   - `fee.payment_received`: Recipients: Parent. Channel: WhatsApp + Email. Template: Receipt confirmation with {amount} and {balance}.
   - `fee.invoice_generated`: Recipients: Parent. Channel: WhatsApp + Push. Template: "New fee invoice #{invoice_number} of ₹{amount} due by {due_date}."
   - `exam.results_published`: Recipients: Parents + Students. Channel: Push + Email. Template: "Exam results for {exam_group_name} are now available."
   - `homework.published`: Recipients: Students + Parents. Channel: Push. Template: "New homework: {title} for {subject} due {due_date}."
   - `homework.graded`: Recipients: Student + Parent. Channel: Push. Template: "{subject} homework graded. Score: {grade}/{total}."
   - `live_class.session_started`: Recipients: Students + Parents. Channel: Push + WhatsApp. Template: "Live class starting now: {title}. Join: {meeting_link}."
   - `lms.course_completed`: Recipients: Student + Parent. Channel: Push + Email. Template: "Congratulations! {student_name} completed {course_name}."
   - `behaviour.parent_notified`: Recipients: Parent. Channel: WhatsApp + Email. Template: Incident notification for {student_name}.
   - `certificate.generated`: Recipients: Student + Parent. Channel: Push + Email. Template: "{certificate_type} is ready for download."
   - `communication.notice_published`: Recipients: Targeted Users. Channel: Push (high-priority only).
   - `communication.message_sent`: Recipients: Target User. Channel: Push. Template: "New message from {sender_name}."
   - `library.overdue_reminder`: Recipients: Student + Parent. Channel: SMS + Push. Template: "{student_name} has {count} overdue books. Return by {date}."
   - `transport.vehicle_delayed`: Recipients: Parents on route. Channel: WhatsApp + Push. Template: "Bus {route_name} is delayed by {delay_minutes} min."

3. **HTTP Endpoints — Configuration & Preferences**:
   - `POST /v1/notifications/channels/configure`: Upsert channel config. Validates provider credentials with a test ping. Permission: `notification.channel.configure`. Audit logged.
   - `GET /v1/notifications/channels`: List configurations and verification status. Permission: `notification.channel.configure`.
   - `DELETE /v1/notifications/channels/:id`: Deactivate channel. Permission: `notification.channel.configure`.
   - `GET /v1/notifications/subscriptions`: List school event-to-channel mappings. Permission: `notification.subscription.manage`.
   - `PATCH /v1/notifications/subscriptions/:id`: Toggle `is_active` or change `template_id`. Permission: `notification.subscription.manage`.
   - `POST /v1/notifications/subscriptions`: Create custom mapping. Permission: `notification.subscription.manage`.
   - `GET /v1/notifications/preferences`: Get own preferences. Permission: authenticated.
   - `PUT /v1/notifications/preferences`: Update own preferences (channels, quiet hours). Permission: authenticated.
   - `POST /v1/notifications/device-tokens`: Register/upsert FCM token. Permission: authenticated.
   - `DELETE /v1/notifications/device-tokens/:token`: Remove token. Permission: authenticated.
   - `GET /v1/notifications/queue/stats`: Aggregated queue counts (pending/failed/sent). Permission: `notification.report.view`. Redis cache 1 min.
   - `GET /v1/notifications/analytics`: Delivery/Open/Read rates. Permission: `notification.report.view`.
   - `POST /v1/notifications/webhooks/sms`: Public provider callback for status. Signature verification required.
   - `POST /v1/notifications/webhooks/whatsapp`: Public provider callback for status/read receipts.
   - `POST /v1/notifications/webhooks/email`: Public provider callback (e.g., AWS SNS for SES).

4. **NestJS Module Wiring**:
   - Create `NotificationEngineModule` in `backend/src/modules/notification-engine/`.
   - Entities: `NotificationChannelConfig`, `NotificationEventSubscription`, `NotificationQueue`, `NotificationDeliveryLog`, `UserNotificationPreference`, `FcmDeviceToken`.
   - Imports: `CommunicationModule`, `StudentsModule`.
   - Exports: `NotificationQueueService`.
   - Register `NotificationEventListener` as an EventEmitter2 listener.
   - Configure BullMQ queue `notification-dispatch` with concurrency 10 and exponential backoff retry.
   - Implement `NotificationDispatchProcessor` to handle the actual API calls to providers.

5. **Permissions Registration**:
   - `notification.channel.configure`: Manage API keys and provider settings.
   - `notification.subscription.manage`: Toggle which events trigger which notifications.
   - `notification.report.view`: Access delivery analytics and logs.
   - Default Assignments: `super_admin`, `admin` get all. `principal` gets subscription and report. Everyone else gets preference management.

6. **Frontend — Notification Settings Page** (`/dashboard/settings/notifications`):
   - **Channels Tab**: Cards for SMS/WhatsApp/Email/Push. Status badge (Verified/Not Configured). "Configure" button opens provider setup form (API keys, Sender ID).
   - **Event Subscriptions Tab**: Matrix/Table of event types vs channels. Toggles for each. Template selector dropdown for each active channel.
   - **Delivery Analytics Tab**: Bar charts for delivery rates per channel. Failure reason breakdown.
   - Loading states (skeletons) and success/error toast notifications.

7. **Seed Data**:
   - Default `notification_event_subscriptions` for all core events (attendance, fees, homework) pointing to default templates.
   - Sample (inactive) `notification_channel_configs` for major providers (MSG91, Gupshup, SES).
   - Sample user preferences for seeded admin and parent accounts.

## Relevant files
- `backend/src/modules/notification-engine/`
- `backend/src/modules/notification-engine/notification-engine.module.ts`
- `backend/src/modules/notification-engine/entities/*.entity.ts`
- `backend/src/modules/notification-engine/listeners/notification-event.listener.ts`
- `backend/src/modules/notification-engine/processors/notification-dispatch.processor.ts`
- `backend/src/database/migrations/036-notification-engine.ts`
- `backend/src/config/permissions.ts`
- `backend/src/modules/communication/communication.service.ts`
- `frontend/src/app/(dashboard)/settings/notifications/page.tsx`
- `frontend/src/components/modules/notifications/ChannelConfigForm.tsx`
- `frontend/src/components/modules/notifications/SubscriptionMatrix.tsx`
- `frontend/src/hooks/use-notifications.ts`
- `documentation/module-dependency-map.md`
