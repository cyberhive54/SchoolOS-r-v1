'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface Section {
  id: string;
  name: string;
}

function SkeletonCard() {
  return <div className="animate-pulse bg-slate-100 rounded-lg h-16 w-full" />;
}

export default function SectionsPage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Section | null>(null);
  const [formName, setFormName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Section[]>('/academics/sections');
      setSections(res.data ?? []);
    } catch {
      toast.error('Failed to load sections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openCreate() { setEditItem(null); setFormName(''); setShowForm(true); }
  function openEdit(s: Section) { setEditItem(s); setFormName(s.name); setShowForm(true); }

  async function handleSave() {
    if (!formName.trim()) { toast.error('Section name is required'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await apiClient.patch(`/academics/sections/${editItem.id}`, { name: formName.trim() });
        toast.success('Section updated');
      } else {
        await apiClient.post('/academics/sections', { name: formName.trim() });
        toast.success('Section created');
      }
      setShowForm(false);
      void load();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await apiClient.delete(`/academics/sections/${id}`);
      toast.success('Section deleted');
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
          <h1 className="text-2xl font-bold text-slate-900">Sections</h1>
          <p className="text-slate-500 mt-0.5 text-sm">Section labels used across classes</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90" style={{ backgroundColor: 'var(--color-primary)' }}>
          <Plus size={16} /> Add Section
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-sm max-w-xs">
          <h3 className="font-semibold text-slate-900 mb-3">{editItem ? 'Edit Section' : 'New Section'}</h3>
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="A"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSave()}
            autoFocus
          />
          <div className="flex gap-2 mt-3">
            <button onClick={() => void handleSave()} disabled={saving} className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60" style={{ backgroundColor: 'var(--color-primary)' }}>
              {saving ? 'Saving...' : editItem ? 'Update' : 'Create'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          </div>
        </div>
      )}

      {loading
        ? <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">{Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        : sections.length === 0
        ? (
          <div className="bg-white rounded-xl border border-slate-100 py-12 text-center text-slate-400 shadow-sm">
            <p className="font-medium">No sections yet</p>
            <p className="text-xs mt-1">Add sections like A, B, C</p>
          </div>
        )
        : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {sections.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow group flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-lg font-bold text-slate-700">
                  {s.name}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(s)} className="p-1 rounded hover:bg-slate-100 text-slate-500"><Pencil size={13} /></button>
                  {deleteId === s.id
                    ? <span className="flex gap-1">
                        <button onClick={() => void handleDelete(s.id)} className="px-1.5 py-0.5 bg-red-600 text-white rounded text-xs">Yes</button>
                        <button onClick={() => setDeleteId(null)} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">No</button>
                      </span>
                    : <button onClick={() => setDeleteId(s.id)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
                  }
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
