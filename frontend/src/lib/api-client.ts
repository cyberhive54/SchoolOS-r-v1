/**
 * API Client for SchoolOS
 *
 * - Adds Authorization: Bearer <token> header from auth store
 * - Adds X-School-ID header from env var (NEXT_PUBLIC_SCHOOL_ID) for multi-tenancy
 * - Handles 401 → automatically refreshes token once and retries
 * - Wraps all responses in the standard envelope
 */

import { useAuthStore } from '@/store/auth.store';
import type { ApiResponse, PaginatedResponse, ApiErrorResponse } from '@schoolos/types';

// Relative path — Next.js rewrites /v1/* → http://localhost:3001/v1/* server-side,
// so the browser never makes a cross-origin request. This file is client-only
// (imports Zustand store) so a relative URL is always safe here.
// Relative path - handled by Next.js rewrite or external reverse proxy.
// This keeps browser calls same-origin and avoids cookie/CORS issues.
const BASE_URL = '/v1';

/**
 * School ID for X-School-ID header.
 * In production: resolved from subdomain or custom domain — no header needed.
 * In dev: set NEXT_PUBLIC_SCHOOL_ID to the UUID printed by `pnpm schoolos:seed`.
 */
const SCHOOL_ID = process.env.NEXT_PUBLIC_SCHOOL_ID ?? '';

class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  _retry = false,
): Promise<T> {
  const { accessToken, setIsRefreshing, logout } = useAuthStore.getState();

  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    baseHeaders['Authorization'] = `Bearer ${accessToken}`;
  }

  // Always include X-School-ID when available — required for tenant resolution
  if (SCHOOL_ID) {
    baseHeaders['X-School-ID'] = SCHOOL_ID;
  }

  const headers: HeadersInit = {
    ...baseHeaders,
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include', // includes cookies (refresh token)
  });

  if (!res.ok) {
    // 401 → try to refresh once
    if (res.status === 401 && !_retry) {
      const { isRefreshing } = useAuthStore.getState();
      if (!isRefreshing) {
        setIsRefreshing(true);
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: SCHOOL_ID ? { 'X-School-ID': SCHOOL_ID } : {},
          });
          if (refreshRes.ok) {
            const refreshData = (await refreshRes.json()) as ApiResponse<{
              access_token: string;
            }>;
            useAuthStore.getState().setTokens(
              refreshData.data.access_token,
              useAuthStore.getState().user!,
            );
            setIsRefreshing(false);
            return request<T>(path, options, true);
          }
        } catch {
          // Refresh failed — fall through to logout
        }
        setIsRefreshing(false);
        logout();
      }
    }

    const body = (await res.json().catch(() => ({}))) as ApiErrorResponse;
    throw new ApiError(
      body.error?.code ?? 'UNKNOWN_ERROR',
      body.error?.message ?? 'An unexpected error occurred.',
      res.status,
      body.error?.details,
    );
  }

  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) =>
    request<ApiResponse<T>>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<ApiResponse<T>>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body?: unknown, options?: RequestInit) =>
    request<ApiResponse<T>>(path, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  postForm: <T>(path: string, body: FormData, options?: RequestInit) => {
    const { headers: extraHeaders, ...rest } = options ?? {};
    const { accessToken } = useAuthStore.getState();
    const headers: Record<string, string> = {};
    if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
    if (SCHOOL_ID) headers['X-School-ID'] = SCHOOL_ID;
    if (extraHeaders) Object.assign(headers, extraHeaders);
    return request<ApiResponse<T>>(path, {
      ...rest,
      method: 'POST',
      body,
      headers,
    });
  },

  delete: <T>(path: string, options?: RequestInit) =>
    request<ApiResponse<T>>(path, { ...options, method: 'DELETE' }),

  getPaginated: <T>(path: string, options?: RequestInit) =>
    request<PaginatedResponse<T>>(path, { ...options, method: 'GET' }),
};

export { ApiError };
