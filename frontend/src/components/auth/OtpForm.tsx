'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { apiClient, ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface OtpResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

export function OtpForm({ userId }: { userId: string }) {
  const router = useRouter();
  const { setTokens } = useAuthStore();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await apiClient.post<OtpResponse>('/auth/verify-otp', {
        user_id: userId,
        otp: otpCode,
        purpose: '2fa_login',
      });

      setTokens(res.data.access_token, {
        id: res.data.user.id,
        email: res.data.user.email,
        first_name: res.data.user.first_name,
        last_name: res.data.user.last_name,
        role: res.data.user.role as never,
      });

      router.push('/?login=success');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Verification failed. Please try again.');
      }
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3 text-center">
          Enter your 6-digit code
        </label>
        <div className="flex gap-2 justify-center">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInput(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={cn(
                'w-11 h-12 text-center text-lg font-semibold rounded-lg border',
                'text-slate-900 focus:outline-none focus:ring-2 transition-shadow',
                'border-slate-200 focus:ring-blue-500 focus:border-blue-500',
              )}
              style={{ borderRadius: 'var(--radius-md)' }}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700 text-center">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || otp.join('').length !== 6}
        className={cn(
          'w-full py-2.5 px-4 rounded-lg text-white text-sm font-medium',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 transition-opacity',
          isLoading || otp.join('').length !== 6
            ? 'opacity-70 cursor-not-allowed'
            : 'hover:opacity-90',
        )}
        style={{
          backgroundColor: 'var(--color-primary)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        {isLoading ? 'Verifying…' : 'Verify OTP'}
      </button>

      <button
        type="button"
        onClick={() => router.push('/login')}
        className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        Back to sign in
      </button>
    </form>
  );
}
