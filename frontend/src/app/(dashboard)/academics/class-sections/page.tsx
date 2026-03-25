'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ChevronLeft, User, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface AcademicYear { id: string; name: string; is_current?: boolean; }
interface ClassItem { id: string; name: string; }
interface SectionItem { id: string; name: string; }
interface StaffMember { user_id: string; first_name: string; last_name: string; role: string; }

interface ClassSection {
  id: string;
  class_id: string;
  section_id: string;
  academic_year_id: string;
  capacity: number | null;
  room_no: string | null;
  class_name?: string;
  section_name?: string;
  academic_year_name?: string;
  class_teacher?: { user_id: string; name: string } | null;
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-20" /></td>
      ))}
    </tr>
  );
}

interface ClassTeacherCellProps {
  item: ClassSection;
  staff: StaffMember[];
  onAssign: (id: string, userId: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  saving: boolean;
}

function ClassTeacherCell({ item, staff, onAssign, onRemove, saving }: ClassTeacherCellProps) {
  const [open, setOpen] = useState(false);

  const assigned = item.class_teacher?.user_id
    ? staff.find((s) => s.user_id === item.class_teacher!.user_id)
    : null;

  if (saving) return <span className="text-xs text-slate-400 italic">Saving…</span>;

  if (assigned) {
    return (
      <div className="flex items-center gap-1.5 group/ct">
        <User size={12} className="text-blue-500 shrink-0" />
        <span className="text-xs font-medium text-slate-700">{assigned.first_name} {assigned.last_name}</span>
        <button
          onClick={() => void onRemove(item.id)}
          className="opacity-0 group-hover/ct:opacity-100 p-0.5 rounded hover:bg-red-50 text-slate-300 hover:text-red-500"
          title="Remove class teacher"
        >
          <X size={11} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs px-2 py-1 rounded border border-dashed border-slate-300 text-slate-400 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center gap-1"
        title="Assign class teacher"
      >
        <User size={11} /> Assign
      </button>
      {open && (
        <div
          className="absolute top-7 left-0 z-20 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[180px] max-h-48 overflow-y-auto py-1"
          onBlur={() => setOpen(false)}
        >
          {staff.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">No teachers available</p>
          ) : (
            staff.map((s) => (
              <button
                key={s.user_id}
                onClick={() => { setOpen(false); void onAssign(item.id, s.user_id); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-700 transition-colors"
              >
                {s.first_name} {s.last_name}
                <span className="ml-1 text-slate-400">({s.role})</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function ClassSectionsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ClassSection[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<ClassSection | null>(null);
  const [form, setForm] = useState({ class_id: '', section_id: '', academic_year_id: '', capacity: '', room_no: '' });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [savingTeacher, setSavingTeacher] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    const [yRes, cRes, sRes, staffRes] = await Promise.all([
      apiClient.get<AcademicYear[]>('/academics/years'),
      apiClient.get<ClassItem[]>('/academics/classes'),
      apiClient.get<SectionItem[]>('/academics/sections'),
      apiClient.get<StaffMember[]>('/users/school-members?role=teacher'),
    ]);
    const yearList = yRes.data ?? [];
    setYears(yearList);
    setClasses(cRes.data ?? []);
    setSections(sRes.data ?? []);
    setStaff(staffRes.data ?? []);
    const current = yearList.find((y) => y.is_current);
    if (current && !filterYear) setFilterYear(current.id);
  }, [filterYear]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterYear) params.set('academic_year_id', filterYear);
      if (filterClass) params.set('class_id', filterClass);
      const res = await apiClient.get<ClassSection[]>(`/academics/class-sections?${params.toString()}`);
      setItems(res.data ?? []);
    } catch {
      toast.error('Failed to load class-sections');
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterClass]);

  useEffect(() => { void loadMeta(); }, [loadMeta]);
  useEffect(() => { void load(); }, [load]);

  function openCreate() {
    setEditItem(null);
    const currentYear = years.find((y) => y.is_current);
    setForm({ class_id: '', section_id: '', academic_year_id: currentYear?.id ?? filterYear, capacity: '', room_no: '' });
    setShowForm(true);
  }

  function openEdit(item: ClassSection) {
    setEditItem(item);
    setForm({ class_id: item.class_id, section_id: item.section_id, academic_year_id: item.academic_year_id, capacity: item.capacity != null ? String(item.capacity) : '', room_no: item.room_no ?? '' });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.class_id || !form.section_id || !form.academic_year_id) { toast.error('Class, section, and year are required'); return; }
    setSaving(true);
    try {
      const payload = {
        class_id: form.class_id,
        section_id: form.section_id,
        academic_year_id: form.academic_year_id,
        ...(form.capacity ? { capacity: Number(form.capacity) } : {}),
        ...(form.room_no ? { room_no: form.room_no } : {}),
      };
      if (editItem) {
        await apiClient.patch(`/academics/class-sections/${editItem.id}`, { capacity: payload.capacity, room_no: payload.room_no });
        toast.success('Class-section updated');
      } else {
        await apiClient.post('/academics/class-sections', payload);
        toast.success('Class-section created');
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
      await apiClient.delete(`/academics/class-sections/${id}`);
      toast.success('Class-section deleted');
      setDeleteId(null);
      void load();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Delete failed');
    }
  }

  async function handleAssignClassTeacher(id: string, userId: string) {
    setSavingTeacher(id);
    try {
      await apiClient.post(`/academics/class-sections/${id}/class-teacher`, { user_id: userId });
      toast.success('Class teacher assigned');
      void load();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Failed to assign class teacher');
    } finally {
      setSavingTeacher(null);
    }
  }

  async function handleRemoveClassTeacher(id: string) {
    setSavingTeacher(id);
    try {
      await apiClient.delete(`/academics/class-sections/${id}/class-teacher`);
      toast.success('Class teacher removed');
      void load();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Failed to remove class teacher');
    } finally {
      setSavingTeacher(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/academics')} className="p-1 rounded hover:bg-slate-100 transition-colors">
          <ChevronLeft size={20} className="text-slate-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">Class-Sections</h1>
          <p className="text-slate-500 mt-0.5 text-sm">Assign classes to sections per academic year</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90" style={{ backgroundColor: 'var(--color-primary)' }}>
          <Plus size={16} /> Add
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
          <option value="">All Years</option>
          {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
        </select>
        <select className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4">{editItem ? 'Edit Class-Section' : 'New Class-Section'}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {!editItem && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Year <span className="text-red-500">*</span></label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.academic_year_id} onChange={(e) => setForm((f) => ({ ...f, academic_year_id: e.target.value }))}>
                    <option value="">Select year</option>
                    {years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Class <span className="text-red-500">*</span></label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.class_id} onChange={(e) => setForm((f) => ({ ...f, class_id: e.target.value }))}>
                    <option value="">Select class</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Section <span className="text-red-500">*</span></label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={form.section_id} onChange={(e) => setForm((f) => ({ ...f, section_id: e.target.value }))}>
                    <option value="">Select section</option>
                    {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Capacity</label>
              <input type="number" min={1} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="40" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Room No.</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" placeholder="Room 101" value={form.room_no} onChange={(e) => setForm((f) => ({ ...f, room_no: e.target.value }))} />
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
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Year', 'Class', 'Section', 'Class Teacher', 'Capacity', 'Room', 'Actions'].map((h) => (
                <th key={h} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
              : items.length === 0
              ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  <p className="font-medium">No class-sections yet</p>
                  <p className="text-xs mt-1">Create class-sections to assign subjects and teachers</p>
                </td></tr>
              )
              : items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-4 py-3 text-slate-600">{item.academic_year_name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{item.class_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{item.section_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <ClassTeacherCell
                      item={item}
                      staff={staff}
                      onAssign={handleAssignClassTeacher}
                      onRemove={handleRemoveClassTeacher}
                      saving={savingTeacher === item.id}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.capacity ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{item.room_no ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Pencil size={14} /></button>
                      {deleteId === item.id
                        ? <span className="flex gap-1 items-center text-xs">
                            <button onClick={() => void handleDelete(item.id)} className="px-2 py-0.5 bg-red-600 text-white rounded text-xs">Yes</button>
                            <button onClick={() => setDeleteId(null)} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">No</button>
                          </span>
                        : <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 size={14} /></button>
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
