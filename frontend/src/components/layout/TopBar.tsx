'use client';

import { useAuthStore } from '@/store/auth.store';

export function TopBar() {
  const { user } = useAuthStore();

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center px-6 flex-shrink-0">
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600">
          {user?.first_name} {user?.last_name}
        </span>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          {user?.first_name?.[0] ?? '?'}
        </div>
      </div>
    </header>
  );
}
