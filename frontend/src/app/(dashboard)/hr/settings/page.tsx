'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth.store';

interface Department { id: string; name: string; description: string | null; is_active: boolean; }
interface Designation { id: string; name: string; department_id: string | null; level: number | null; is_teaching_staff: boolean; is_active: boolean; }
interface LeaveType { id: string; name: string; code: string; max_days_per_year: number; is_paid: boolean; carry_forward: boolean; applicable_to: string; is_active: boolean; }

type Tab = 'Departments' | 'Designations' | 'Leave Types';
const TABS: Tab[] = ['Departments', 'Designations', 'Leave Types'];

export default function HRSettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('Departments');
  const canManage = user && ['super_admin', 'admin'].includes(user.role);

  const { data: deptResp, isLoading: deptLoading, refetch: refetchDepts } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: () => apiClient.get<Department[]>('/hr/departments'),
  });

  const { data: desResp, isLoading: desLoading, refetch: refetchDes } = useQuery({
    queryKey: ['hr-designations'],
    queryFn: () => apiClient.get<Designation[]>('/hr/designations'),
    enabled: activeTab === 'Designations',
  });

  const { data: ltResp, isLoading: ltLoading, refetch: refetchLt } = useQuery({
    queryKey: ['hr-leave-types'],
    queryFn: () => apiClient.get<LeaveType[]>('/hr/leave-types'),
    enabled: activeTab === 'Leave Types',
  });

  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');
  const [desName, setDesName] = useState('');
  const [ltName, setLtName] = useState('');
  const [ltCode, setLtCode] = useState('');
  const [ltDays, setLtDays] = useState('12');
  const [error, setError] = useState<string | null>(null);

  const createDeptMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => apiClient.post('/hr/departments', data),
    onSuccess: () => { setDeptName(''); setDeptDesc(''); setError(null); void refetchDepts(); },
    onError: (e: unknown) => setError((e as Error).message ?? 'Failed to create department'),
  });

  const deleteDeptMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/hr/departments/${id}`),
    onSuccess: () => void refetchDepts(),
  });

  const createDesMutation = useMutation({
    mutationFn: (data: { name: string }) => apiClient.post('/hr/designations', data),
    onSuccess: () => { setDesName(''); setError(null); void refetchDes(); },
    onError: (e: unknown) => setError((e as Error).message ?? 'Failed to create designation'),
  });

  const createLtMutation = useMutation({
    mutationFn: (data: { name: string; code: string; max_days_per_year: number }) => apiClient.post('/hr/leave-types', data),
    onSuccess: () => { setLtName(''); setLtCode(''); setLtDays('12'); setError(null); void refetchLt(); },
    onError: (e: unknown) => setError((e as Error).message ?? 'Failed to create leave type'),
  });

  const depts = deptResp?.data ?? [];
  const designations = desResp?.data ?? [];
  const leaveTypes = ltResp?.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">HR Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage departments, designations, and leave types</p>
      </div>

      <div className="flex gap-1 bg-white rounded-xl border border-slate-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setError(null); }}
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {activeTab === 'Departments' && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          {canManage && (
            <div className="p-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-3">ADD DEPARTMENT</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Department name"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                  className="max-w-xs"
                />
                <Input
                  placeholder="Description (optional)"
                  value={deptDesc}
                  onChange={(e) => setDeptDesc(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  onClick={() => createDeptMutation.mutate({ name: deptName, description: deptDesc || undefined })}
                  disabled={!deptName.trim() || createDeptMutation.isPending}
                >
                  Add
                </Button>
              </div>
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                {canManage && <th className="px-4 py-3 text-left font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {deptLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={canManage ? 4 : 3} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                ))
                : depts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                    <td className="px-4 py-3 text-slate-500">{d.description ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={d.is_active ? 'success' : 'default'}>{d.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => deleteDeptMutation.mutate(d.id)}
                        >
                          Deactivate
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Designations' && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          {canManage && (
            <div className="p-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-3">ADD DESIGNATION</p>
              <div className="flex gap-2">
                <Input
                  placeholder="Designation name"
                  value={desName}
                  onChange={(e) => setDesName(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  onClick={() => createDesMutation.mutate({ name: desName })}
                  disabled={!desName.trim() || createDesMutation.isPending}
                >
                  Add
                </Button>
              </div>
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Level</th>
                <th className="px-4 py-3 text-left font-medium">Teaching</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {desLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={4} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                ))
                : designations.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{d.name}</td>
                    <td className="px-4 py-3 text-slate-500">{d.level ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={d.is_teaching_staff ? 'primary' : 'default'}>
                        {d.is_teaching_staff ? 'Teaching' : 'Non-teaching'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={d.is_active ? 'success' : 'default'}>{d.is_active ? 'Active' : 'Inactive'}</Badge>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'Leave Types' && (
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          {canManage && (
            <div className="p-4 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-500 mb-3">ADD LEAVE TYPE</p>
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Name (e.g. Maternity Leave)"
                  value={ltName}
                  onChange={(e) => setLtName(e.target.value)}
                  className="max-w-xs"
                />
                <Input
                  placeholder="Code (e.g. ML)"
                  value={ltCode}
                  onChange={(e) => setLtCode(e.target.value.toUpperCase())}
                  className="w-28"
                />
                <Input
                  type="number"
                  placeholder="Days/yr"
                  value={ltDays}
                  onChange={(e) => setLtDays(e.target.value)}
                  className="w-24"
                />
                <Button
                  onClick={() => createLtMutation.mutate({ name: ltName, code: ltCode, max_days_per_year: Number(ltDays) })}
                  disabled={!ltName.trim() || !ltCode.trim() || createLtMutation.isPending}
                >
                  Add
                </Button>
              </div>
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Code</th>
                <th className="px-4 py-3 text-right font-medium">Days/yr</th>
                <th className="px-4 py-3 text-left font-medium">Paid</th>
                <th className="px-4 py-3 text-left font-medium">Carry Forward</th>
                <th className="px-4 py-3 text-left font-medium">Applicable</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ltLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td></tr>
                ))
                : leaveTypes.map((lt) => (
                  <tr key={lt.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{lt.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{lt.code}</td>
                    <td className="px-4 py-3 text-right">{lt.max_days_per_year}</td>
                    <td className="px-4 py-3"><Badge variant={lt.is_paid ? 'success' : 'default'}>{lt.is_paid ? 'Paid' : 'Unpaid'}</Badge></td>
                    <td className="px-4 py-3"><Badge variant={lt.carry_forward ? 'primary' : 'default'}>{lt.carry_forward ? 'Yes' : 'No'}</Badge></td>
                    <td className="px-4 py-3 capitalize text-slate-600">{lt.applicable_to.replace('_', ' ')}</td>
                    <td className="px-4 py-3"><Badge variant={lt.is_active ? 'success' : 'default'}>{lt.is_active ? 'Active' : 'Inactive'}</Badge></td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
