/**
 * POST /v1/auth/logout — Permission configuration
 *
 * Requires: Valid JWT access token (authenticated endpoint).
 * Any role can log themselves out.
 * No specific permission required beyond authentication.
 */
export const LOGOUT_PERMISSIONS = {
  isPublic: false,
  requiredPermissions: [],
} as const;
