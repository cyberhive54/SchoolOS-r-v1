/**
 * POST /v1/auth/refresh — Permission configuration
 *
 * Public — refresh token in HttpOnly cookie IS the credential.
 * Implements refresh token rotation on each call.
 */
export const REFRESH_PERMISSIONS = {
  isPublic: true,
  requiredPermissions: [],
} as const;
