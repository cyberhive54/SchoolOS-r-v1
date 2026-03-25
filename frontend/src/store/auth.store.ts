import { create } from 'zustand';
import type { UserRole } from '@schoolos/types';

/**
 * Auth Store — using Zustand (JS memory only)
 *
 * SECURITY RULES:
 *   - access_token: stored ONLY in Zustand memory — NEVER localStorage / sessionStorage / cookie
 *   - refresh_token: stored ONLY in HttpOnly+Secure+SameSite=Strict cookie (server-managed)
 *   - On page refresh: access_token is gone — POST /v1/auth/refresh with the cookie to get a new one
 */

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
}

interface AuthState {
  /** JWT access token — in-memory only, never persisted */
  accessToken: string | null;
  /** User profile from the last successful login */
  user: AuthUser | null;
  /** Pending user_id from POST /v1/auth/login — used in verify-otp page */
  pendingUserId: string | null;
  /** True when a token refresh is in flight (prevents race conditions) */
  isRefreshing: boolean;

  // Actions
  setTokens: (accessToken: string, user: AuthUser) => void;
  setPendingUserId: (userId: string) => void;
  clearPendingUserId: () => void;
  logout: () => void;
  setIsRefreshing: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  pendingUserId: null,
  isRefreshing: false,

  setTokens: (accessToken, user) =>
    set({ accessToken, user, pendingUserId: null }),

  setPendingUserId: (userId) =>
    set({ pendingUserId: userId }),

  clearPendingUserId: () =>
    set({ pendingUserId: null }),

  logout: () =>
    set({ accessToken: null, user: null, pendingUserId: null }),

  setIsRefreshing: (v) =>
    set({ isRefreshing: v }),
}));
