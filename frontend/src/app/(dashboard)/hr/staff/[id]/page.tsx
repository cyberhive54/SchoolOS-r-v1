'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth.store';

interface Staff {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  alternate_phone: string | null;
  personal_email: string | null;
  gender: string;
  date_of_birth: string | null;
  blood_group: string | null;
  status: string;
  employment_type: string;
  join_date: string;
  salary_grade: string | null;
  department?: { id: string; name: string } | null;
  designation?: { id: string; name: string } | null;
}

interface Profile {
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  qualification: string | null;
  experience_years: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'success',
  inactive: 'warning',
  resigned: 'danger',
  terminated: 'danger',
};

const TABS = ['Overview', 'Profile', 'Leave', 'Attendance'] as const;
type Tab = typeof TABS[number];

export default function StaffDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const canManage = user && ['super_admin', 'admin'].includes(user.role);

  const { data: staffData, isLoading } = useQuery<ApiResponse<Staff>>({
    queryKey: ['hr-staff-detail', id],
    queryFn: () => apiClient.get<Staff>(`/hr/staff/${id}`),
  });

  const { data: profileData } = useQuery<ApiResponse<Profile | null>>({
    queryKey: ['hr-staff-profile', id],
    queryFn: () => apiClient.get<Profile | null>(`/hr/staff/${id}/profile`),
    enabled: activeTab === 'Profile',
  });

  const { data: leaveData } = useQuery<ApiResponse<unknown[]>>({
    queryKey: ['hr-leave-allocs', id],
    queryFn: () => apiClient.get<unknown[]>(`/hr/staff/${id}/leave-allocations`),
    enabled: activeTab === 'Leave',
  });

  const staff = staffData?.data;
  const profile = profileData?.data;
  const allocs = leaveData?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="text-center py-12 text-slate-400">
        Staff member not found.
        <div className="mt-4">
          <Button variant="ghost" onClick={() => router.push('/hr/staff')}>← Back to Directory</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push('/hr/staff')}>← Back</Button>
        <div className="flex-1" />
      </div>

      <div className="bg-white rounded-xl border border-slate-100 p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-xl flex-shrink-0">
            {staff.first_name[0]}{staff.last_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-900">{staff.first_name} {staff.last_name}</h1>
              <Badge variant={STATUS_COLORS[staff.status] as 'success' | 'warning' | 'danger'}>
                {staff.status.charAt(0).toUpperCase() + staff.status.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {staff.designation?.name ?? 'No designation'} · {staff.department?.name ?? 'No department'}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-1">{staff.employee_id}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Personal Information</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-slate-400">Phone</dt>
              <dd className="text-slate-900 mt-0.5">{staff.phone}</dd>
            </div>
            {staff.alternate_phone && (
              <div>
                <dt className="text-slate-400">Alternate Phone</dt>
                <dd className="text-slate-900 mt-0.5">{staff.alternate_phone}</dd>
              </div>
            )}
            {staff.personal_email && (
              <div>
                <dt className="text-slate-400">Personal Email</dt>
                <dd className="text-slate-900 mt-0.5">{staff.personal_email}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-400">Gender</dt>
              <dd className="text-slate-900 mt-0.5 capitalize">{staff.gender}</dd>
            </div>
            {staff.date_of_birth && (
              <div>
                <dt className="text-slate-400">Date of Birth</dt>
                <dd className="text-slate-900 mt-0.5">
                  {new Date(staff.date_of_birth).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                </dd>
              </div>
            )}
            {staff.blood_group && (
              <div>
                <dt className="text-slate-400">Blood Group</dt>
                <dd className="text-slate-900 mt-0.5">{staff.blood_group}</dd>
              </div>
            )}
            <div>
              <dt className="text-slate-400">Join Date</dt>
              <dd className="text-slate-900 mt-0.5">
                {new Date(staff.join_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400">Employment Type</dt>
              <dd className="text-slate-900 mt-0.5 capitalize">{staff.employment_type.replace('_', ' ')}</dd>
            </div>
            {staff.salary_grade && (
              <div>
                <dt className="text-slate-400">Salary Grade</dt>
                <dd className="text-slate-900 mt-0.5">{staff.salary_grade}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {activeTab === 'Profile' && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Profile Details</h2>
          {!profile ? (
            <p className="text-sm text-slate-400">No profile information on file.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {profile.qualification && (
                <div>
                  <dt className="text-slate-400">Qualification</dt>
                  <dd className="text-slate-900 mt-0.5">{profile.qualification}</dd>
                </div>
              )}
              {profile.experience_years != null && (
                <div>
                  <dt className="text-slate-400">Experience</dt>
                  <dd className="text-slate-900 mt-0.5">{profile.experience_years} year{profile.experience_years !== 1 ? 's' : ''}</dd>
                </div>
              )}
              {profile.emergency_contact_name && (
                <div>
                  <dt className="text-slate-400">Emergency Contact</dt>
                  <dd className="text-slate-900 mt-0.5">{profile.emergency_contact_name} ({profile.emergency_contact_phone ?? 'no phone'})</dd>
                </div>
              )}
              {(profile.city || profile.state) && (
                <div>
                  <dt className="text-slate-400">Location</dt>
                  <dd className="text-slate-900 mt-0.5">{[profile.city, profile.state, profile.pincode].filter(Boolean).join(', ')}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}

      {activeTab === 'Leave' && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">Leave Allocations</h2>
          </div>
          {allocs.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-400 text-sm">No leave allocations found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Leave Type</th>
                  <th className="px-4 py-3 text-right font-medium">Allocated</th>
                  <th className="px-4 py-3 text-right font-medium">Used</th>
                  <th className="px-4 py-3 text-right font-medium">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(allocs as Array<Record<string, unknown>>).map((a) => (
                  <tr key={a.id as string}>
                    <td className="px-4 py-3 text-slate-900">{a.leave_type_id as string}</td>
                    <td className="px-4 py-3 text-right">{a.allocated_days as number}</td>
                    <td className="px-4 py-3 text-right">{a.used_days as number}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${(a.remaining_days as number) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {a.remaining_days as number}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'Attendance' && (
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <p className="text-sm text-slate-400 text-center py-8">
            View full attendance history from the Attendance page.
          </p>
          <div className="text-center">
            <Button variant="ghost" size="sm" onClick={() => router.push('/hr/attendance')}>
              Go to Attendance →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
