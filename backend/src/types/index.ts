/**
 * Shared types — inlined for standalone deployment.
 * All types previously in @schoolos/types are consolidated here.
 */

// ─── API envelope ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginationQuery {
  page?: number;
  per_page?: number;
  sort?: string;
  q?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiError;
}

export interface AsyncJobResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'complete' | 'stuck' | 'failed';
  estimated_completion?: string;
  poll_url: string;
  progress?: number;
  result_url?: string;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ValidationErrorDetail {
  fields: FieldError[];
}

// ─── Auth & user ─────────────────────────────────────────────────────────────

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'teacher'
  | 'student'
  | 'parent'
  | 'accountant'
  | 'receptionist';

export type SubscriptionTier = 'free' | 'starter' | 'growth' | 'enterprise';

export type IdentifierType =
  | 'email'
  | 'phone'
  | 'student_id'
  | 'admission_no'
  | 'staff_id'
  | 'staff_no'
  | 'parent_id';

export interface JwtPayload {
  sub: string;
  school_id: string;
  role: UserRole;
  membership_id: string;
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  school_id: string;
  membership_id: string;
}

export interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
}

export type OtpChannel = 'email' | 'sms';

// ─── School (tenant) ─────────────────────────────────────────────────────────

export interface SchoolTheme {
  color_primary?: string;
  color_secondary?: string;
  color_accent?: string;
  color_surface?: string;
  radius_md?: string;
  radius_lg?: string;
  font_heading?: string;
  font_body?: string;
}

export interface School {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  active_modules: string[];
  subscription_tier: SubscriptionTier;
  theme: SchoolTheme;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchoolThemeResponse {
  school_id: string;
  school_name: string;
  theme: SchoolTheme;
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'PERMISSION_DENIED'
  | 'IMPERSONATION'
  | 'PASSWORD_RESET'
  | 'OTP_LOCKED'
  | 'SESSION_REVOKED';

export interface AuditLogEntry {
  id: string;
  school_id: string;
  action: AuditAction;
  resource_type: string;
  resource_id: string | null;
  actor_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface CreateAuditLogDto {
  school_id: string;
  action: AuditAction;
  resource_type: string;
  resource_id?: string;
  actor_id?: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}
