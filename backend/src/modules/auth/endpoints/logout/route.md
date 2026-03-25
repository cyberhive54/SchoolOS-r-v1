# POST /v1/auth/logout

## Purpose
Revokes the current session by invalidating the refresh token.
Clears the refresh token HttpOnly cookie.

This endpoint requires a valid JWT access token (unlike login/verify-otp/refresh).

## Roles & Permissions
- **Authenticated** — requires valid JWT access token.
- Any authenticated user can log themselves out.

## Request Schema
```
POST /v1/auth/logout
Authorization: Bearer <access_token>
Cookie: refresh_token=<refresh_token>
```
No request body.

## Response Schema (200 OK)
```json
{
  "data": {
    "message": "You have been logged out successfully."
  }
}
```
`Set-Cookie: refresh_token=; HttpOnly; Secure; Expires=Thu, 01 Jan 1970 00:00:00 GMT` is set to clear the cookie.

## Errors
| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | No valid access token provided |
