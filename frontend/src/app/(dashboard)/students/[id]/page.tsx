'use client';

import { useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

interface Student {
  id: string;
  admission_no: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  blood_group: string | null;
  religion: string | null;
  caste: string | null;
  nationality: string | null;
  aadhaar_no: string | null;
  status: string;
  profile_photo_url: string | null;
  guardian_count: number;
}

interface Guardian {
  id: string;
  relation: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  occupation: string | null;
  is_primary: boolean;
  emergency_contact: boolean;
}

interface Enrollment {
  id: string;
  class_section_id: string;
  academic_year_id: string;
  roll_number: string | null;
  status: string;
  enrolled_at: string;
}

type Tab = 'profile' | 'guardian' | 'history' | 'documents';

const STATUS_COLOR: Record<string, string> = {
  active: 'success',
  inactive: 'danger',
  transferred_out: 'warning',
  alumni: 'primary',
};

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('profile');

  const { data: student, isLoading } = useQuery<{ data: Student }>({
    queryKey: ['student', id],
    queryFn: () => apiClient.get(`/students/${id}`),
  });

  const { data: guardiansResp, isLoading: guardiansLoading } = useQuery<{ data: Guardian[] }>({
    queryKey: ['student-guardians', id],
    queryFn: () => apiClient.get(`/students/${id}/guardians`),
    enabled: tab === 'guardian',
  });

  const { data: enrollmentsResp, isLoading: enrollmentsLoading } = useQuery<{ data: Enrollment[] }>({
    queryKey: ['student-enrollments', id],
    queryFn: () => apiClient.get(`/students/${id}/enrollments`),
    enabled: tab === 'history',
  });

  const s = student?.data;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500 flex items-center gap-1">
        <button onClick={() => router.push('/students')} className="hover:text-slate-800">
          Students
        </button>
        <span>/</span>
        {isLoading
          ? <Skeleton className="h-4 w-32" />
          : <span className="text-slate-900">{s?.first_name} {s?.last_name}</span>
        }
      </nav>

      {/* Student Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        {isLoading ? (
          <div className="flex gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ) : s ? (
          <div className="flex items-start justify-between">
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xl font-bold flex-shrink-0">
                {s.first_name[0]}{s.last_name[0]}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">
                  {s.first_name} {s.middle_name ? s.middle_name + ' ' : ''}{s.last_name}
                </h1>
                <p className="text-slate-500 text-sm mt-0.5">Admission No: <span className="font-mono font-medium">{s.admission_no}</span></p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={STATUS_COLOR[s.status] as 'success' | 'danger' | 'warning' | 'primary'}>
                    {s.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-slate-400 capitalize">{s.gender}</span>
                  {s.blood_group && <span className="text-xs text-slate-400">{s.blood_group}</span>}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm">Edit</Button>
          </div>
        ) : (
          <p className="text-slate-500">Student not found</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['profile', 'guardian', 'history', 'documents'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t === 'guardian' ? 'Guardians' : t === 'history' ? 'Academic History' : t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'guardian' && s && (
              <span className="ml-1.5 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                {s.guardian_count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'profile' && (
        <Card className="p-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-24 mb-1" />
                  <Skeleton className="h-5 w-36" />
                </div>
              ))}
            </div>
          ) : s ? (
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {[
                ['Date of Birth', s.date_of_birth],
                ['Gender', s.gender],
                ['Blood Group', s.blood_group || '—'],
                ['Religion', s.religion || '—'],
                ['Caste', s.caste || '—'],
                ['Nationality', s.nationality || '—'],
                ['Aadhaar No', s.aadhaar_no || '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm font-medium text-slate-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      )}

      {tab === 'guardian' && (
        <div className="space-y-3">
          {guardiansLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-3 w-32 mb-1" />
                  <Skeleton className="h-3 w-28" />
                </Card>
              ))}
            </div>
          ) : guardiansResp?.data.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <div className="text-3xl mb-2">👨‍👩‍👧</div>
              <p className="font-medium">No guardians added yet</p>
              <p className="text-sm mt-1">Add a guardian to link them to this student</p>
              <Button size="sm" className="mt-4">Add Guardian</Button>
            </Card>
          ) : (
            guardiansResp?.data.map((g) => (
              <Card key={g.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{g.first_name} {g.last_name}</p>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full capitalize">{g.relation}</span>
                      {g.is_primary && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Primary</span>}
                      {g.emergency_contact && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Emergency</span>}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">📞 {g.phone}</p>
                    {g.email && <p className="text-sm text-slate-500">✉ {g.email}</p>}
                    {g.occupation && <p className="text-sm text-slate-400">{g.occupation}</p>}
                  </div>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'history' && (
        <Card className="p-6">
          {enrollmentsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 border border-slate-100 rounded-lg">
                  <Skeleton className="w-3 h-3 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : enrollmentsResp?.data.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No enrollment history found</p>
          ) : (
            <div className="space-y-3">
              {enrollmentsResp?.data.map((e) => (
                <div key={e.id} className="flex items-center gap-4 p-3 border border-slate-100 rounded-lg">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${e.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-800">
                      Class Section: <span className="font-mono text-xs text-slate-500">{e.class_section_id}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Enrolled: {new Date(e.enrolled_at).toLocaleDateString('en-IN')}
                      {e.roll_number && ` · Roll No: ${e.roll_number}`}
                    </p>
                  </div>
                  <Badge variant={e.status === 'active' ? 'success' : 'default'}>{e.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'documents' && (
        <Card className="p-8 text-center text-slate-400">
          <div className="text-4xl mb-3">📁</div>
          <p className="font-medium text-slate-600">Documents</p>
          <span className="inline-block mt-2 text-xs bg-slate-100 text-slate-400 px-2 py-1 rounded-full">
            Coming soon
          </span>
        </Card>
      )}
    </div>
  );
}
