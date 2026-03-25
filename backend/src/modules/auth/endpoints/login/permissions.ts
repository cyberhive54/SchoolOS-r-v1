/**
 * POST /v1/auth/login — Permission configuration
 *
 * This endpoint is PUBLIC — no JWT authentication required.
 * It is the first step of the 2FA login flow.
 *
 * Rate limiting is handled by:
 *   1. NestJS ThrottlerModule: 10 req/min per IP
 *   2. Application-level: max 3 OTP requests per 10 min per account
 */
export const LOGIN_PERMISSIONS = {
  isPublic: true,
  requiredPermissions: [],
  rateLimit: {
    windowMinutes: 10,
    maxRequests: 3,
    scope: 'per_account',
  },
} as const;
