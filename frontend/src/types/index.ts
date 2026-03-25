/**
 * Shared types — inlined for standalone deployment.
 * Mirrors the backend types; kept in sync manually or via OpenAPI codegen.
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

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiError;
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

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  school_id: string;
  membership_id: string;
}

export interface JwtPayload {
  sub: string;
  school_id: string;
  role: UserRole;
  membership_id: string;
  iat: number;
  exp: number;
}

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

export interface SchoolThemeResponse {
  school_id: string;
  school_name: string;
  theme: SchoolTheme;
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
