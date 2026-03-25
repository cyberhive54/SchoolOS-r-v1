'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { apiClient, ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface LoginRequest {
  identifier: string;
  identifier_type: 'email';
  password: string;
}

interface LoginResponse {
  message: string;
  otp_sent: boolean;
  user_id: string;
  channel: string;
}

export function LoginForm() {
  const router = useRouter();
  const { setPendingUserId } = useAuthStore();

  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await apiClient.post<LoginResponse>('/auth/login', {
        identifier: formData.identifier.trim(),
        identifier_type: 'email',
        password: formData.password,
      } satisfies LoginRequest);

      if (res.data.otp_sent) {
        setPendingUserId(res.data.user_id);
        router.push('/verify-otp');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to connect to the server. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      <div>
        <label
          htmlFor="identifier"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          Email address
        </label>
        <input
          id="identifier"
          type="email"
          required
          autoComplete="email"
          value={formData.identifier}
          onChange={(e) => setFormData((p) => ({ ...p, identifier: e.target.value }))}
          className={cn(
            'w-full px-3.5 py-2.5 rounded-lg border text-slate-900',
            'placeholder:text-slate-400 text-sm',
            'focus:outline-none focus:ring-2 transition-shadow',
            'border-slate-200 focus:ring-blue-500 focus:border-blue-500',
          )}
          placeholder="you@school.edu"
          style={{ borderRadius: 'var(--radius-md)' }}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={formData.password}
          onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
          className={cn(
            'w-full px-3.5 py-2.5 rounded-lg border text-slate-900',
            'placeholder:text-slate-400 text-sm',
            'focus:outline-none focus:ring-2 transition-shadow',
            'border-slate-200 focus:ring-blue-500 focus:border-blue-500',
          )}
          placeholder="••••••••"
          style={{ borderRadius: 'var(--radius-md)' }}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'w-full py-2.5 px-4 rounded-lg text-white text-sm font-medium',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 transition-opacity',
          isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90',
        )}
        style={{
          backgroundColor: 'var(--color-primary)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {isLoading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
