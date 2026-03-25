'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Star, Pencil, Trash2, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-24" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-28" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-28" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-12" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-20" /></td>
    </tr>
  );
}

export default function AcademicYearsPage() {
  const router = useRouter();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<AcademicYear | null>(null);
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<AcademicYear[]>('/academics/years');
      setYears(res.data ?? []);
    } catch {
      toast.error('Failed to load academic years');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditItem(null);
    setForm({ name: '', start_date: '', end_date: '' });
    setShowForm(true);
  }

  function openEdit(year: AcademicYear) {
    setEditItem(year);
    setForm({ name: year.name, start_date: year.start_date.slice(0, 10), end_date: year.end_date.slice(0, 10) });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name || !form.start_date || !form.end_date) {
      toast.error('All fields are required');
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        await apiClient.patch(`/academics/years/${editItem.id}`, form);
        toast.success('Academic year updated');
      } else {
        await apiClient.post('/academics/years', form);
        toast.success('Academic year created');
      }
      setShowForm(false);
      void load();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleSetCurrent(id: string) {
    try {
      await apiClient.post(`/academics/years/${id}/set-current`, {});
      toast.success('Current year updated');
      void load();
    } catch {
      toast.error('Failed to update current year');
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiClient.delete(`/academics/years/${id}`);
      toast.success('Academic year deleted');
      setDeleteId(null);
      void load();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Delete failed');
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/academics')} className="p-1 rounded hover:bg-slate-100 transition-colors">
          <ChevronLeft size={20} className="text-slate-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Academic Years</h1>
          <p className="text-slate-500 mt-0.5 text-sm">Manage school sessions</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Plus size={16} /> Add Year
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">{editItem ? 'Edit Academic Year' : 'New Academic Year'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name <span className="text-red-500">*</span></label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2025-26"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {saving ? 'Saving...' : editItem ? 'Update' : 'Create'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Start</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">End</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)
              : years.length === 0
              ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    <p className="font-medium">No academic years yet</p>
                    <p className="text-xs mt-1">Create your first academic year to get started</p>
                  </td>
                </tr>
              )
              : years.map((year) => (
                <tr key={year.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                    {year.is_current && <Star size={14} className="text-amber-500 fill-amber-500 flex-shrink-0" />}
                    {year.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{year.start_date.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-slate-600">{year.end_date.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    {year.is_current
                      ? <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">Current</span>
                      : <button onClick={() => void handleSetCurrent(year.id)} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-700 rounded-full transition-colors">Set current</button>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(year)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"><Pencil size={14} /></button>
                      {deleteId === year.id
                        ? (
                          <span className="flex items-center gap-1 text-xs">
                            <button onClick={() => void handleDelete(year.id)} className="px-2 py-0.5 bg-red-600 text-white rounded text-xs">Yes</button>
                            <button onClick={() => setDeleteId(null)} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">No</button>
                          </span>
                        )
                        : <button onClick={() => setDeleteId(year.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                      }
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
