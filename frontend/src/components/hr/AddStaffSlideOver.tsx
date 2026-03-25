'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AddStaffSlideOverProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Department { id: string; name: string; }
interface Designation { id: string; name: string; }

export function AddStaffSlideOver({ onClose, onSuccess }: AddStaffSlideOverProps) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    employee_id: '',
    phone: '',
    join_date: new Date().toISOString().split('T')[0],
    employment_type: 'permanent' as string,
    gender: 'male' as string,
    department_id: '',
    designation_id: '',
    login_email: '',
  });
  const [error, setError] = useState<string | null>(null);

  const { data: deptResp } = useQuery({
    queryKey: ['hr-departments'],
    queryFn: () => apiClient.get<Department[]>('/hr/departments'),
  });

  const { data: desResp } = useQuery({
    queryKey: ['hr-designations'],
    queryFn: () => apiClient.get<Designation[]>('/hr/designations'),
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload: Record<string, unknown> = {
        first_name: data.first_name,
        last_name: data.last_name,
        employee_id: data.employee_id,
        phone: data.phone,
        join_date: data.join_date,
        employment_type: data.employment_type,
        gender: data.gender,
      };
      if (data.department_id) payload.department_id = data.department_id;
      if (data.designation_id) payload.designation_id = data.designation_id;
      if (data.login_email) payload.login_email = data.login_email;
      return apiClient.post('/hr/staff', payload);
    },
    onSuccess: () => {
      setError(null);
      onSuccess();
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: { message?: string } } } };
      setError(err.response?.data?.error?.message ?? 'Failed to add staff member.');
    },
  });

  function setField(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const departments = deptResp?.data ?? [];
  const designations = desResp?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">Add Staff Member</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">First Name *</label>
              <Input
                placeholder="Rajesh"
                value={form.first_name}
                onChange={(e) => setField('first_name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Last Name *</label>
              <Input
                placeholder="Sharma"
                value={form.last_name}
                onChange={(e) => setField('last_name', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Employee ID *</label>
            <Input
              placeholder="EMP-003"
              value={form.employee_id}
              onChange={(e) => setField('employee_id', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Phone *</label>
            <Input
              placeholder="9876543210"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Join Date *</label>
              <Input
                type="date"
                value={form.join_date}
                onChange={(e) => setField('join_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Gender *</label>
              <select
                value={form.gender}
                onChange={(e) => setField('gender', e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Employment Type *</label>
            <select
              value={form.employment_type}
              onChange={(e) => setField('employment_type', e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="permanent">Permanent</option>
              <option value="contractual">Contractual</option>
              <option value="part_time">Part-time</option>
              <option value="probation">Probation</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
              <select
                value={form.department_id}
                onChange={(e) => setField('department_id', e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Designation</label>
              <select
                value={form.designation_id}
                onChange={(e) => setField('designation_id', e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No designation</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">LOGIN ACCESS (optional)</p>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Work Email</label>
              <Input
                type="email"
                placeholder="rajesh@school.com (creates login account)"
                value={form.login_email}
                onChange={(e) => setField('login_email', e.target.value)}
              />
              <p className="text-[11px] text-slate-400 mt-1">
                A temporary password will be generated and shown in server logs.
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate(form)}
            disabled={
              !form.first_name.trim() || !form.last_name.trim() ||
              !form.employee_id.trim() || !form.phone.trim() ||
              !form.join_date || mutation.isPending
            }
          >
            {mutation.isPending ? 'Adding…' : 'Add Staff Member'}
          </Button>
        </div>
      </div>
    </div>
  );
}
