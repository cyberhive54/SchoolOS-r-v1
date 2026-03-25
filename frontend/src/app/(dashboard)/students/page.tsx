'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PaginatedResponse } from '@schoolos/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth.store';
import { useDebounce } from '@/hooks/useDebounce';
import { AddStudentSlideOver } from '@/components/students/AddStudentSlideOver';

interface Student {
  id: string;
  admission_no: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: 'male' | 'female' | 'other';
  status: 'active' | 'inactive' | 'transferred_out' | 'alumni';
  profile_photo_url: string | null;
}

type StudentsResponse = PaginatedResponse<Student>;

const STATUS_COLORS: Record<string, string> = {
  active: 'success',
  inactive: 'danger',
  transferred_out: 'warning',
  alumni: 'primary',
};

function StudentRowSkeleton() {
  return (
    <tr>
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export default function StudentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, refetch } = useQuery<StudentsResponse>({
    queryKey: ['students', page, debouncedSearch, genderFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), per_page: '25' });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (genderFilter) params.set('filter[gender]', genderFilter);
      if (statusFilter) params.set('filter[status]', statusFilter);
      return apiClient.getPaginated<Student>(`/students?${params}`);
    },
  });

  const students = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {meta ? `${meta.total} students` : 'Loading...'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/students/bulk-import')}>
            Bulk Import
          </Button>
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            + Add Student
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <Input
          placeholder="Search by name or admission no..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-64"
        />
        <select
          value={genderFilter}
          onChange={(e) => { setGenderFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="transferred_out">Transferred Out</option>
          <option value="alumni">Alumni</option>
        </select>
        {(search || genderFilter || statusFilter) && (
          <button
            onClick={() => { setSearch(''); setGenderFilter(''); setStatusFilter(''); setPage(1); }}
            className="text-xs text-slate-500 hover:text-slate-800 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Student</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Admission No</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Gender</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => <StudentRowSkeleton key={i} />)
              : students.length === 0
              ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="text-slate-400">
                      <div className="text-4xl mb-3">👥</div>
                      <p className="font-medium text-slate-600">No students found</p>
                      <p className="text-sm mt-1">
                        {search || genderFilter || statusFilter
                          ? 'Try adjusting your filters'
                          : 'Add your first student to get started'}
                      </p>
                      {!search && !genderFilter && !statusFilter && (
                        <Button size="sm" className="mt-4" onClick={() => setShowAddForm(true)}>
                          Add First Student
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
              : students.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/students/${student.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold flex-shrink-0">
                        {student.first_name[0]}{student.last_name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{student.admission_no}</td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{student.gender}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_COLORS[student.status] as 'success' | 'danger' | 'warning' | 'primary'}>
                      {student.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push(`/students/${student.id}`); }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <p>
            Showing {((page - 1) * meta.per_page) + 1}–{Math.min(page * meta.per_page, meta.total)} of {meta.total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page === meta.total_pages} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add Student Slide-Over */}
      {showAddForm && (
        <AddStudentSlideOver
          onClose={() => setShowAddForm(false)}
          onSuccess={() => { setShowAddForm(false); void refetch(); }}
        />
      )}
    </div>
  );
}
