'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth.store';
import { useDebounce } from '@/hooks/useDebounce';
import { AddStaffSlideOver } from '@/components/hr/AddStaffSlideOver';
import type { PaginatedResponse } from '@/types';

interface Staff {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  gender: 'male' | 'female' | 'other';
  status: 'active' | 'inactive' | 'resigned' | 'terminated';
  employment_type: 'permanent' | 'contractual' | 'part_time' | 'probation';
  department_id: string | null;
  designation_id: string | null;
  join_date: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'success',
  inactive: 'warning',
  resigned: 'danger',
  terminated: 'danger',
};

const EMPLOYMENT_LABELS: Record<string, string> = {
  permanent: 'Permanent',
  contractual: 'Contractual',
  part_time: 'Part-time',
  probation: 'Probation',
};

function StaffRowSkeleton() {
  return (
    <tr>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export default function StaffDirectoryPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const canManage = user && ['super_admin', 'admin'].includes(user.role);

  const { data, isLoading, refetch } = useQuery<PaginatedResponse<Staff>>({
    queryKey: ['hr-staff', page, debouncedSearch, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), per_page: '25' });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (statusFilter) params.set('filter[status]', statusFilter);
      return apiClient.getPaginated<Staff>(`/hr/staff?${params}`);
    },
  });

  const staff = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Staff Directory</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {meta?.total ?? 0} staff member{meta?.total !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowAddForm(true)}>+ Add Staff</Button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-3">
          <Input
            placeholder="Search by name or employee ID…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="resigned">Resigned</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Employee</th>
              <th className="px-4 py-3 text-left font-medium">ID</th>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-left font-medium">Join Date</th>
              <th className="px-4 py-3 text-left font-medium">Employment</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <StaffRowSkeleton key={i} />)
              : staff.length === 0
              ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No staff members found.
                  </td>
                </tr>
              )
              : staff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium text-xs flex-shrink-0">
                        {s.first_name[0]}{s.last_name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{s.first_name} {s.last_name}</p>
                        <p className="text-[11px] text-slate-400 capitalize">{s.gender}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-600 text-xs">{s.employee_id}</td>
                  <td className="px-4 py-3 text-slate-600">{s.phone}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(s.join_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="default">{EMPLOYMENT_LABELS[s.employment_type] ?? s.employment_type}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_COLORS[s.status] as 'success' | 'warning' | 'danger'}>
                      {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/hr/staff/${s.id}`)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {meta && meta.total_pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>
              Showing {(meta.page - 1) * meta.per_page + 1}–{Math.min(meta.page * meta.per_page, meta.total)} of {meta.total}
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Previous
              </Button>
              <Button variant="ghost" size="sm" disabled={page >= meta.total_pages} onClick={() => setPage(p => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {showAddForm && (
        <AddStaffSlideOver
          onClose={() => setShowAddForm(false)}
          onSuccess={() => {
            setShowAddForm(false);
            void refetch();
          }}
        />
      )}
    </div>
  );
}
