# POST /v1/auth/verify-otp

## Purpose
Step 2 of the 2FA authentication flow.

Verifies the 6-digit OTP submitted by the user. On success:
- Issues a JWT access token (15-minute expiry) in the response body.
- Issues a refresh token (7-day expiry) as an HttpOnly + Secure + SameSite=Strict cookie.
- Records the user session in `user_sessions` table (refresh token stored as bcrypt hash).

## Roles & Permissions
- **Public** — no authentication required.
- Max 5 incorrect OTP attempts before 15-minute lockout (enforced in service).

## Request Schema
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "otp": "123456",
  "purpose": "2fa_login"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `user_id` | UUID string | yes | Returned from `POST /v1/auth/login` |
| `otp` | string (6 digits) | yes | The OTP received by email |
| `purpose` | enum | yes | `2fa_login` \| `password_reset` \| `email_verify` |

## Response Schema (200 OK)
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "admin@demo.schoolos.com",
      "first_name": "Admin",
      "last_name": "User",
      "role": "super_admin"
    }
  }
}
```

Set-Cookie header (server-side only — never returned in body):
```
Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/v1/auth; Max-Age=604800
```

## Errors
| Code | HTTP | Description |
|------|------|-------------|
| `OTP_INVALID` | 401 | The OTP does not match |
| `OTP_EXPIRED` | 401 | The OTP has expired (>10 minutes) |
| `OTP_USED` | 401 | The OTP has already been used |
| `OTP_LOCKED` | 429 | Too many failed attempts — locked for 15 minutes |
| `OTP_NOT_FOUND` | 404 | No pending OTP found for this user |
| `VALIDATION_ERROR` | 400 | Missing or invalid fields |
