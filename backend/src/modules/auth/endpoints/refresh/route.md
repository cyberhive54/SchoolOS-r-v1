# POST /v1/auth/refresh

## Purpose
Issues a new JWT access token using the refresh token stored in the HttpOnly cookie.
Implements **refresh token rotation** — the old refresh token is revoked and a new one is issued.

## Roles & Permissions
- **Public** — no JWT authentication required (the refresh token IS the credential).

## Request Schema
```
POST /v1/auth/refresh
Cookie: refresh_token=<raw_refresh_token>
```
No request body.

## Response Schema (200 OK)
```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 900
  }
}
```
A new `Set-Cookie: refresh_token=...` is also returned with the rotated token.

## Errors
| Code | HTTP | Description |
|------|------|-------------|
| `MISSING_REFRESH_TOKEN` | 401 | No refresh token cookie present |
| `SESSION_NOT_FOUND` | 401 | Token does not match any active session |
| `SESSION_EXPIRED` | 401 | Session has expired |
| `SESSION_REVOKED` | 401 | Session was explicitly revoked |
