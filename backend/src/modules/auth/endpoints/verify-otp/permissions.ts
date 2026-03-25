/**
 * POST /v1/auth/verify-otp — Permission configuration
 *
 * This endpoint is PUBLIC — no JWT authentication required.
 * It is the second and final step of the 2FA login flow.
 *
 * Security controls:
 *   - Max 5 incorrect attempts → 15-minute lockout (per otp_requests row)
 *   - OTP expires in 10 minutes (per otp_requests.expires_at)
 *   - OTP is single-use (used_at set on success)
 */
export const VERIFY_OTP_PERMISSIONS = {
  isPublic: true,
  requiredPermissions: [],
  securityControls: {
    maxAttempts: 5,
    lockoutMinutes: 15,
    otpExpiryMinutes: 10,
    singleUse: true,
  },
} as const;
