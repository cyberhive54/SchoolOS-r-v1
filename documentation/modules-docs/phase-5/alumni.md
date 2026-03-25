# Phase 5 — Alumni Management (Module 24)

## What & Why
Alumni management allows schools to maintain lifelong relationships with former students — critical for reputation, fundraising, mentorship programs, and admissions referrals. In the Indian school context, especially for prestigious schools (DPS, BVM, St. Xavier's), alumni networks are strong and actively maintained. When a student leaves the school (TC issued, or year-end promotion past Grade 12), they transition to the alumni registry. Alumni can be invited to alumni meets, provide career mentorship, and are tracked for annual giving. This is a Layer 7 module that depends on the Students module (Layer 2).

## Done looks like
- Automated and manual transition of students to alumni status upon graduation or leaving.
- Comprehensive alumni profiles tracking career, education, and contact preferences.
- Event management system for reunions, webinars, and networking meets with RSVP tracking.
- Mentorship registry where alumni can volunteer to mentor current students or junior alumni.
- Contribution tracking for donations, scholarships, and non-monetary support.
- Verification workflow for admin to confirm alumni identity.
- Public-facing secure update links for alumni to keep their profiles current without a full login.
- Analytics on alumni distribution by year, geography, and industry.

## Out of scope
- Full-scale social networking features (no private messaging between alumni, use LinkedIn/WhatsApp).
- Job board (can be handled via mentorship/announcements).
- Detailed financial accounting for donations (handled by Finance/Accounting module).
- External alumni association website hosting (this is an internal management tool).

## Tasks

1. **DB Migration — Alumni Core** — Create migration `039-alumni-management.ts` with:
   - `alumni_profiles`: `(id UUID PK, school_id UUID NOT NULL, student_id UUID NOT NULL FK students, alumni_number VARCHAR(50) NOT NULL, graduation_year INT NOT NULL, last_class_attended VARCHAR(100) NOT NULL, stream VARCHAR(100) NULL, board VARCHAR(50) NULL, current_city VARCHAR(200) NULL, current_country VARCHAR(100) DEFAULT 'India', current_occupation VARCHAR(300) NULL, employer VARCHAR(300) NULL, linkedin_url TEXT NULL, personal_email VARCHAR(255) NULL, personal_phone VARCHAR(15) NULL, higher_education_institution VARCHAR(400) NULL, higher_education_field VARCHAR(300) NULL, is_active BOOLEAN DEFAULT true, opted_in_for_contact BOOLEAN DEFAULT true, opted_in_for_newsletter BOOLEAN DEFAULT true, is_verified BOOLEAN DEFAULT false, verified_at TIMESTAMPTZ NULL, profile_photo_url TEXT NULL, biography TEXT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Constraints: Unique `(school_id, student_id)`, Unique `(school_id, alumni_number)`.
   - Index: `(school_id, graduation_year)`, `(school_id, current_city)`, `(school_id, is_active)`, `(school_id, is_verified)`.
   - `alumni_events`: `(id UUID PK, school_id UUID NOT NULL, event_name VARCHAR(400) NOT NULL, event_type ENUM('annual_meet','reunion','webinar','mentorship','sports','cultural','other') NOT NULL, event_date DATE NOT NULL, event_time TIME NULL, venue VARCHAR(500) NULL, virtual_link TEXT NULL, description TEXT NULL, rsvp_deadline DATE NULL, max_attendees INT NULL, is_published BOOLEAN DEFAULT false, cover_image_url TEXT NULL, created_by UUID NOT NULL FK users, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Index: `(school_id, event_date)`, `(school_id, is_published)`.
   - `alumni_event_rsvps`: `(id UUID PK, school_id UUID NOT NULL, event_id UUID NOT NULL FK alumni_events, alumni_id UUID NOT NULL FK alumni_profiles, rsvp_status ENUM('attending','not_attending','maybe') NOT NULL DEFAULT 'attending', rsvp_at TIMESTAMPTZ DEFAULT now(), dietary_preference VARCHAR(200) NULL, guest_count INT DEFAULT 0, notes TEXT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Unique: `(school_id, event_id, alumni_id)`. Index: `(school_id, event_id, rsvp_status)`.
   - `alumni_mentorship_registrations`: `(id UUID PK, school_id UUID NOT NULL, alumni_id UUID NOT NULL FK alumni_profiles, areas_of_expertise TEXT[] NOT NULL, is_available BOOLEAN DEFAULT true, preferred_contact ENUM('email','phone','linkedin') DEFAULT 'email', mentee_capacity INT DEFAULT 2, current_mentees INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Unique: `(school_id, alumni_id)`. Index: `(school_id, is_available)`.
   - `alumni_contributions`: `(id UUID PK, school_id UUID NOT NULL, alumni_id UUID NOT NULL FK alumni_profiles, contribution_type ENUM('donation','scholarship','infrastructure','books','equipment','mentorship_hours','other') NOT NULL, amount DECIMAL(12,2) NULL, description TEXT NOT NULL, contribution_date DATE NOT NULL DEFAULT CURRENT_DATE, academic_year_id UUID NULL FK academic_years, reference_number VARCHAR(100) NULL, is_acknowledged BOOLEAN DEFAULT false, acknowledged_by UUID NULL FK users, acknowledged_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now())`.
   - Index: `(school_id, alumni_id)`, `(school_id, contribution_type)`, `(school_id, contribution_date)`.
   - All composite indexes start with `school_id`.

2. **Alumni Profiles Endpoints** — Lifecycle and directory management:
   - `POST /v1/alumni` — Create profile. Body: `{ student_id, graduation_year, last_class_attended, stream?, board?, personal_email?, ... }`. Validates: student exists in school and isn't already alumni. Permission: `alumni.profile.create`.
   - `GET /v1/alumni` — Paginated list. Filters: `graduation_year`, `current_city`, `is_verified`, `occupation_keyword`. Permission: `alumni.profile.view`.
   - `GET /v1/alumni/:id` — Detail view including RSVPs and contributions. Permission: `alumni.profile.view`.
   - `PATCH /v1/alumni/:id` — Update profile. Permission: `alumni.profile.update`. Audit logged.
   - `POST /v1/alumni/:id/verify` — Confirm identity. Permission: `alumni.profile.manage`.
   - `POST /v1/alumni/:id/send-update-link` — Emails a signed JWT link for self-update. Permission: `alumni.profile.manage`.
   - `POST /v1/alumni/public/update` — Public endpoint using JWT token to update personal details. Body: `{ current_city, employer, occupation, linkedin_url, photo_url }`. No auth required (token validated).
   - `GET /v1/alumni/stats` — Aggregate metrics for dashboard. Cache: Redis 30 min. Permission: `alumni.report.view`.

3. **Alumni Events Endpoints** — Engagement tracking:
   - `POST /v1/alumni/events` — Create event. Permission: `alumni.event.manage`.
   - `GET /v1/alumni/events` — List events. Filters: `event_type`, `is_published`, `from_date`. Permission: `alumni.event.view`.
   - `PATCH /v1/alumni/events/:id` — Update event. Permission: `alumni.event.manage`.
   - `POST /v1/alumni/events/:id/publish` — Set `is_published=true`. Emits `alumni.event_published`. Permission: `alumni.event.manage`.
   - `POST /v1/alumni/events/:eventId/rsvp` — Submit RSVP. Body: `{ alumni_id, rsvp_status, guest_count, notes }`. Permission: `alumni.event.view` (for self) or `alumni.event.manage`.
   - `GET /v1/alumni/events/:eventId/rsvps` — List attendees. Permission: `alumni.event.manage`.

4. **Mentorship & Contributions Endpoints**:
   - `POST /v1/alumni/mentorship/register` — Register as mentor. Body: `{ areas_of_expertise: [], mentee_capacity, preferred_contact }`. Permission: `alumni.mentorship.view`.
   - `GET /v1/alumni/mentorship/mentors` — Searchable mentor directory. Permission: `alumni.mentorship.view`.
   - `POST /v1/alumni/contributions` — Log a contribution. Body: `{ alumni_id, contribution_type, amount, description, date }`. Permission: `alumni.contribution.manage`.
   - `GET /v1/alumni/contributions` — Filterable list of contributions. Permission: `alumni.contribution.view`.
   - `POST /v1/alumni/contributions/:id/acknowledge` — Record acknowledgment (e.g., thank you letter sent). Permission: `alumni.contribution.manage`.

5. **Alumni Module NestJS Wiring** — Create `AlumniModule` in `backend/src/modules/alumni/`:
   - Entities: `AlumniProfileEntity`, `AlumniEventEntity`, `AlumniEventRsvpEntity`, `AlumniMentorshipRegistrationEntity`, `AlumniContributionEntity`.
   - Imports: `StudentsModule`.
   - Exports: `AlumniService`.
   - Register in `AppModule`.
   - Create all entity files and `alumni.module.ts`.

6. **Permissions Registration** — Add to `backend/src/config/permissions.ts`:
   - `alumni.profile.view`, `alumni.profile.create`, `alumni.profile.update`, `alumni.profile.manage`
   - `alumni.event.view`, `alumni.event.manage`
   - `alumni.mentorship.view`
   - `alumni.contribution.view`, `alumni.contribution.manage`
   - `alumni.report.view`
   - Default assignments: `super_admin`, `admin` — all. `principal` — profile.view, event.view/manage, report.view. `teacher` — profile.view, event.view.

7. **Frontend — Alumni Directory & Profile** (`/dashboard/alumni`):
   - **Directory Page**: Stats cards (Total, Verified, Batch %); Grid/Table with multi-select filters for batch, city, and industry. Search bar for names.
   - **Profile Detail Modal**: High-res photo, batch info, student record link, timeline of contributions and events attended. Verify button and "Send Update Link" button.
   - Loading: Shimmer grid. Empty: "No alumni found matching filters."

8. **Frontend — Events & Mentorship** (`/dashboard/alumni/events`, `/dashboard/alumni/mentorship`):
   - **Events Dashboard**: Upcoming events cards; past events archive. Create/Publish workflow. RSVP list with export for logistics.
   - **Mentorship Tab**: Mentors list with expertise chips and "Connect" action. Capacity indicators (e.g., "1/2 mentees").
   - **Contributions Tab**: Financial and non-financial log with "Acknowledge" status.

9. **Seed Data** — Update `seed.ts` to include:
   - 1 Alumni profile: Graduated 2024, Science stream, Mumbai based, Verified.
   - 1 Alumni event: "Annual Reunion 2026", Jan 15, Published.
   - 1 RSVP: The seeded alumni attending the reunion.
   - 1 Mentorship registration: The alumni offering "Career in Engineering" mentorship.
   - 1 Contribution: 5000 INR for "Scholarship Fund".

## Relevant files
- `backend/src/modules/alumni/`
- `backend/src/modules/alumni/entities/alumni-profile.entity.ts`
- `backend/src/modules/alumni/entities/alumni-event.entity.ts`
- `backend/src/modules/alumni/entities/alumni-event-rsvp.entity.ts`
- `backend/src/modules/alumni/entities/alumni-mentorship-registration.entity.ts`
- `backend/src/modules/alumni/entities/alumni-contribution.entity.ts`
- `backend/src/database/migrations/039-alumni-management.ts`
- `backend/src/database/seeds/seed.ts`
- `backend/src/config/permissions.ts`
- `frontend/src/app/(dashboard)/alumni/page.tsx`
- `frontend/src/app/(dashboard)/alumni/[id]/page.tsx`
- `frontend/src/app/(dashboard)/alumni/events/page.tsx`
- `frontend/src/app/(dashboard)/alumni/mentorship/page.tsx`
- `frontend/src/components/modules/alumni/AlumniCard.tsx`
- `frontend/src/components/modules/alumni/EventRSVPList.tsx`
