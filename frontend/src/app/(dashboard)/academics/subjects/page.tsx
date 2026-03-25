'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ChevronLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
  code: string;
  type: 'core' | 'elective' | 'activity';
}

const TYPE_COLORS: Record<string, string> = {
  core: 'bg-blue-50 text-blue-700',
  elective: 'bg-violet-50 text-violet-700',
  activity: 'bg-amber-50 text-amber-700',
};

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-32" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-16" /></td>
      <td className="px-4 py-3"><div className="h-5 bg-slate-100 rounded-full w-16" /></td>
      <td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-16" /></td>
    </tr>
  );
}

export default function SubjectsPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: '', code: '', type: 'core' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const url = q ? `/academics/subjects?q=${encodeURIComponent(q)}` : '/academics/subjects';
      const res = await apiClient.get<Subject[]>(url);
      setSubjects(res.data ?? []);
    } catch {
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { void load(search || undefined); }, 300);
    return () => clearTimeout(t);
  }, [search, load]);

  function openCreate() { setEditItem(null); setForm({ name: '', code: '', type: 'core' }); setShowForm(true); }
  function openEdit(s: Subject) { setEditItem(s); setForm({ name: s.name, code: s.code, type: s.type }); setShowForm(true); }

  async function handleSave() {
    if (!form.name.trim() || !form.code.trim()) { toast.error('Name and code are required'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await apiClient.patch(`/academics/subjects/${editItem.id}`, form);
        toast.success('Subject updated');
      } else {
        await apiClient.post('/academics/subjects', form);
        toast.success('Subject created');
      }
      setShowForm(false);
      void load(search || undefined);
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiClient.delete(`/academics/subjects/${id}`);
      toast.success('Subject deleted');
      setDeleteId(null);
      void load(search || undefined);
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
          <h1 className="text-2xl font-bold text-slate-900">Subjects</h1>
          <p className="text-slate-500 mt-0.5 text-sm">Manage school subjects</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90" style={{ backgroundColor: 'var(--color-primary)' }}>
          <Plus size={16} /> Add Subject
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">{editItem ? 'Edit Subject' : 'New Subject'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Name <span className="text-red-500">*</span></label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mathematics" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Code <span className="text-red-500">*</span></label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="MATH" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="core">Core</option>
                <option value="elective">Elective</option>
                <option value="activity">Activity</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => void handleSave()} disabled={saving} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ backgroundColor: 'var(--color-primary)' }}>
              {saving ? 'Saving...' : editItem ? 'Update' : 'Create'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-50">
          <div className="relative max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : subjects.length === 0
              ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-400">
                    <p className="font-medium">{search ? 'No subjects match your search' : 'No subjects yet'}</p>
                    {!search && <p className="text-xs mt-1">Add subjects like Mathematics, English, Science</p>}
                  </td>
                </tr>
              )
              : subjects.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{s.code}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[s.type] ?? ''}`}>{s.type}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Pencil size={14} /></button>
                      {deleteId === s.id
                        ? <span className="flex gap-1 items-center text-xs">
                            <button onClick={() => void handleDelete(s.id)} className="px-2 py-0.5 bg-red-600 text-white rounded text-xs">Yes</button>
                            <button onClick={() => setDeleteId(null)} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">No</button>
                          </span>
                        : <button onClick={() => setDeleteId(s.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
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
