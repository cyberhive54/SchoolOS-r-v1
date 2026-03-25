'use client';

import { OtpForm } from '@/components/auth/OtpForm';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function VerifyOtpPage() {
  const { pendingUserId } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!pendingUserId) {
      router.replace('/login');
    }
  }, [pendingUserId, router]);

  if (!pendingUserId) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <span className="text-white text-2xl font-bold">S</span>
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-heading)' }}
          >
            Verify OTP
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Enter the 6-digit code sent to your email
          </p>
        </div>

        <div
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8"
          style={{ borderRadius: 'var(--radius-lg)' }}
        >
          <OtpForm userId={pendingUserId} />
        </div>
      </div>
    </div>
  );
}
