# POST /v1/auth/login

## Purpose
Step 1 of the 2FA authentication flow.

Validates the user's credentials (email/password). On success, generates a 6-digit OTP
and sends it to the user's registered email (dev: logs to console). The client then
calls `POST /v1/auth/verify-otp` to complete login.

This endpoint is **tenant-scoped** — the school must be resolved via `X-School-ID` header or subdomain.

## Roles & Permissions
- **Public** — no authentication required.
- Rate limited to 3 OTP requests per 10 minutes per account (enforced in LoginService).
- Throttler: max 10 requests/min per IP (set in NestJS ThrottlerModule).

## Request Schema
```json
{
  "identifier": "admin@demo.schoolos.com",
  "identifier_type": "email",
  "password": "Admin@123"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `identifier` | string | yes | Email, phone, student ID, etc. |
| `identifier_type` | enum | yes | `email` \| `phone` \| `student_id` \| `admission_no` \| `staff_id` \| `staff_no` \| `parent_id` |
| `password` | string | yes | Plaintext password (compared against bcrypt hash) |

## Response Schema (200 OK)
```json
{
  "data": {
    "message": "OTP sent to your registered email.",
    "otp_sent": true,
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "channel": "email"
  }
}
```

## Errors
| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_CREDENTIALS` | 401 | Email or password is incorrect |
| `USER_NOT_IN_SCHOOL` | 403 | User is not a member of this school |
| `ACCOUNT_DISABLED` | 403 | User account has been deactivated |
| `OTP_RATE_LIMITED` | 429 | Too many OTP requests — try again in N minutes |
| `SCHOOL_NOT_FOUND` | 404 | School not resolved (set by TenantMiddleware) |
| `VALIDATION_ERROR` | 400 | Missing or invalid request fields |
