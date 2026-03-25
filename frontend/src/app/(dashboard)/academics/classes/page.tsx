'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ChevronLeft, GripVertical, Layout } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface ClassItem {
  id: string;
  name: string;
  order_index: number;
}

interface SectionItem {
  id: string;
  name: string;
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 animate-pulse">
      <div className="w-5 h-5 bg-slate-100 rounded" />
      <div className="flex-1 h-4 bg-slate-100 rounded w-32" />
      <div className="w-16 h-6 bg-slate-100 rounded" />
    </div>
  );
}

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [showClassForm, setShowClassForm] = useState(false);
  const [editClass, setEditClass] = useState<ClassItem | null>(null);
  const [classForm, setClassForm] = useState({ name: '', order_index: '' });
  const [savingClass, setSavingClass] = useState(false);
  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);

  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editSection, setEditSection] = useState<SectionItem | null>(null);
  const [sectionForm, setSectionForm] = useState({ name: '' });
  const [savingSection, setSavingSection] = useState(false);
  const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ClassItem[]>('/academics/classes');
      const list = res.data ?? [];
      setClasses(list);
      if (list.length > 0 && !selectedClass) {
        setSelectedClass(list[0]);
      }
    } catch {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  const loadSections = useCallback(async () => {
    setSectionsLoading(true);
    try {
      const res = await apiClient.get<SectionItem[]>('/academics/sections');
      setSections(res.data ?? []);
    } catch {
      toast.error('Failed to load sections');
    } finally {
      setSectionsLoading(false);
    }
  }, []);

  useEffect(() => { void loadClasses(); }, [loadClasses]);
  useEffect(() => { if (selectedClass) void loadSections(); }, [selectedClass, loadSections]);

  function openCreateClass() {
    setEditClass(null);
    setClassForm({ name: '', order_index: String(classes.length + 1) });
    setShowClassForm(true);
  }

  function openEditClass(c: ClassItem) {
    setEditClass(c);
    setClassForm({ name: c.name, order_index: String(c.order_index) });
    setShowClassForm(true);
  }

  async function handleSaveClass() {
    if (!classForm.name.trim()) { toast.error('Class name is required'); return; }
    setSavingClass(true);
    try {
      const payload = { name: classForm.name.trim(), order_index: Number(classForm.order_index) || 0 };
      if (editClass) {
        await apiClient.patch(`/academics/classes/${editClass.id}`, payload);
        toast.success('Class updated');
      } else {
        await apiClient.post('/academics/classes', payload);
        toast.success('Class created');
      }
      setShowClassForm(false);
      void loadClasses();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Save failed');
    } finally {
      setSavingClass(false);
    }
  }

  async function handleDeleteClass(id: string) {
    try {
      await apiClient.delete(`/academics/classes/${id}`);
      toast.success('Class deleted');
      setDeleteClassId(null);
      if (selectedClass?.id === id) setSelectedClass(null);
      void loadClasses();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Delete failed');
    }
  }

  async function handleReorder(classId: string, direction: 'up' | 'down') {
    const idx = classes.findIndex((c) => c.id === classId);
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === classes.length - 1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const target = classes[idx];
    const swap = classes[swapIdx];
    try {
      await Promise.all([
        apiClient.patch(`/academics/classes/${target.id}`, { order_index: swap.order_index }),
        apiClient.patch(`/academics/classes/${swap.id}`, { order_index: target.order_index }),
      ]);
      void loadClasses();
    } catch {
      toast.error('Failed to reorder');
    }
  }

  function openCreateSection() {
    setEditSection(null);
    setSectionForm({ name: '' });
    setShowSectionForm(true);
  }

  function openEditSection(s: SectionItem) {
    setEditSection(s);
    setSectionForm({ name: s.name });
    setShowSectionForm(true);
  }

  async function handleSaveSection() {
    if (!sectionForm.name.trim()) { toast.error('Section name is required'); return; }
    setSavingSection(true);
    try {
      if (editSection) {
        await apiClient.patch(`/academics/sections/${editSection.id}`, sectionForm);
        toast.success('Section updated');
      } else {
        await apiClient.post('/academics/sections', sectionForm);
        toast.success('Section created');
      }
      setShowSectionForm(false);
      void loadSections();
    } catch (e: unknown) {
      toast.error((e as Error).message ?? 'Save failed');
    } finally {
      setSavingSection(false);
    }
  }

  async function handleDeleteSection(id: string) {
    try {
      await apiClient.delete(`/academics/sections/${id}`);
      toast.success('Section deleted');
      setDeleteSectionId(null);
      void loadSections();
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
          <h1 className="text-2xl font-bold text-slate-900">Classes &amp; Sections</h1>
          <p className="text-slate-500 mt-0.5 text-sm">Select a class to view its sections</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-5">
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
              <span className="font-semibold text-slate-800 text-sm">Classes</span>
              <button
                onClick={openCreateClass}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-white font-medium hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Plus size={12} /> Add
              </button>
            </div>

            {showClassForm && (
              <div className="px-4 py-3 border-b border-slate-50 bg-slate-50">
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  placeholder="Grade 6"
                  value={classForm.name}
                  onChange={(e) => setClassForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && void handleSaveClass()}
                />
                <input
                  type="number"
                  min={0}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                  placeholder="Order index"
                  value={classForm.order_index}
                  onChange={(e) => setClassForm((f) => ({ ...f, order_index: e.target.value }))}
                />
                <div className="flex gap-2">
                  <button onClick={() => void handleSaveClass()} disabled={savingClass} className="flex-1 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-60" style={{ backgroundColor: 'var(--color-primary)' }}>
                    {savingClass ? 'Saving…' : editClass ? 'Update' : 'Create'}
                  </button>
                  <button onClick={() => setShowClassForm(false)} className="flex-1 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-200 bg-slate-100">Cancel</button>
                </div>
              </div>
            )}

            {loading
              ? <div className="divide-y divide-slate-50">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
              : classes.length === 0
              ? <div className="py-8 text-center text-slate-400 text-sm">No classes yet</div>
              : (
                <ul className="divide-y divide-slate-50">
                  {classes.map((c, idx) => (
                    <li
                      key={c.id}
                      onClick={() => setSelectedClass(c)}
                      className={`flex items-center gap-2 px-4 py-3 cursor-pointer transition-colors group ${selectedClass?.id === c.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    >
                      <GripVertical size={14} className="text-slate-200 cursor-grab" />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm truncate ${selectedClass?.id === c.id ? 'text-blue-700' : 'text-slate-900'}`}>{c.name}</p>
                        <p className="text-xs text-slate-400">#{c.order_index}</p>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); void handleReorder(c.id, 'up'); }} disabled={idx === 0} className="p-1 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-20 text-xs">▲</button>
                        <button onClick={(e) => { e.stopPropagation(); void handleReorder(c.id, 'down'); }} disabled={idx === classes.length - 1} className="p-1 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-20 text-xs">▼</button>
                        <button onClick={(e) => { e.stopPropagation(); openEditClass(c); }} className="p-1.5 rounded hover:bg-slate-200 text-slate-400"><Pencil size={12} /></button>
                        {deleteClassId === c.id
                          ? <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => void handleDeleteClass(c.id)} className="px-1.5 py-0.5 bg-red-600 text-white rounded text-xs">Del</button>
                              <button onClick={() => setDeleteClassId(null)} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">No</button>
                            </span>
                          : <button onClick={(e) => { e.stopPropagation(); setDeleteClassId(c.id); }} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 size={12} /></button>
                        }
                      </div>
                    </li>
                  ))}
                </ul>
              )
            }
          </div>
        </div>

        <div className="col-span-3">
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {!selectedClass ? (
              <div className="py-12 text-center text-slate-400">
                <Layout size={32} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm">Select a class to view sections</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                  <div>
                    <span className="font-semibold text-slate-800 text-sm">Sections</span>
                    <span className="ml-2 text-xs text-slate-400">in {selectedClass.name}</span>
                  </div>
                  <button
                    onClick={openCreateSection}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg text-white font-medium hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <Plus size={12} /> Add Section
                  </button>
                </div>

                {showSectionForm && (
                  <div className="px-4 py-3 border-b border-slate-50 bg-slate-50">
                    <input
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                      placeholder="A"
                      value={sectionForm.name}
                      onChange={(e) => setSectionForm({ name: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && void handleSaveSection()}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => void handleSaveSection()} disabled={savingSection} className="flex-1 py-1.5 rounded-lg text-white text-xs font-medium disabled:opacity-60" style={{ backgroundColor: 'var(--color-primary)' }}>
                        {savingSection ? 'Saving…' : editSection ? 'Update' : 'Create'}
                      </button>
                      <button onClick={() => setShowSectionForm(false)} className="flex-1 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-200 bg-slate-100">Cancel</button>
                    </div>
                  </div>
                )}

                {sectionsLoading
                  ? <div className="divide-y divide-slate-50">{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}</div>
                  : sections.length === 0
                  ? (
                    <div className="py-8 text-center text-slate-400">
                      <p className="text-sm">No sections yet</p>
                      <p className="text-xs mt-1">Add sections like A, B, C to this class</p>
                    </div>
                  )
                  : (
                    <ul className="divide-y divide-slate-50">
                      {sections.map((s) => (
                        <li key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group">
                          <span className="flex-1 font-medium text-slate-900 text-sm">{selectedClass.name} — {s.name}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditSection(s)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500"><Pencil size={13} /></button>
                            {deleteSectionId === s.id
                              ? <span className="flex items-center gap-1 text-xs">
                                  <button onClick={() => void handleDeleteSection(s.id)} className="px-2 py-0.5 bg-red-600 text-white rounded text-xs">Yes</button>
                                  <button onClick={() => setDeleteSectionId(null)} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">No</button>
                                </span>
                              : <button onClick={() => setDeleteSectionId(s.id)} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 size={13} /></button>
                            }
                          </div>
                        </li>
                      ))}
                    </ul>
                  )
                }
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
