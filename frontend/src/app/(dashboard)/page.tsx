'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (searchParams.get('login') === 'success') {
      setShowWelcome(true);
      router.replace('/');
      const t = setTimeout(() => setShowWelcome(false), 5000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [searchParams, router]);

  return (
    <div>
      {showWelcome && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-green-800">
              Signed in successfully. Welcome back, {user?.first_name}!
            </p>
          </div>
          <button
            onClick={() => setShowWelcome(false)}
            className="text-green-600 hover:text-green-800 text-lg leading-none ml-4"
          >
            ×
          </button>
        </div>
      )}

      <div className="mb-6">
        <h1
          className="text-2xl font-bold text-slate-900"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Dashboard
        </h1>
        <p className="text-slate-500 mt-1">
          Welcome back, {user?.first_name} {user?.last_name}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: '—', icon: '👥' },
          { label: 'Active Staff', value: '—', icon: '👨‍🏫' },
          { label: 'Attendance Today', value: '—', icon: '✓' },
          { label: 'Fee Collection', value: '—', icon: '₹' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm"
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          SchoolOS — Phase 2 in Progress
        </h2>
        <p className="text-slate-600 text-sm leading-relaxed">
          Foundation (Auth, RBAC), Academics, and Students modules are live.
          HR, Admissions, Attendance, Examinations, Fees, and Payroll modules are coming next.
        </p>
      </div>
    </div>
  );
}
