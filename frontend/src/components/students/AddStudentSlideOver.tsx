'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AddStudentSlideOverProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface Category { id: string; name: string; code: string; }
interface AcademicYear { id: string; name: string; is_current: boolean; }

export function AddStudentSlideOver({ onClose, onSuccess }: AddStudentSlideOverProps) {
  const [form, setForm] = useState({
    admission_no: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'male' as 'male' | 'female' | 'other',
    blood_group: '',
    religion: '',
    nationality: 'Indian',
    category_id: '',
  });
  const [error, setError] = useState<string | null>(null);

  const { data: categoriesResp } = useQuery<{ data: Category[] }>({
    queryKey: ['student-categories'],
    queryFn: () => apiClient.get('/students/categories'),
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload: Record<string, unknown> = {
        admission_no: data.admission_no,
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
      };
      if (data.middle_name) payload.middle_name = data.middle_name;
      if (data.blood_group) payload.blood_group = data.blood_group;
      if (data.religion) payload.religion = data.religion;
      if (data.nationality) payload.nationality = data.nationality;
      if (data.category_id) payload.category_id = data.category_id;
      return apiClient.post('/students', payload);
    },
    onSuccess: () => onSuccess(),
    onError: (err: unknown) => {
      setError((err as Error).message ?? 'Failed to create student');
    },
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.admission_no || !form.first_name || !form.last_name || !form.date_of_birth) {
      setError('Please fill in all required fields');
      return;
    }
    mutation.mutate(form);
  };

  const categories = categoriesResp?.data ?? [];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Add Student</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-slate-500 font-medium">Admission No *</label>
              <Input
                value={form.admission_no}
                onChange={(e) => set('admission_no', e.target.value)}
                placeholder="e.g. ADM-2025-001"
                required
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 font-medium">First Name *</label>
              <Input
                value={form.first_name}
                onChange={(e) => set('first_name', e.target.value)}
                placeholder="First name"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Last Name *</label>
              <Input
                value={form.last_name}
                onChange={(e) => set('last_name', e.target.value)}
                placeholder="Last name"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs text-slate-500 font-medium">Middle Name</label>
              <Input
                value={form.middle_name}
                onChange={(e) => set('middle_name', e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="text-xs text-slate-500 font-medium">Date of Birth *</label>
              <Input
                type="date"
                value={form.date_of_birth}
                onChange={(e) => set('date_of_birth', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Gender *</label>
              <select
                value={form.gender}
                onChange={(e) => set('gender', e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                required
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500 font-medium">Blood Group</label>
              <select
                value={form.blood_group}
                onChange={(e) => set('blood_group', e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
              >
                <option value="">Select...</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Category</label>
              <select
                value={form.category_id}
                onChange={(e) => set('category_id', e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500 font-medium">Religion</label>
              <Input
                value={form.religion}
                onChange={(e) => set('religion', e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium">Nationality</label>
              <Input
                value={form.nationality}
                onChange={(e) => set('nationality', e.target.value)}
                placeholder="Indian"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} type="button">Cancel</Button>
          <Button
            className="flex-1"
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Saving...' : 'Add Student'}
          </Button>
        </div>
      </div>
    </>
  );
}
